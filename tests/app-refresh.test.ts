import { describe, it, expect } from 'vitest'
import {
  parseRefreshSnapshot,
  serializeRefreshSnapshot,
  shouldRefreshRenderer,
  RefreshSnapshot
} from '../src/renderer/src/utils/app-refresh'

describe('app-refresh', () => {
  const snapshot: RefreshSnapshot = {
    data: { format_version: 2 } as RefreshSnapshot['data'],
    filePath: 'C:/contoh.jadwal',
    dirty: true
  }

  it('mempertahankan snapshot proyek saat renderer dimuat ulang', () => {
    expect(parseRefreshSnapshot(serializeRefreshSnapshot(snapshot))).toEqual(snapshot)
  })

  it('menolak snapshot yang rusak', () => {
    expect(parseRefreshSnapshot('{"data":null}')).toBeNull()
    expect(parseRefreshSnapshot('bukan json')).toBeNull()
  })

  it('meminta konfirmasi hanya jika ada perubahan belum tersimpan', () => {
    const confirm = () => true
    expect(shouldRefreshRenderer(false, () => false)).toBe(true)
    expect(shouldRefreshRenderer(true, confirm)).toBe(true)
    expect(shouldRefreshRenderer(true, () => false)).toBe(false)
  })
})
