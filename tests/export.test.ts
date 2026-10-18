import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { ProyekData } from '../src/core/types'
import { getPresetStrukturWaktu } from '../src/core/default-presets'
import { buildExcelWorkbook } from '../src/main/excel-exporter'
import { generateSchedulePrintHtml } from '../src/main/pdf-template'

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
      alamat_sekolah: 'Jl. Pendidikan No. 45, Kota Teladan - Telp. (021) 987654',
      notaris: 'YAYASAN PENDIDIKAN NUSANTARA - SK KEMENKUMHAM NO. AHU-12345',
      logo_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      ttd_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
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

describe('Ekspor Excel Kasus Ekstrem & Kop Surat (Fase 7 Enhancement)', () => {
  it('berhasil men-generate dokumen Excel untuk kasus kecil: 3 kelas / 5 hari lengkap dengan kop dan ttd', async () => {
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

    // Verifikasi keberadaan kop surat di sheet Beban Mengajar
    let foundSekolahBeban = false
    let foundNotarisBeban = false
    let foundAlamatBeban = false
    let foundTtdBeban = false

    wsBeban?.eachRow((row) => {
      row.eachCell((cell) => {
        const val = String(cell.value || '')
        if (val.includes(data.meta.nama_sekolah.toUpperCase())) foundSekolahBeban = true
        if (val.includes('YAYASAN PENDIDIKAN NUSANTARA')) foundNotarisBeban = true
        if (val.includes('Jl. Pendidikan No. 45')) foundAlamatBeban = true
        if (val.includes('Dr. H. Penguji, M.Pd.')) foundTtdBeban = true
      })
    })

    expect(foundSekolahBeban).toBe(true)
    expect(foundNotarisBeban).toBe(true)
    expect(foundAlamatBeban).toBe(true)
    expect(foundTtdBeban).toBe(true)

    // Tulis ke buffer untuk memastikan serialisasi biner xlsx valid
    const buffer = await workbook.xlsx.writeBuffer()
    expect(buffer.byteLength).toBeGreaterThan(5000)
  })

  it('berhasil men-generate dokumen Excel untuk kasus ekstrem besar: 36 kelas / 6 hari tanpa error', async () => {
    const data = generateExtremeProject(6, 36)
    const workbook = await buildExcelWorkbook(data)

    expect(workbook.worksheets.length).toBe(2)
    const wsJadwal = workbook.getWorksheet('Jadwal Pelajaran')
    expect(wsJadwal).toBeDefined()

    // Cari baris header tabel jadwal
    let headerRow: ExcelJS.Row | undefined
    wsJadwal?.eachRow((row) => {
      if (row.getCell(1).value === 'Hari' && row.getCell(2).value === 'Jam Ke') {
        headerRow = row
      }
    })

    expect(headerRow).toBeDefined()
    // 3 kolom tetap (Hari, Jam, Waktu) + 36 kelas = 39 kolom
    expect(headerRow?.cellCount).toBe(39)

    // Tulis ke buffer
    const buffer = await workbook.xlsx.writeBuffer()
    expect(buffer.byteLength).toBeGreaterThan(10000)
  })

  it('mengekspor sel split-JP dengan benar (jp1|jp2) tanpa kehilangan JP kedua', async () => {
    const data = generateExtremeProject(5, 3)
    const firstHari = Object.keys(data.struktur_waktu.hari)[0]
    const kbmSlot = data.struktur_waktu.hari[firstHari].slots.find((s) => s.tipe === 'kbm')!
    const firstSlot = kbmSlot.id
    const firstKelas = data.master.kelas[0].id

    data.jadwal[firstHari][firstSlot][firstKelas] = [['1'], ['2']]

    const workbook = await buildExcelWorkbook(data)
    const wsJadwal = workbook.getWorksheet('Jadwal Pelajaran')
    expect(wsJadwal).toBeDefined()

    let foundCellText: any = null
    wsJadwal?.eachRow((row) => {
      if (row.getCell(1).value === firstHari && row.getCell(2).value === kbmSlot.jp.join('-')) {
        foundCellText = row.getCell(4).value
      }
    })

    expect(foundCellText).toBe('1|2')
  })

  it('menghasilkan markup HTML siap cetak PDF dengan kop resmi, jadwal, beban, dan tanda tangan', () => {
    const data = generateExtremeProject(5, 3)
    const html = generateSchedulePrintHtml(data)

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain(data.meta.nama_sekolah.toUpperCase())
    expect(html).toContain(data.meta.notaris)
    expect(html).toContain(data.meta.alamat_sekolah)
    expect(html).toContain('JADWAL PELAJARAN UTAMA')
    expect(html).toContain('DAFTAR PEMBAGIAN TUGAS DAN BEBAN MENGAJAR GURU')
    expect(html).toContain('Dr. H. Penguji, M.Pd.')
    expect(html).toContain('197001011995011001')
    expect(html).toContain('Rombel-1')
    expect(html).toContain('class="kop-logo"')
    expect(html).toContain('class="ttd-image"')
    expect(html).toContain('row-end-of-day')
  })

  it('merender banner kop surat horizontal utuh jika kop_base64 tersedia tanpa logo khusus', () => {
    const data = generateExtremeProject(5, 3)
    delete data.meta.logo_base64
    data.meta.kop_base64 =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
    data.meta.pejabat_ttd.nip = 'NIP.198001012010011001'

    const html = generateSchedulePrintHtml(data)
    expect(html).toContain('class="kop-banner-container"')
    expect(html).toContain('class="kop-banner-img"')
    expect(html).not.toContain('NIP. NIP.')
    expect(html).toContain('NIP.198001012010011001')
  })

  it('merender sel split-JP dengan dua sub-kolom vertikal [ 1 │ 31 ] pada cetak PDF', () => {
    const data = generateExtremeProject(5, 3)
    const firstHari = Object.keys(data.struktur_waktu.hari)[0]
    const kbmSlot = data.struktur_waktu.hari[firstHari].slots.find((s) => s.tipe === 'kbm')!
    const firstKelas = data.master.kelas[0].id

    // Isi split JP: jam 1 kode 1, jam 2 kode 31
    data.jadwal[firstHari][kbmSlot.id][firstKelas] = [['1'], ['31']]

    const html = generateSchedulePrintHtml(data)
    expect(html).toContain('cell-kbm-split')
    expect(html).toContain('split-wrapper')
    expect(html).toContain('<span class="split-col split-left">1</span>')
    expect(html).toContain('<span class="split-col split-right">31</span>')
  })

  it('merender sel split-JP dengan benar saat salah satu JP kosong (contoh 1| atau |2)', () => {
    const data = generateExtremeProject(5, 3)
    const firstHari = Object.keys(data.struktur_waktu.hari)[0]
    const kbmSlot = data.struktur_waktu.hari[firstHari].slots.find((s) => s.tipe === 'kbm')!
    const firstKelas = data.master.kelas[0].id

    // Isi split JP: JP1 ada kode 1, JP2 kosong (1|)
    data.jadwal[firstHari][kbmSlot.id][firstKelas] = [['1'], []]

    const html = generateSchedulePrintHtml(data)
    // Harus tetap berupa split-wrapper dengan sisi kanan kosong, BUKAN fallback ke jam penuh
    expect(html).toContain('cell-kbm-split')
    expect(html).toContain('<span class="split-col split-left">1</span>')
    expect(html).toContain('<span class="split-col split-right"></span>')
  })
})

