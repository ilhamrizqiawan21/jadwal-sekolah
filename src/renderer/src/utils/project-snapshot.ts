import { ProyekData } from '../../../core/types'

/**
 * Membuat payload plain object yang aman dikirim melalui IPC Electron.
 * Data dari Pinia/Vue dapat berupa Proxy reaktif yang tidak bisa di-clone oleh IPC.
 */
export function getProjectSnapshot(data: ProyekData): ProyekData {
  return JSON.parse(JSON.stringify(data)) as ProyekData
}
