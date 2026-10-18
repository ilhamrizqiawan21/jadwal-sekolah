import ExcelJS from 'exceljs'
import { ProyekData } from '../core/types'
import { cellTextJP } from '../core/cell-parser'

/**
 * Membantu membersihkan string base64 dari prefix data URI.
 */
function extractBase64Data(dataUrl: string): { base64: string; extension: 'png' | 'jpeg' } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null
  let extension: 'png' | 'jpeg' = 'png'

  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) {
    extension = 'jpeg'
  } else if (dataUrl.includes('image/png') || !dataUrl.includes('image/')) {
    extension = 'png'
  } else {
    return null
  }

  const commaIndex = dataUrl.indexOf(',')
  const base64 = commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : dataUrl
  if (!/^[A-Za-z0-9+/=]+$/.test(base64.trim())) return null

  return { base64: base64.trim(), extension }
}

/**
 * Styling border standar untuk tabel dokumen resmi.
 */
const borderThin: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF94A3B8' } },
  left: { style: 'thin', color: { argb: 'FF94A3B8' } },
  bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
  right: { style: 'thin', color: { argb: 'FF94A3B8' } }
}

const headerFill: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0F766E' } // Emerald 700
}

const nonKbmFill: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' } // Slate 100
}

/**
 * Membangun objek Workbook ExcelJS dari data proyek jadwal sekolah dengan kop surat lengkap.
 */
