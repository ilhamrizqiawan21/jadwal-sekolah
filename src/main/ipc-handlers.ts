import { ipcMain, dialog, BrowserWindow, app, nativeImage } from 'electron'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { createFileGrants } from './security'
import { assertProjectData } from './storage'
import { ProyekData } from '../core/types'
import { saveProject, loadProject, cleanTempFiles } from './storage'
import { exportExcelToFile } from './excel-exporter'
import { generateSchedulePrintHtml } from './pdf-template'
import { APP_NAME, DEFAULT_FILE_NAME } from '../core/app-meta'
import { ensureFilePath, ensureWithinRoots } from './path-guards'


export function registerIpcHandlers(): void {
  const grants = createFileGrants()
  const handle: typeof ipcMain.handle = (channel, listener) => {
    ipcMain.handle(channel, (event, ...args) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      const expectedUrl = !app.isPackaged && process.env.ELECTRON_RENDERER_URL
        ? process.env.ELECTRON_RENDERER_URL
        : pathToFileURL(path.join(__dirname, '../renderer/index.html')).href
      const actualUrl = event.senderFrame?.url.split('#')[0]
      if (!window || event.senderFrame !== event.sender.mainFrame || actualUrl !== expectedUrl.split('#')[0]) {
        throw new Error('Pengirim IPC tidak diizinkan.')
      }
      return listener(event, ...args)
    })
  }
  // 0. Sinkronisasi judul dan ikon jendela dari profil sekolah
  handle(
    'app:updateWindowIcon',
    async (event, base64DataUrl: string | null, title?: string) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) throw new Error('Jendela aktif tidak ditemukan')

      if (title) window.setTitle(title)
      if (base64DataUrl) {
        const icon = nativeImage.createFromDataURL(base64DataUrl)
        if (!icon.isEmpty()) window.setIcon(icon)
      }

      return { success: true }
    }
  )

  // 1. Dialog Pilih Buka Berkas (.jadwal)
  handle('dialog:openFile', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: 'Buka Berkas Jadwal',
      filters: [{ name: 'Berkas Jadwal Pendidikan', extensions: ['jadwal'] }],
      properties: ['openFile'] as ('openFile')[]
    }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = ensureFilePath(result.filePaths[0], '.jadwal')
    grants.allow(event.sender.id, filePath)
    const data = await loadProject(filePath)
    return { filePath, data }
  })

  // 2. Dialog Simpan Berkas (.jadwal)
  handle(
    'dialog:saveFile',
    async (event, defaultName?: string, dataToSave?: ProyekData) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      let filters = [{ name: 'Berkas Jadwal Pendidikan (*.jadwal)', extensions: ['jadwal'] }]
      let title = `Simpan ${APP_NAME}`
      if (defaultName && defaultName.toLowerCase().endsWith('.xlsx')) {
        filters = [{ name: 'Buku Kerja Excel (*.xlsx)', extensions: ['xlsx'] }]
        title = 'Simpan Ekspor Excel'
      } else if (defaultName && defaultName.toLowerCase().endsWith('.pdf')) {
        filters = [{ name: 'Dokumen PDF (*.pdf)', extensions: ['pdf'] }]
        title = 'Simpan Dokumen PDF'
      }

      const options = {
        title,
        defaultPath: defaultName || DEFAULT_FILE_NAME,
        filters
      }
      const result = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options)

      if (result.canceled || !result.filePath) {
        return null
      }

      const extension = `.${filters[0].extensions[0]}`
      const safeFilePath = ensureFilePath(result.filePath, extension, true)
      grants.allow(event.sender.id, safeFilePath)
      if (dataToSave) {
        if (extension !== '.jadwal') throw new Error('Data proyek harus disimpan sebagai .jadwal.')
        await saveProject(safeFilePath, dataToSave)
      }

      return safeFilePath
    }
  )

  // 3. Simpan Proyek Langsung ke Jalur yang Ditentukan
  handle(
    'storage:save',
    async (event, filePath: string, data: ProyekData) => {
      await saveProject(grants.require(event.sender.id, filePath, '.jadwal'), data)
      return { success: true }
    }
  )

  // 4. Muat Proyek dari Jalur
  handle('storage:load', async (event, filePath: string) => {
    const data = await loadProject(grants.require(event.sender.id, filePath, '.jadwal'))
    return data
  })

  // 5. Bersihkan berkas sementara
  handle('storage:cleanTemp', async (_event, dirPath: string) => {
    const allowedRoots = [path.join(app.getPath('documents'), APP_NAME), app.getPath('userData')]
    const safeDirPath = ensureWithinRoots(dirPath, allowedRoots)
    await cleanTempFiles(safeDirPath)
    return { success: true }
  })

  // 6. Cetak ke PDF via dokumen cetak resmi
  handle(
    'app:printToPdf',
    async (event, savePath: string, data?: ProyekData) => {
      grants.require(event.sender.id, savePath, '.pdf')
      if (data) {
        assertProjectData(data)
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

          const safeSavePath = ensureFilePath(savePath, '.pdf')
          await fs.promises.writeFile(safeSavePath, pdfBuffer)
          return { success: true, filePath: safeSavePath }
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

      const safeSavePath = ensureFilePath(savePath, '.pdf')
      await fs.promises.writeFile(safeSavePath, pdfBuffer)
      return { success: true, filePath: safeSavePath }
    }
  )

  // 7. Ekspor Excel (.xlsx) dengan exceljs
  handle(
    'app:exportExcel',
    async (event, savePath: string, data: ProyekData) => {
      assertProjectData(data)
      return await exportExcelToFile(grants.require(event.sender.id, savePath, '.xlsx'), data)
    }
  )
}
