import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { ProyekData } from '../src/core/types'
import { getPresetStrukturWaktu } from '../src/core/default-presets'

function generateExtremeProject(polaHari: 5 | 6, jumlahKelas: number): ProyekData {
  const jenjang = polaHari === 5 ? 'SMP' : 'SMA'
  const kelasList = []
  for (let i = 1; i <= jumlahKelas; i++) {
    kelasList.push({
      id: `kelas:${i}`,
      nama: `Rombel-${i}`,
      urutan: i,
      tingkat: 7 + (i % 3)
    })
  }

  const guruList = []
  for (let g = 1; g <= 15; g++) {
    guruList.push({
      id: `guru:${g}`,
      nama: `Guru Pengampu ${g}, M.Pd.`,
      nip: `19800101201001100${g}`,
      tidak_bisa: {}
    })
  }

  const penugasanList = []
  for (let p = 1; p <= 20; p++) {
    const beban: Record<string, number> = {}
    kelasList.forEach((k) => {
      beban[k.id] = (p % 4) + 1
    })

    penugasanList.push({
      id: `penugasan:${p}`,
      guru_id: `guru:${(p % 15) + 1}`,
      kode: `${p}`,
      mapel: `Mata Pelajaran ${p}`,
      kategori: 'Wajib',
      beban
    })
  }

  const jadwal: ProyekData['jadwal'] = {}
  const strukturWaktu = getPresetStrukturWaktu(jenjang, polaHari)

  // Isi beberapa sel jadwal
  for (const hari in strukturWaktu.hari) {
    jadwal[hari] = {}
    for (const slot of strukturWaktu.hari[hari].slots) {
      if (slot.tipe === 'kbm') {
        jadwal[hari][slot.id] = {}
        for (const k of kelasList) {
          jadwal[hari][slot.id][k.id] = [['1'], ['1']]
        }
      }
    }
  }

  return {
    format_version: 2,
    app_version: '2.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    meta: {
      nama_sekolah: `Sekolah Ekstrem ${jumlahKelas} Kelas`,
      jenjang,
      semester: 'GANJIL',
      tahun_pelajaran: '2026/2027',
      kota_tanggal: 'Jakarta, 13 Juli 2026',
      pejabat_ttd: {
        jabatan: 'Kepala Sekolah',
        nama: 'Dr. H. Penguji, M.Pd.',
        nip: '197001011995011001'
      }
    },
    struktur_waktu: strukturWaktu,
    master: {
      kelas: kelasList,
      guru: guruList,
      penugasan: penugasanList
    },
    jadwal
  }
}

import { buildExcelWorkbook } from '../src/main/excel-exporter'

describe('Ekspor Excel Kasus Ekstrem (Fase 7 Acceptance)', () => {
  it('berhasil men-generate dokumen Excel untuk kasus kecil: 3 kelas / 5 hari', async () => {
    const data = generateExtremeProject(5, 3)
    const workbook = await buildExcelWorkbook(data)

    expect(workbook.worksheets.length).toBe(2)
    const wsBeban = workbook.getWorksheet('Beban Mengajar')
    const wsJadwal = workbook.getWorksheet('Jadwal Pelajaran')

    expect(wsBeban).toBeDefined()
    expect(wsJadwal).toBeDefined()

    // Verifikasi kolom dan baris
    expect(wsBeban?.rowCount).toBeGreaterThan(20)
    expect(wsJadwal?.rowCount).toBeGreaterThanOrEqual(30)

    // Tulis ke buffer untuk memastikan serialisasi biner xlsx valid
    const buffer = await workbook.xlsx.writeBuffer()
    expect(buffer.byteLength).toBeGreaterThan(5000)
  })

  it('berhasil men-generate dokumen Excel untuk kasus ekstrem besar: 36 kelas / 6 hari tanpa error', async () => {
    const data = generateExtremeProject(6, 36)
    const workbook = await buildExcelWorkbook(data)

    expect(workbook.worksheets.length).toBe(2)
    const wsJadwal = workbook.getWorksheet('Jadwal Pelajaran')

    // 3 kolom tetap (Hari, Jam, Waktu) + 36 kelas = 39 kolom
    const headerRow = wsJadwal?.getRow(4)
    expect(headerRow?.cellCount).toBe(39)

    // Tulis ke buffer
    const buffer = await workbook.xlsx.writeBuffer()
    expect(buffer.byteLength).toBeGreaterThan(10000)
  })

  it('mengekspor sel split-JP dengan benar (jp1|jp2) tanpa kehilangan JP kedua', async () => {
    const data = generateExtremeProject(5, 3)
    // Pasang split JP di kelas pertama pada Senin slot KBM pertama
    const firstHari = Object.keys(data.struktur_waktu.hari)[0]
    const kbmSlot = data.struktur_waktu.hari[firstHari].slots.find((s) => s.tipe === 'kbm')!
    const firstSlot = kbmSlot.id
    const firstKelas = data.master.kelas[0].id

    data.jadwal[firstHari][firstSlot][firstKelas] = [['1'], ['2']]

    const workbook = await buildExcelWorkbook(data)
    const wsJadwal = workbook.getWorksheet('Jadwal Pelajaran')
    expect(wsJadwal).toBeDefined()

    // Cari baris slot KBM tersebut di worksheet
    let foundCellText: any = null
    wsJadwal?.eachRow((row) => {
      if (row.getCell(1).value === firstHari && row.getCell(2).value === kbmSlot.jp.join('-')) {
        foundCellText = row.getCell(4).value
      }
    })

    // Harus berformat '1|2', bukan cuma '1'
    expect(foundCellText).toBe('1|2')
  })
})
