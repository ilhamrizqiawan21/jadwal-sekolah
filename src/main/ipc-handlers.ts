import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { ProyekData } from '../core/types'
import { saveProject, loadProject, cleanTempFiles } from './storage'
import ExcelJS from 'exceljs'

export function registerIpcHandlers(): void {
  // 1. Dialog Pilih Buka Berkas (.jadwal)
  ipcMain.handle('dialog:openFile', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window || undefined, {
      title: 'Buka Berkas Jadwal',
      filters: [{ name: 'Berkas Jadwal Sekolah', extensions: ['jadwal'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const data = await loadProject(filePath)
    return { filePath, data }
  })

  // 2. Dialog Simpan Berkas (.jadwal)
  ipcMain.handle(
    'dialog:saveFile',
    async (event, defaultName?: string, dataToSave?: ProyekData) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showSaveDialog(window || undefined, {
        title: 'Simpan Jadwal Sekolah',
        defaultPath: defaultName || 'jadwal-sekolah.jadwal',
        filters: [{ name: 'Berkas Jadwal Sekolah', extensions: ['jadwal'] }]
      })

      if (result.canceled || !result.filePath) {
        return null
      }

      if (dataToSave) {
        await saveProject(result.filePath, dataToSave)
      }

      return result.filePath
    }
  )

  // 3. Simpan Proyek Langsung ke Jalur yang Ditentukan
  ipcMain.handle(
    'storage:save',
    async (_event, filePath: string, data: ProyekData) => {
      await saveProject(filePath, data)
      return { success: true }
    }
  )

  // 4. Muat Proyek dari Jalur
  ipcMain.handle('storage:load', async (_event, filePath: string) => {
    const data = await loadProject(filePath)
    return data
  })

  // 5. Bersihkan berkas sementara
  ipcMain.handle('storage:cleanTemp', async (_event, dirPath: string) => {
    await cleanTempFiles(dirPath)
    return { success: true }
  })

  // 6. Cetak ke PDF via Chromium Print Engine bawaan Electron
  ipcMain.handle('app:printToPdf', async (event, savePath: string) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) throw new Error('Jendela aktif tidak ditemukan')

    const pdfBuffer = await window.webContents.printToPDF({
      printBackground: true,
      landscape: true,
      pageSize: 'A4',
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    })

    await fs.promises.writeFile(savePath, pdfBuffer)
    return { success: true, filePath: savePath }
  })

  // 7. Ekspor Excel (.xlsx) dengan exceljs
  ipcMain.handle(
    'app:exportExcel',
    async (_event, savePath: string, data: ProyekData) => {
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
        const guruNama = guruMap.get(p.guru_id) || '?'
        const kelasJP = data.master.kelas.map((k) => p.beban[k.id] || '')
        const totalJP = Object.values(p.beban).reduce((sum, v) => sum + (v || 0), 0)

        wsBeban.addRow([index + 1, guruNama, p.kode, p.mapel, ...kelasJP, totalJP || ''])
      })

      // Sheet 2: Matriks Jadwal
      const wsJadwal = workbook.addWorksheet('Jadwal Pelajaran', {
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
      })

      wsJadwal.addRow(['JADWAL PELAJARAN'])
      wsJadwal.addRow([data.meta.nama_sekolah.toUpperCase()])
      wsJadwal.addRow([])

      // Header kolom kelas
      wsJadwal.addRow(['Hari', 'Jam Ke', 'Waktu', ...kelasHeaders])

      // Isi jadwal per hari & slot
      for (const [hari, hariKbm] of Object.entries(data.struktur_waktu.hari)) {
        if (!hariKbm.aktif) continue

        for (const slot of hariKbm.slots) {
          const slotLabel = slot.jp.length > 0 ? slot.jp.join('-') : slot.label
          const waktuLabel = slot.waktu.join(' | ')

          const rowData = [hari, slotLabel, waktuLabel]
          for (const k of data.master.kelas) {
            const cell = data.jadwal[hari]?.[slot.id]?.[k.id]
            if (cell && cell[0]) {
              const txt = cell[0].join('/')
              rowData.push(txt)
            } else {
              rowData.push(slot.tipe === 'kbm' ? '' : slot.label)
            }
          }
          wsJadwal.addRow(rowData)
        }
      }

      await workbook.xlsx.writeFile(savePath)
      return { success: true, filePath: savePath }
    }
  )
}
