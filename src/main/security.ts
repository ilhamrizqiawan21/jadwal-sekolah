import { ensureFilePath } from './path-guards'

export function isSafeExternalUrl(value: string): boolean {
  try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false }
}

export function createFileGrants() {
  const grants = new Map<number, Set<string>>()
  const key = (value: string) => {
    const resolved = ensureFilePath(value)
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved
  }
  return {
    allow(sender: number, filePath: string) {
      if (!grants.has(sender)) grants.set(sender, new Set())
      grants.get(sender)!.add(key(filePath))
    },
    require(sender: number, filePath: string, extension: string) {
      const resolved = ensureFilePath(filePath, extension)
      if (!grants.get(sender)?.has(key(resolved))) throw new Error('Hanya berkas yang dipilih melalui dialog yang diizinkan.')
      return resolved
    },
    clear(sender: number) { grants.delete(sender) }
  }
}
