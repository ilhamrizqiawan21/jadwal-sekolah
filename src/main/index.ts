import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { cleanTempFiles } from './storage'
import { isSafeExternalUrl } from './security'
import { APP_NAME } from '../core/app-meta'

let mainWindow: BrowserWindow | null = null

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Jika instance kedua dijalankan, pulihkan dan fokuskan jendela yang sudah ada
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  function createWindow(): void {
    mainWindow = new BrowserWindow({
      width: 1360,
      height: 820,
      minWidth: 880,
      minHeight: 560,
      show: false,
      autoHideMenuBar: true,
      title: APP_NAME,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    mainWindow.on('ready-to-show', () => {
      mainWindow?.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      if (isSafeExternalUrl(details.url)) void shell.openExternal(details.url).catch(console.error)
      return { action: 'deny' }
    })

    mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())

    // HMR for renderer base on electron-vite cli.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.jadwalpendidikan.app')

    // Register all strictly-typed IPC handlers
    registerIpcHandlers()

    // Clean stale temp files in documents/app directory
    const defaultDir = join(app.getPath('documents'), APP_NAME)
    await cleanTempFiles(defaultDir)

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    createWindow()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
