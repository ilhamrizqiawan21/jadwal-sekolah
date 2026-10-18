import { ipcMain, dialog, BrowserWindow, app, shell, IpcMainInvokeEvent } from 'electron'
import fs from 'fs'
import path from 'path'
import { ProyekData } from '../core/types'
import { pastikanProyekValid } from '../core/project-validator'
import {
  saveProject,
  loadProject,
  listBackups,
  createManualSnapshot,
  resolveBackup,
  deleteBackup,
  backupDirFor,
  saveDraft,
  loadDraft,
  clearDraft,
  APP_VERSION
} from './storage'
import { exportExcelToFile } from './excel-exporter'
import { generateSchedulePrintHtml } from './pdf-template'
import { daftarTerbaru, catatTerbaru, hapusSemuaTerbaru } from './recent-files'
import {
  izinkanProyek,
  pastikanProyekDiizinkan,
  izinkanEkspor,
  ambilIzinEkspor
} from './file-access'

function pastikanPengirimDipercaya(event: IpcMainInvokeEvent): void {
  const url = event.senderFrame?.url ?? ''
  const dev = process.env['ELECTRON_RENDERER_URL']
  const dipercaya = url.startsWith('file://') || (dev !== undefined && url.startsWith(dev))
  if (!dipercaya) throw new Error('Permintaan ditolak: sumber tidak dipercaya')
}

function handle<A extends unknown[], R>(
  channel: string,
  fn: (event: IpcMainInvokeEvent, ...args: A) => Promise<R> | R
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    pastikanPengirimDipercaya(event)
    return fn(event, ...(args as A))
  })
}

function draftDir(): string {
  return path.join(app.getPath('userData'), 'pemulihan')
}

