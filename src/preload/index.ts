import { contextBridge, ipcRenderer } from 'electron'
import type { ProyekData, InfoCadangan } from '../core/types'

export interface IElectronAPI {
  openProject: () => Promise<{ filePath: string; data: ProyekData } | null>
  saveProject: (filePath: string, data: ProyekData, auto?: boolean) => Promise<{ success: boolean }>
  saveProjectAs: (suggestedName: string, data: ProyekData) => Promise<string | null>

  listBackups: (filePath: string) => Promise<InfoCadangan[]>
  createSnapshot: (filePath: string, data: ProyekData) => Promise<InfoCadangan>
  readBackup: (filePath: string, backupPath: string) => Promise<ProyekData>
  deleteBackup: (filePath: string, backupPath: string) => Promise<{ success: boolean }>
  revealBackupFolder: (filePath: string) => Promise<{ success: boolean }>
  importBackupFile: () => Promise<{ fileName: string; data: ProyekData } | null>

  saveDraft: (data: ProyekData) => Promise<{ success: boolean }>
  loadDraft: () => Promise<{ data: ProyekData; savedAt: string } | null>
  clearDraft: () => Promise<{ success: boolean }>

  chooseExportTarget: (kind: 'xlsx' | 'pdf', suggestedName: string) => Promise<string | null>
  exportExcel: (savePath: string, data: ProyekData) => Promise<{ success: boolean; filePath: string }>
  exportPdf: (savePath: string, data: ProyekData) => Promise<{ success: boolean; filePath: string }>

  getAppInfo: () => Promise<{ version: string; platform: string }>
  setDirty: (dirty: boolean) => Promise<{ success: boolean }>
  confirmClose: () => Promise<{ success: boolean }>
  onCloseRequested: (listener: () => void) => () => void
}

const api: IElectronAPI = {
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (filePath, data, auto) => ipcRenderer.invoke('project:save', filePath, data, auto),
  saveProjectAs: (suggestedName, data) => ipcRenderer.invoke('project:saveAs', suggestedName, data),

  listBackups: (filePath) => ipcRenderer.invoke('backup:list', filePath),
  createSnapshot: (filePath, data) => ipcRenderer.invoke('backup:snapshot', filePath, data),
  readBackup: (filePath, backupPath) => ipcRenderer.invoke('backup:read', filePath, backupPath),
  deleteBackup: (filePath, backupPath) => ipcRenderer.invoke('backup:delete', filePath, backupPath),
  revealBackupFolder: (filePath) => ipcRenderer.invoke('backup:reveal', filePath),
  importBackupFile: () => ipcRenderer.invoke('backup:import'),

  saveDraft: (data) => ipcRenderer.invoke('draft:save', data),
  loadDraft: () => ipcRenderer.invoke('draft:load'),
  clearDraft: () => ipcRenderer.invoke('draft:clear'),

  chooseExportTarget: (kind, suggestedName) =>
    ipcRenderer.invoke('export:chooseTarget', kind, suggestedName),
  exportExcel: (savePath, data) => ipcRenderer.invoke('export:excel', savePath, data),
  exportPdf: (savePath, data) => ipcRenderer.invoke('export:pdf', savePath, data),

  getAppInfo: () => ipcRenderer.invoke('app:info'),
  setDirty: (dirty) => ipcRenderer.invoke('app:setDirty', dirty),
  confirmClose: () => ipcRenderer.invoke('app:confirmClose'),
  onCloseRequested: (listener) => {
    const wrapped = (): void => listener()
    ipcRenderer.on('app:close-requested', wrapped)
    return () => ipcRenderer.removeListener('app:close-requested', wrapped)
  }
}

contextBridge.exposeInMainWorld('api', api)
