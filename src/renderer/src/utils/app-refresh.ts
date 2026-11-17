import { ProyekData } from '../../../core/types'

const REFRESH_SNAPSHOT_KEY = 'jadwal-pendidikan:refresh-snapshot'

export interface RefreshSnapshot {
  data: ProyekData
  filePath: string | null
  dirty: boolean
}

export function serializeRefreshSnapshot(snapshot: RefreshSnapshot): string {
  return JSON.stringify(snapshot)
}

export function parseRefreshSnapshot(raw: string): RefreshSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const candidate = parsed as Partial<RefreshSnapshot>
    if (!candidate.data || typeof candidate.data !== 'object') return null
    if (candidate.data.format_version !== 2) return null
    if (candidate.filePath !== null && typeof candidate.filePath !== 'string') return null
    if (typeof candidate.dirty !== 'boolean') return null
    return candidate as RefreshSnapshot
  } catch {
    return null
  }
}

export function saveRefreshSnapshot(snapshot: RefreshSnapshot): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false
    sessionStorage.setItem(REFRESH_SNAPSHOT_KEY, serializeRefreshSnapshot(snapshot))
    return true
  } catch {
    return false
  }
}

export function consumeRefreshSnapshot(): RefreshSnapshot | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    const raw = sessionStorage.getItem(REFRESH_SNAPSHOT_KEY)
    if (!raw) return null
    sessionStorage.removeItem(REFRESH_SNAPSHOT_KEY)
    return parseRefreshSnapshot(raw)
  } catch {
    return null
  }
}

export function shouldRefreshRenderer(
  hasUnsavedChanges: boolean,
  confirmRefresh: () => boolean
): boolean {
  return !hasUnsavedChanges || confirmRefresh()
}
