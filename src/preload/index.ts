import { contextBridge, ipcRenderer } from 'electron'
import { ProyekData } from '../core/types'

export interface IElectronAPI {
  openFileDialog: () => Promise<{ filePath: string; data: ProyekData } | null>
  saveFileDialog: (defaultName?: string, dataToSave?: ProyekData) => Promise<string | null>
  saveProject: (filePath: string, data: ProyekData) => Promise<{ success: boolean }>
  loadProject: (filePath: string) => Promise<ProyekData>
  cleanTempFiles: (dirPath: string) => Promise<{ success: boolean }>
  printToPdf: (savePath: string, data?: ProyekData) => Promise<{ success: boolean; filePath: string }>
  exportExcel: (savePath: string, data: ProyekData) => Promise<{ success: boolean; filePath: string }>
  updateWindowIcon: (base64DataUrl: string | null, title?: string) => Promise<{ success: boolean }>
  ping: () => string
}

const api: IElectronAPI = {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: (defaultName, dataToSave) =>
    ipcRenderer.invoke('dialog:saveFile', defaultName, dataToSave),
  saveProject: (filePath, data) => ipcRenderer.invoke('storage:save', filePath, data),
  loadProject: (filePath) => ipcRenderer.invoke('storage:load', filePath),
  cleanTempFiles: (dirPath) => ipcRenderer.invoke('storage:cleanTemp', dirPath),
  printToPdf: (savePath, data) => ipcRenderer.invoke('app:printToPdf', savePath, data),
  exportExcel: (savePath, data) => ipcRenderer.invoke('app:exportExcel', savePath, data),
  updateWindowIcon: (base64DataUrl, title) =>
    ipcRenderer.invoke('app:updateWindowIcon', base64DataUrl, title),
  ping: () => 'pong'
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('secureBridge', { api })
  } catch (error) {
    console.error('Gagal mengekspos secureBridge di preload:', error)
  }
} else {
  // @ts-ignore fallback
  window.api = api
  // @ts-ignore fallback
  window.secureBridge = { api }
}
