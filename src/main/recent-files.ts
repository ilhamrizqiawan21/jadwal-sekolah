import fs from 'fs'
import path from 'path'

import type { BerkasTerbaru } from '../core/types'

const NAMA_BERKAS = 'berkas-terbaru.json'
const MAKS = 8

async function baca(dir: string): Promise<BerkasTerbaru[]> {
  try {
    const raw = JSON.parse(await fs.promises.readFile(path.join(dir, NAMA_BERKAS), 'utf-8'))
    if (!Array.isArray(raw)) return []
    return raw.filter(
      (r): r is BerkasTerbaru =>
        r && typeof r.filePath === 'string' && typeof r.openedAt === 'string' && path.isAbsolute(r.filePath)
    )
  } catch {
    return []
  }
}

async function tulis(dir: string, list: BerkasTerbaru[]): Promise<void> {
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(path.join(dir, NAMA_BERKAS), JSON.stringify(list, null, 2), 'utf-8')
}

/** Daftar berkas terbaru; berkas yang sudah tidak ada dibuang. */
export async function daftarTerbaru(dir: string): Promise<BerkasTerbaru[]> {
  const list = await baca(dir)
  const ada = list.filter((r) => fs.existsSync(r.filePath))
  if (ada.length !== list.length) await tulis(dir, ada).catch(() => {})
  return ada
}

export async function catatTerbaru(dir: string, filePath: string): Promise<void> {
  const list = (await baca(dir)).filter((r) => path.resolve(r.filePath) !== path.resolve(filePath))
  list.unshift({ filePath, name: path.basename(filePath), openedAt: new Date().toISOString() })
  await tulis(dir, list.slice(0, MAKS)).catch(() => {})
}

export async function hapusSemuaTerbaru(dir: string): Promise<void> {
  await tulis(dir, []).catch(() => {})
}

/** Mengambil jalur .jadwal pertama dari argumen baris perintah (abaikan flag). */
export function jalurDariArgv(argv: string[]): string | null {
  for (const a of argv.slice(1)) {
    if (!a.startsWith('-') && a.toLowerCase().endsWith('.jadwal') && path.isAbsolute(a)) return a
  }
  return null
}
