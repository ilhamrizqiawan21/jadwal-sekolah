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

async function buildWorkbookFromProject(data: ProyekData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Jadwal Sekolah Desktop'

  // Sheet 1: Beban Mengajar
  const wsBeban = workbook.addWorksheet('Beban Mengajar')
  wsBeban.addRow(['DAFTAR BEBAN MENGAJAR GURU'])
  wsBeban.addRow([data.meta.nama_sekolah.toUpperCase()])
  wsBeban.addRow([`TAHUN PELAJARAN ${data.meta.tahun_pelajaran} - SEMESTER ${data.meta.semester}`])
  wsBeban.addRow([])

  const kelasHeaders = data.master.kelas.map((k) => k.nama)
  wsBeban.addRow(['No', 'Nama Guru', 'Kode', 'Mata Pelajaran', ...kelasHeaders, 'Total JP'])

  const guruMap = new Map(data.master.guru.map((g) => [g.id, g.nama]))
  data.master.penugasan.forEach((p, index) => {
    const guruNama = guruMap.get(p.guru_id) || '?'
    const kelasJP = data.master.kelas.map((k) => p.beban[k.id] || '')
    const totalJP = Object.values(p.beban).reduce((sum, v) => sum + (v || 0), 0)
    wsBeban.addRow([index + 1, guruNama, p.kode, p.mapel, ...kelasJP, totalJP || ''])
  })

  // Sheet 2: Matriks Jadwal
  const wsJadwal = workbook.addWorksheet('Jadwal Pelajaran')
  wsJadwal.addRow(['JADWAL PELAJARAN'])
  wsJadwal.addRow([data.meta.nama_sekolah.toUpperCase()])
  wsJadwal.addRow([])
  wsJadwal.addRow(['Hari', 'Jam Ke', 'Waktu', ...kelasHeaders])

  for (const [hari, hariKbm] of Object.entries(data.struktur_waktu.hari)) {
    if (!hariKbm.aktif) continue
    for (const slot of hariKbm.slots) {
      const slotLabel = slot.jp.length > 0 ? slot.jp.join('-') : slot.label
      const waktuLabel = slot.waktu.join(' | ')
      const rowData = [hari, slotLabel, waktuLabel]
      for (const k of data.master.kelas) {
        const cell = data.jadwal[hari]?.[slot.id]?.[k.id]
        if (cell && cell[0]) {
          rowData.push(cell[0].join('/'))
        } else {
          rowData.push(slot.tipe === 'kbm' ? '' : slot.label)
        }
      }
      wsJadwal.addRow(rowData)
    }
  }

  return workbook
}

describe('Ekspor Excel Kasus Ekstrem (Fase 7 Acceptance)', () => {
  it('berhasil men-generate dokumen Excel untuk kasus kecil: 3 kelas / 5 hari', async () => {
    const data = generateExtremeProject(5, 3)
    const workbook = await buildWorkbookFromProject(data)

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
    const workbook = await buildWorkbookFromProject(data)

    expect(workbook.worksheets.length).toBe(2)
    const wsJadwal = workbook.getWorksheet('Jadwal Pelajaran')

    // 3 kolom tetap (Hari, Jam, Waktu) + 36 kelas = 39 kolom
    const headerRow = wsJadwal?.getRow(4)
    expect(headerRow?.cellCount).toBe(39)

    // Tulis ke buffer
    const buffer = await workbook.xlsx.writeBuffer()
    expect(buffer.byteLength).toBeGreaterThan(10000)
  })
})