export async function buildExcelWorkbook(data: ProyekData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Jadwal Sekolah Desktop'
  workbook.created = new Date()

  const logoDataUrl = data.meta.logo_base64 || data.meta.kop_base64
  let logoImageId: number | null = null
  if (logoDataUrl && logoDataUrl.length > 50) {
    try {
      const extracted = extractBase64Data(logoDataUrl)
      if (extracted) {
        logoImageId = workbook.addImage({
          base64: extracted.base64,
          extension: extracted.extension
        })
      }
    } catch {
      logoImageId = null
    }
  }

  const kelasHeaders = data.master.kelas.map((k) => k.nama)

  // =========================================================================
  // SHEET 1: BEBAN MENGAJAR
  // =========================================================================
  const wsBeban = workbook.addWorksheet('Beban Mengajar', {
    pageSetup: {
      orientation: 'portrait',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  })

  let rowIdxBeban = 1

  // Baris Kop Surat
  if (data.meta.notaris && data.meta.notaris.trim() !== '') {
    const rNotaris = wsBeban.addRow([data.meta.notaris.trim()])
    rNotaris.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } }
    rNotaris.alignment = { horizontal: 'center' }
    rowIdxBeban++
  }

  const rSekolah = wsBeban.addRow([(data.meta.nama_sekolah || 'SEKOLAH').toUpperCase()])
  rSekolah.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } }
  rSekolah.alignment = { horizontal: 'center' }
  rowIdxBeban++

  if (data.meta.alamat_sekolah && data.meta.alamat_sekolah.trim() !== '') {
    const rAlamat = wsBeban.addRow([data.meta.alamat_sekolah.trim()])
    rAlamat.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } }
    rAlamat.alignment = { horizontal: 'center' }
    rowIdxBeban++
  }

  // Garis pemisah kop
  const rGaris = wsBeban.addRow([])
  rGaris.border = { bottom: { style: 'double', color: { argb: 'FF000000' } } }
  rowIdxBeban++

  // Judul Dokumen
  wsBeban.addRow([])
  rowIdxBeban++

  const rJudulBeban = wsBeban.addRow(['DAFTAR PEMBAGIAN TUGAS DAN BEBAN MENGAJAR GURU'])
  rJudulBeban.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } }
  rJudulBeban.alignment = { horizontal: 'center' }
  rowIdxBeban++

  const rSubBeban = wsBeban.addRow([
    `TAHUN PELAJARAN ${data.meta.tahun_pelajaran || '-'} - SEMESTER ${data.meta.semester || '-'}`
  ])
  rSubBeban.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } }
  rSubBeban.alignment = { horizontal: 'center' }
  rowIdxBeban++

  wsBeban.addRow([])
  rowIdxBeban++

  // Merge judul kop ke seluruh kolom tabel
  const totalKolomBeban = 5 + kelasHeaders.length
  for (let r = 1; r < rowIdxBeban; r++) {
    try {
      wsBeban.mergeCells(r, 1, r, totalKolomBeban)
    } catch {
      // Abaikan jika sudah dimerge
    }
  }

  // Pasang Logo di Sheet Beban jika ada
  if (logoImageId !== null) {
    try {
      wsBeban.addImage(logoImageId, {
        tl: { col: 0.2, row: 0.2 },
        ext: { width: 55, height: 55 }
      })
    } catch {
      // Abaikan kegagalan rendering image
    }
  }

  // Header Tabel Beban
  const headerRowBeban = [
    'No',
    'Nama Guru & Gelar',
    'Kode',
    'Mata Pelajaran',
    ...kelasHeaders,
    'Total JP'
  ]
  const wsHeaderBeban = wsBeban.addRow(headerRowBeban)
  wsHeaderBeban.height = 24
  wsHeaderBeban.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
  wsHeaderBeban.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  wsHeaderBeban.eachCell((cell) => {
    cell.fill = headerFill
    cell.border = borderThin
  })

  // Isi Data Penugasan
  const guruMap = new Map(data.master.guru.map((g) => [g.id, g.nama]))
  data.master.penugasan.forEach((p, index) => {
    const guruNama =
      p.guru_ids && p.guru_ids.length > 0
        ? p.guru_ids.map((id) => guruMap.get(id) || '?').join(' & ')
        : guruMap.get(p.guru_id) || '?'

    const kelasJP = data.master.kelas.map((k) => p.beban[k.id] || '')
    const totalJP = Object.values(p.beban).reduce((sum, v) => sum + (v || 0), 0)

    const r = wsBeban.addRow([index + 1, guruNama, p.kode, p.mapel, ...kelasJP, totalJP || ''])
    r.height = 20
    r.font = { name: 'Arial', size: 9.5 }
    r.eachCell((cell, colNumber) => {
      cell.border = borderThin
      if (colNumber === 2 || colNumber === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }
    })
  })

  // Baris Total JP Keseluruhan di Footer Tabel
  const totalRowValues: any[] = ['TOTAL', '', '', '']
  data.master.kelas.forEach((k) => {
    const sumKelas = data.master.penugasan.reduce((acc, p) => acc + (p.beban[k.id] || 0), 0)
    totalRowValues.push(sumKelas || '')
  })
  const grandTotalJP = data.master.penugasan.reduce((acc, p) => {
    return acc + Object.values(p.beban).reduce((s, v) => s + (v || 0), 0)
  }, 0)
  totalRowValues.push(grandTotalJP || '')

  const rTotalBeban = wsBeban.addRow(totalRowValues)
  rTotalBeban.height = 22
  rTotalBeban.font = { name: 'Arial', size: 10, bold: true }
  rTotalBeban.eachCell((cell) => {
    cell.border = borderThin
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  try {
    wsBeban.mergeCells(rTotalBeban.number, 1, rTotalBeban.number, 4)
  } catch {
    // Abaikan
  }

  // Blok Tanda Tangan Pejabat (Beban Mengajar)
  wsBeban.addRow([])
  wsBeban.addRow([])

  const ttdStartCol = Math.max(1, totalKolomBeban - 3)
  const rTtd1 = wsBeban.addRow([])
  rTtd1.getCell(ttdStartCol).value = data.meta.kota_tanggal || 'Tanggal: ....................'
  rTtd1.font = { name: 'Arial', size: 10 }
  rTtd1.getCell(ttdStartCol).alignment = { horizontal: 'center' }
  try {
    wsBeban.mergeCells(rTtd1.number, ttdStartCol, rTtd1.number, totalKolomBeban)
  } catch {}

  const rTtd2 = wsBeban.addRow([])
  rTtd2.getCell(ttdStartCol).value = `${data.meta.pejabat_ttd?.jabatan || 'Kepala Sekolah'},`
  rTtd2.font = { name: 'Arial', size: 10 }
  rTtd2.getCell(ttdStartCol).alignment = { horizontal: 'center' }
  try {
    wsBeban.mergeCells(rTtd2.number, ttdStartCol, rTtd2.number, totalKolomBeban)
  } catch {}

  wsBeban.addRow([])
  wsBeban.addRow([])
  wsBeban.addRow([])

  const rTtd3 = wsBeban.addRow([])
  rTtd3.getCell(ttdStartCol).value =
    data.meta.pejabat_ttd?.nama || '........................................'
  rTtd3.font = { name: 'Arial', size: 10, bold: true, underline: true }
  rTtd3.getCell(ttdStartCol).alignment = { horizontal: 'center' }
  try {
    wsBeban.mergeCells(rTtd3.number, ttdStartCol, rTtd3.number, totalKolomBeban)
  } catch {}

  const rTtd4 = wsBeban.addRow([])
  rTtd4.getCell(ttdStartCol).value = `NIP. ${data.meta.pejabat_ttd?.nip || '-'}`
  rTtd4.font = { name: 'Arial', size: 9.5 }
  rTtd4.getCell(ttdStartCol).alignment = { horizontal: 'center' }
  try {
    wsBeban.mergeCells(rTtd4.number, ttdStartCol, rTtd4.number, totalKolomBeban)
  } catch {}

  // Lebar Kolom Sheet Beban
  wsBeban.getColumn(1).width = 6 // No
  wsBeban.getColumn(2).width = 28 // Nama Guru
  wsBeban.getColumn(3).width = 8 // Kode
  wsBeban.getColumn(4).width = 24 // Mapel
  for (let c = 5; c <= 4 + kelasHeaders.length; c++) {
    wsBeban.getColumn(c).width = 9 // Kolom Kelas
  }
  wsBeban.getColumn(totalKolomBeban).width = 11 // Total JP

  // =========================================================================
  // SHEET 2: MATRIKS JADWAL PELAJARAN
  // =========================================================================
  const wsJadwal = workbook.addWorksheet('Jadwal Pelajaran', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  })

  let rowIdxJadwal = 1

  // Baris Kop Surat
  if (data.meta.notaris && data.meta.notaris.trim() !== '') {
    const rNotaris = wsJadwal.addRow([data.meta.notaris.trim()])
    rNotaris.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } }
    rNotaris.alignment = { horizontal: 'center' }
    rowIdxJadwal++
  }

  const rSekolahJadwal = wsJadwal.addRow([(data.meta.nama_sekolah || 'SEKOLAH').toUpperCase()])
  rSekolahJadwal.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } }
  rSekolahJadwal.alignment = { horizontal: 'center' }
  rowIdxJadwal++

  if (data.meta.alamat_sekolah && data.meta.alamat_sekolah.trim() !== '') {
    const rAlamat = wsJadwal.addRow([data.meta.alamat_sekolah.trim()])
    rAlamat.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } }
    rAlamat.alignment = { horizontal: 'center' }
    rowIdxJadwal++
  }

  // Garis pemisah kop
  const rGarisJadwal = wsJadwal.addRow([])
  rGarisJadwal.border = { bottom: { style: 'double', color: { argb: 'FF000000' } } }
  rowIdxJadwal++

  // Judul Dokumen
  wsJadwal.addRow([])
  rowIdxJadwal++

  const rJudulJadwal = wsJadwal.addRow(['JADWAL PELAJARAN UTAMA'])
  rJudulJadwal.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } }
  rJudulJadwal.alignment = { horizontal: 'center' }
  rowIdxJadwal++

  const rSubJadwal = wsJadwal.addRow([
    `SEMESTER ${data.meta.semester || '-'} - TAHUN PELAJARAN ${data.meta.tahun_pelajaran || '-'}`
  ])
  rSubJadwal.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } }
  rSubJadwal.alignment = { horizontal: 'center' }
  rowIdxJadwal++

  wsJadwal.addRow([])
  rowIdxJadwal++

  // Merge judul kop
  const totalKolomJadwal = 3 + kelasHeaders.length
  for (let r = 1; r < rowIdxJadwal; r++) {
    try {
      wsJadwal.mergeCells(r, 1, r, totalKolomJadwal)
    } catch {
      // Abaikan
    }
  }

  // Pasang Logo di Sheet Jadwal jika ada
  if (logoImageId !== null) {
    try {
      wsJadwal.addImage(logoImageId, {
        tl: { col: 0.2, row: 0.2 },
        ext: { width: 55, height: 55 }
      })
    } catch {
      // Abaikan
    }
  }

  // Header Kolom Matriks Jadwal
  const headerRowJadwal = ['Hari', 'Jam Ke', 'Waktu', ...kelasHeaders]
  const wsHeaderJadwal = wsJadwal.addRow(headerRowJadwal)
  wsHeaderJadwal.height = 24
  wsHeaderJadwal.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
  wsHeaderJadwal.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  wsHeaderJadwal.eachCell((cell) => {
    cell.fill = headerFill
    cell.border = borderThin
  })

  // Isi Jadwal per Hari & Slot
  for (const [hari, hariKbm] of Object.entries(data.struktur_waktu.hari)) {
    if (!hariKbm.aktif) continue

    for (const slot of hariKbm.slots) {
      const slotLabel = slot.jp.length > 0 ? slot.jp.join('-') : slot.label
      const waktuLabel = slot.waktu.join(' | ')

      if (slot.tipe !== 'kbm') {
        const nonKbmLabel = `— ${(slot.label || '').toUpperCase()} —`
        const rowData = [hari, slotLabel, waktuLabel, nonKbmLabel]
        const r = wsJadwal.addRow(rowData)
        r.height = 20
        r.font = { name: 'Arial', size: 9.5, italic: true, bold: true, color: { argb: 'FF475569' } }
        r.eachCell((cell) => {
          cell.border = borderThin
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        })
        r.getCell(4).fill = nonKbmFill
        try {
          wsJadwal.mergeCells(r.number, 4, r.number, totalKolomJadwal)
        } catch {}
      } else {
        const rowData = [hari, slotLabel, waktuLabel]
        for (const k of data.master.kelas) {
          const cell = data.jadwal[hari]?.[slot.id]?.[k.id]
          if (cell) {
            const txt = cellTextJP(cell)
            rowData.push(txt)
          } else {
            rowData.push('')
          }
        }

        const r = wsJadwal.addRow(rowData)
        r.height = 20
        r.font = { name: 'Arial', size: 9.5 }
        r.eachCell((cell) => {
          cell.border = borderThin
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        })
      }
    }
  }

  // Blok Tanda Tangan Pejabat (Matriks Jadwal)
  wsJadwal.addRow([])
  wsJadwal.addRow([])

  const ttdJadwalCol = Math.max(1, totalKolomJadwal - 3)
  const rTtdJ1 = wsJadwal.addRow([])
  rTtdJ1.getCell(ttdJadwalCol).value = data.meta.kota_tanggal || 'Tanggal: ....................'
  rTtdJ1.font = { name: 'Arial', size: 10 }
  rTtdJ1.getCell(ttdJadwalCol).alignment = { horizontal: 'center' }
  try {
    wsJadwal.mergeCells(rTtdJ1.number, ttdJadwalCol, rTtdJ1.number, totalKolomJadwal)
  } catch {}

  const rTtdJ2 = wsJadwal.addRow([])
  rTtdJ2.getCell(ttdJadwalCol).value = `${data.meta.pejabat_ttd?.jabatan || 'Kepala Sekolah'},`
  rTtdJ2.font = { name: 'Arial', size: 10 }
  rTtdJ2.getCell(ttdJadwalCol).alignment = { horizontal: 'center' }
  try {
    wsJadwal.mergeCells(rTtdJ2.number, ttdJadwalCol, rTtdJ2.number, totalKolomJadwal)
  } catch {}

  wsJadwal.addRow([])
  wsJadwal.addRow([])
  wsJadwal.addRow([])

  const rTtdJ3 = wsJadwal.addRow([])
  rTtdJ3.getCell(ttdJadwalCol).value =
    data.meta.pejabat_ttd?.nama || '........................................'
  rTtdJ3.font = { name: 'Arial', size: 10, bold: true, underline: true }
  rTtdJ3.getCell(ttdJadwalCol).alignment = { horizontal: 'center' }
  try {
    wsJadwal.mergeCells(rTtdJ3.number, ttdJadwalCol, rTtdJ3.number, totalKolomJadwal)
  } catch {}

  const rTtdJ4 = wsJadwal.addRow([])
  rTtdJ4.getCell(ttdJadwalCol).value = `NIP. ${data.meta.pejabat_ttd?.nip || '-'}`
  rTtdJ4.font = { name: 'Arial', size: 9.5 }
  rTtdJ4.getCell(ttdJadwalCol).alignment = { horizontal: 'center' }
  try {
    wsJadwal.mergeCells(rTtdJ4.number, ttdJadwalCol, rTtdJ4.number, totalKolomJadwal)
  } catch {}

  // Lebar Kolom Matriks Jadwal
  wsJadwal.getColumn(1).width = 12 // Hari
  wsJadwal.getColumn(2).width = 10 // Jam Ke
  wsJadwal.getColumn(3).width = 16 // Waktu
  for (let c = 4; c <= totalKolomJadwal; c++) {
    wsJadwal.getColumn(c).width = 11 // Rombel Kelas
  }

  return workbook
}

/**
 * Menyimpan data proyek sebagai berkas Excel (.xlsx).
 */
export async function exportExcelToFile(
  savePath: string,
  data: ProyekData
): Promise<{ success: boolean; filePath: string }> {
  const workbook = await buildExcelWorkbook(data)
  await workbook.xlsx.writeFile(savePath)
  return { success: true, filePath: savePath }
}
