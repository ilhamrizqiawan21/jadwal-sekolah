import path from 'path'

/**
 * Daftar jalur berkas yang pernah dipilih pengguna lewat dialog sistem.
 * Renderer tidak boleh membaca atau menulis jalur lain.
 */
const normalisasi = (p: string): string => {
  const abs = path.resolve(p)
  return process.platform === 'win32' ? abs.toLowerCase() : abs
}

const proyek = new Set<string>()
const ekspor = new Map<string, string>()

export function izinkanProyek(filePath: string): void {
  proyek.add(normalisasi(filePath))
}

export function pastikanProyekDiizinkan(filePath: unknown): string {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
    throw new Error('Jalur berkas tidak valid')
  }
  if (path.extname(filePath).toLowerCase() !== '.jadwal') {
    throw new Error('Hanya berkas berekstensi .jadwal yang dapat diproses')
  }
  if (!proyek.has(normalisasi(filePath))) {
    throw new Error('Berkas belum dipilih melalui dialog Buka atau Simpan')
  }
  return filePath
}

/** Izin ekspor berlaku sekali pakai dan terikat pada satu ekstensi. */
export function izinkanEkspor(filePath: string, ext: '.xlsx' | '.pdf'): void {
  ekspor.set(normalisasi(filePath), ext)
}

export function ambilIzinEkspor(filePath: unknown, ext: '.xlsx' | '.pdf'): string {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
    throw new Error('Jalur berkas tidak valid')
  }
  const key = normalisasi(filePath)
  if (ekspor.get(key) !== ext || path.extname(filePath).toLowerCase() !== ext) {
    throw new Error('Lokasi ekspor belum dipilih melalui dialog Simpan')
  }
  ekspor.delete(key)
  return filePath
}

export function resetIzinUntukUji(): void {
  proyek.clear()
  ekspor.clear()
}
