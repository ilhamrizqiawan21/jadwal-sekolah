import ExcelJS from 'exceljs'
import { ProyekData } from '../core/types'
import { cellTextJP } from '../core/cell-parser'

/**
 * Membangun objek Workbook ExcelJS dari data proyek jadwal sekolah.
 * Mendukung 2 sheet: Beban Mengajar dan Jadwal Pelajaran (termasuk split-JP).
 */
export async function buildExcelWorkbook(data: ProyekData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Jadwal Sekolah Desktop'
  workbook.created = new Date()

  // Sheet 1: Beban Mengajar
  const wsBeban = workbook.addWorksheet('Beban Mengajar', {
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
  })

  wsBeban.addRow(['DAFTAR BEBAN MENGAJAR GURU'])
  wsBeban.addRow([data.meta.nama_sekolah.toUpperCase()])
  wsBeban.addRow([`TAHUN PELAJARAN ${data.meta.tahun_pelajaran} - SEMESTER ${data.meta.semester}`])
  wsBeban.addRow([])

  // Header tabel beban
  const kelasHeaders = data.master.kelas.map((k) => k.nama)
  const headerRow = ['No', 'Nama Guru', 'Kode', 'Mata Pelajaran', ...kelasHeaders, 'Total JP']
  const headerWs = wsBeban.addRow(headerRow)
  headerWs.font = { bold: true }
  headerWs.alignment = { vertical: 'middle', horizontal: 'center' }

  // Isi baris penugasan
  const guruMap = new Map(data.master.guru.map((g) => [g.id, g.nama]))
  data.master.penugasan.forEach((p, index) => {
    const guruNama =
      p.guru_ids && p.guru_ids.length > 0
        ? p.guru_ids.map((id) => guruMap.get(id) || '?').join(' & ')
        : guruMap.get(p.guru_id) || '?'
    const kelasJP = data.master.kelas.map((k) => p.beban[k.id] || '')
    const totalJP = Object.values(p.beban).reduce((sum, v) => sum + (v || 0), 0)

    const r = wsBeban.addRow([index + 1, guruNama, p.kode, p.mapel, ...kelasJP, totalJP || ''])
    r.alignment = { vertical: 'middle' }
  })

  // Border & Lebar Kolom Sheet Beban
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  }

  wsBeban.eachRow((row, rowNumber) => {
    if (rowNumber >= 5) {
      row.eachCell((cell) => {
        cell.border = borderThin
      })
    }
  })

  wsBeban.columns.forEach((col) => {
    col.width = 14
  })
  if (wsBeban.getColumn(2)) wsBeban.getColumn(2).width = 24
  if (wsBeban.getColumn(4)) wsBeban.getColumn(4).width = 22

  // Sheet 2: Matriks Jadwal Pelajaran
  const wsJadwal = workbook.addWorksheet('Jadwal Pelajaran', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
  })

  wsJadwal.addRow(['JADWAL PELAJARAN'])
  wsJadwal.addRow([data.meta.nama_sekolah.toUpperCase()])
  wsJadwal.addRow([])

  // Header kolom kelas
  const headerJadwal = wsJadwal.addRow(['Hari', 'Jam Ke', 'Waktu', ...kelasHeaders])
  headerJadwal.font = { bold: true }
  headerJadwal.alignment = { vertical: 'middle', horizontal: 'center' }

  // Isi jadwal per hari & slot
  for (const [hari, hariKbm] of Object.entries(data.struktur_waktu.hari)) {
    if (!hariKbm.aktif) continue

    for (const slot of hariKbm.slots) {
      const slotLabel = slot.jp.length > 0 ? slot.jp.join('-') : slot.label
      const waktuLabel = slot.waktu.join(' | ')

      const rowData = [hari, slotLabel, waktuLabel]
      for (const k of data.master.kelas) {
        const cell = data.jadwal[hari]?.[slot.id]?.[k.id]
        if (cell) {
          // Mendukung JP penuh, split-JP (jp1|jp2), dan team-teaching (kode1/kode2)
          const txt = cellTextJP(cell)
          rowData.push(txt)
        } else {
          rowData.push(slot.tipe === 'kbm' ? '' : slot.label)
        }
      }
      const r = wsJadwal.addRow(rowData)
      r.alignment = { vertical: 'middle', horizontal: 'center' }
    }
  }

  wsJadwal.eachRow((row, rowNumber) => {
    if (rowNumber >= 4) {
      row.eachCell((cell) => {
        cell.border = borderThin
      })
    }
  })

  wsJadwal.columns.forEach((col) => {
    col.width = 12
  })
  if (wsJadwal.getColumn(1)) wsJadwal.getColumn(1).width = 14
  if (wsJadwal.getColumn(3)) wsJadwal.getColumn(3).width = 20

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
