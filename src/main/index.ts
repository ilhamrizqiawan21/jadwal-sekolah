import { app, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { cleanTempFiles } from './storage'
import { jalurDariArgv } from './recent-files'

let mainWindow: BrowserWindow | null = null
let hasUnsavedChanges = false
let closeConfirmed = false
let pendingPath: string | null = jalurDariArgv(process.argv)

const gotTheLock = app.requestSingleInstanceLock()

function isAppUrl(url: string): boolean {
  const dev = process.env['ELECTRON_RENDERER_URL']
  return url.startsWith('file://') || (dev !== undefined && url.startsWith(dev))
}

function hardenSession(): void {
  // Aplikasi sepenuhnya offline: tidak ada izin perangkat yang pernah dibutuhkan.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)
}

function createWindow(): void {
  closeConfirmed = false
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 820,
    minWidth: 880,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    title: 'Jadwal Sekolah',
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  // Tidak ada tautan eksternal yang dibutuhkan aplikasi; semua jendela baru ditolak.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) event.preventDefault()
  })

  // Tahan penutupan jendela bila ada perubahan yang belum disimpan; renderer yang bertanya ke pengguna.
  mainWindow.on('close', (event) => {
    if (hasUnsavedChanges && !closeConfirmed && mainWindow && !mainWindow.webContents.isDestroyed()) {
      event.preventDefault()
      mainWindow.webContents.send('app:close-requested')
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const path = jalurDariArgv(argv)
    if (path && mainWindow) {
      pendingPath = path
      mainWindow.webContents.send('app:open-requested')
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.jadwalsekolah.app')
    hardenSession()

    registerIpcHandlers({
      setDirty: (dirty) => {
        hasUnsavedChanges = dirty
      },
      confirmClose: () => {
        closeConfirmed = true
        mainWindow?.close()
      },
      takePendingPath: () => {
        const p = pendingPath
        pendingPath = null
        return p
      }
    })

    await cleanTempFiles(join(app.getPath('userData'), 'pemulihan'))

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event) => event.preventDefault())
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
