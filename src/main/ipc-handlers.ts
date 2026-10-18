import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { ProyekData } from '../core/types'
import { saveProject, loadProject, cleanTempFiles } from './storage'
import { exportExcelToFile } from './excel-exporter'
import { generateSchedulePrintHtml } from './pdf-template'

export function registerIpcHandlers(): void {
  // 1. Dialog Pilih Buka Berkas (.jadwal)
  ipcMain.handle('dialog:openFile', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: 'Buka Berkas Jadwal',
      filters: [{ name: 'Berkas Jadwal Sekolah', extensions: ['jadwal'] }],
      properties: ['openFile'] as ('openFile')[]
    }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)

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
      let filters = [{ name: 'Berkas Jadwal Sekolah (*.jadwal)', extensions: ['jadwal'] }]
      let title = 'Simpan Jadwal Sekolah'
      if (defaultName && defaultName.toLowerCase().endsWith('.xlsx')) {
        filters = [{ name: 'Buku Kerja Excel (*.xlsx)', extensions: ['xlsx'] }]
        title = 'Simpan Ekspor Excel'
      } else if (defaultName && defaultName.toLowerCase().endsWith('.pdf')) {
        filters = [{ name: 'Dokumen PDF (*.pdf)', extensions: ['pdf'] }]
        title = 'Simpan Dokumen PDF'
      }

      const options = {
        title,
        defaultPath: defaultName || 'jadwal-sekolah.jadwal',
        filters
      }
      const result = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options)

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

  // 6. Cetak ke PDF via dokumen cetak resmi
  ipcMain.handle(
    'app:printToPdf',
    async (event, savePath: string, data?: ProyekData) => {
      if (data) {
        const htmlContent = generateSchedulePrintHtml(data)
        const tempHtmlPath = path.join(app.getPath('temp'), `jadwal-print-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.html`)
        await fs.promises.writeFile(tempHtmlPath, htmlContent, 'utf-8')

        const printWindow = new BrowserWindow({
          show: false,
          width: 1400,
          height: 900,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        })

        try {
          await printWindow.loadFile(tempHtmlPath)
          const pdfBuffer = await printWindow.webContents.printToPDF({
            printBackground: true,
            landscape: true,
            pageSize: 'A4',
            margins: {
              top: 0.3,
              bottom: 0.3,
              left: 0.3,
              right: 0.3
            }
          })

          await fs.promises.writeFile(savePath, pdfBuffer)
          return { success: true, filePath: savePath }
        } finally {
          printWindow.destroy()
          await fs.promises.unlink(tempHtmlPath).catch(() => {})
        }
      }

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
    }
  )

  // 7. Ekspor Excel (.xlsx) dengan exceljs
  ipcMain.handle(
    'app:exportExcel',
    async (_event, savePath: string, data: ProyekData) => {
      return await exportExcelToFile(savePath, data)
    }
  )
}