function windowOf(event: IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

async function showOpen(
  event: IpcMainInvokeEvent,
  options: Electron.OpenDialogOptions
): Promise<Electron.OpenDialogReturnValue> {
  const win = windowOf(event)
  return win ? dialog.showOpenDialog(win, options) : dialog.showOpenDialog(options)
}

async function showSave(
  event: IpcMainInvokeEvent,
  options: Electron.SaveDialogOptions
): Promise<Electron.SaveDialogReturnValue> {
  const win = windowOf(event)
  return win ? dialog.showSaveDialog(win, options) : dialog.showSaveDialog(options)
}

function namaBerkasAman(nama: unknown, ekstensi: string): string {
  const dasar = typeof nama === 'string' ? path.basename(nama) : ''
  const bersih = dasar.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim()
  const tanpaEkt = bersih.replace(/\.[^.]+$/, '') || 'jadwal-sekolah'
  return `${tanpaEkt}${ekstensi}`
}

export interface AppHooks {
  setDirty: (dirty: boolean) => void
  confirmClose: () => void
  /** Jalur .jadwal yang menunggu dibuka (dari klik dua kali berkas atau argumen baris perintah). */
  takePendingPath: () => string | null
}

const recentDir = (): string => path.join(app.getPath('userData'), 'data')

export function registerIpcHandlers({ setDirty, confirmClose, takePendingPath }: AppHooks): void {
  // ------------------------------------------------------------------ Berkas proyek
  handle('project:open', async (event) => {
    const result = await showOpen(event, {
      title: 'Buka Berkas Jadwal',
      filters: [{ name: 'Berkas Jadwal Sekolah', extensions: ['jadwal'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const data = await loadProject(filePath)
    izinkanProyek(filePath)
    await catatTerbaru(recentDir(), filePath)
    return { filePath, data }
  })

  // ------------------------------------------------------------ Berkas terbaru
  handle('recent:list', async () => daftarTerbaru(recentDir()))
  handle('recent:clear', async () => {
    await hapusSemuaTerbaru(recentDir())
    return { success: true }
  })
  handle('recent:open', async (_event, filePath: string) => {
    const daftar = await daftarTerbaru(recentDir())
    if (!daftar.some((r) => path.resolve(r.filePath) === path.resolve(String(filePath)))) {
      throw new Error('Berkas tidak ada dalam daftar terbaru')
    }
    const data = await loadProject(filePath)
    izinkanProyek(filePath)
    await catatTerbaru(recentDir(), filePath)
    return { filePath, data }
  })

  handle('app:takePendingOpen', async () => {
    const filePath = takePendingPath()
    if (!filePath) return null
    const data = await loadProject(filePath)
    izinkanProyek(filePath)
    await catatTerbaru(recentDir(), filePath)
    return { filePath, data }
  })

  handle('project:save', async (_event, filePath: string, data: ProyekData, auto?: boolean) => {
    pastikanProyekDiizinkan(filePath)
    pastikanProyekValid(data)
    await saveProject(filePath, data, auto ? { backup: 'throttled' } : { backup: 'always' })
    return { success: true }
  })

  handle('project:saveAs', async (event, suggestedName: string, data: ProyekData) => {
    pastikanProyekValid(data)
    const result = await showSave(event, {
      title: 'Simpan Jadwal Sekolah',
      defaultPath: namaBerkasAman(suggestedName, '.jadwal'),
      filters: [{ name: 'Berkas Jadwal Sekolah (*.jadwal)', extensions: ['jadwal'] }]
    })
    if (result.canceled || !result.filePath) return null
    const filePath = result.filePath.toLowerCase().endsWith('.jadwal')
      ? result.filePath
      : `${result.filePath}.jadwal`
    izinkanProyek(filePath)
    await saveProject(filePath, data, { backup: 'always' })
    await catatTerbaru(recentDir(), filePath)
    return filePath
  })

  // --------------------------------------------------------------------- Cadangan
  handle('backup:list', async (_event, filePath: string) => {
    pastikanProyekDiizinkan(filePath)
    return listBackups(filePath)
  })

  handle('backup:snapshot', async (_event, filePath: string, data: ProyekData) => {
    pastikanProyekDiizinkan(filePath)
    pastikanProyekValid(data)
    return createManualSnapshot(filePath, data)
  })

  handle('backup:read', async (_event, filePath: string, backupPath: string) => {
    pastikanProyekDiizinkan(filePath)
    const info = await resolveBackup(filePath, backupPath)
    return loadProject(info.path)
  })

  handle('backup:delete', async (_event, filePath: string, backupPath: string) => {
    pastikanProyekDiizinkan(filePath)
    await deleteBackup(filePath, backupPath)
    return { success: true }
  })

  handle('backup:reveal', async (_event, filePath: string) => {
    pastikanProyekDiizinkan(filePath)
    const dir = backupDirFor(filePath)
    await fs.promises.mkdir(dir, { recursive: true })
    const err = await shell.openPath(dir)
    if (err) throw new Error(err)
    return { success: true }
  })

  // Berkas .jadwal lain (misalnya salinan cadangan di flashdisk) dipulihkan lewat dialog.
  handle('backup:import', async (event) => {
    const result = await showOpen(event, {
      title: 'Pilih Berkas Cadangan',
      filters: [{ name: 'Berkas Jadwal Sekolah', extensions: ['jadwal'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return { fileName: path.basename(result.filePaths[0]), data: await loadProject(result.filePaths[0]) }
  })

  // ------------------------------------------------------------- Draf pemulihan
  handle('draft:save', async (_event, data: ProyekData) => {
    pastikanProyekValid(data)
    await saveDraft(draftDir(), data)
    return { success: true }
  })
  handle('draft:load', async () => loadDraft(draftDir()))
  handle('draft:clear', async () => {
    await clearDraft(draftDir())
    return { success: true }
  })

  // ------------------------------------------------------------------- Ekspor
  handle('export:chooseTarget', async (event, kind: 'xlsx' | 'pdf', suggestedName: string) => {
    const ext = kind === 'pdf' ? '.pdf' : '.xlsx'
    const result = await showSave(event, {
      title: kind === 'pdf' ? 'Simpan Dokumen PDF' : 'Simpan Ekspor Excel',
      defaultPath: namaBerkasAman(suggestedName, ext),
      filters:
        kind === 'pdf'
          ? [{ name: 'Dokumen PDF (*.pdf)', extensions: ['pdf'] }]
          : [{ name: 'Buku Kerja Excel (*.xlsx)', extensions: ['xlsx'] }]
    })
    if (result.canceled || !result.filePath) return null
    const target = result.filePath.toLowerCase().endsWith(ext) ? result.filePath : `${result.filePath}${ext}`
    izinkanEkspor(target, ext)
    return target
  })

  handle('export:excel', async (_event, savePath: string, data: ProyekData) => {
    const target = ambilIzinEkspor(savePath, '.xlsx')
    pastikanProyekValid(data)
    return exportExcelToFile(target, data)
  })

  handle('export:pdf', async (_event, savePath: string, data: ProyekData) => {
    const target = ambilIzinEkspor(savePath, '.pdf')
    pastikanProyekValid(data)

    const html = generateSchedulePrintHtml(data)
    const tempHtmlPath = path.join(
      app.getPath('temp'),
      `jadwal-print-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.html`
    )
    await fs.promises.writeFile(tempHtmlPath, html, 'utf-8')

    const printWindow = new BrowserWindow({
      show: false,
      width: 1400,
      height: 900,
      webPreferences: {
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
        javascript: false
      }
    })
    printWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: !details.url.startsWith('file://') && !details.url.startsWith('data:') })
    })

    try {
      await printWindow.loadFile(tempHtmlPath)
      const pdfBuffer = await printWindow.webContents.printToPDF({
        printBackground: true,
        landscape: true,
        pageSize: 'A4',
        margins: { top: 0.3, bottom: 0.3, left: 0.3, right: 0.3 }
      })
      await fs.promises.writeFile(target, pdfBuffer)
      return { success: true, filePath: target }
    } finally {
      printWindow.destroy()
      await fs.promises.unlink(tempHtmlPath).catch(() => {})
    }
  })

  // ------------------------------------------------------------------- Aplikasi
  handle('app:info', async () => ({ version: APP_VERSION, platform: process.platform }))
  handle('app:setDirty', async (_event, dirty: boolean) => {
    setDirty(Boolean(dirty))
    return { success: true }
  })
  handle('app:confirmClose', async () => {
    confirmClose()
    return { success: true }
  })
}
