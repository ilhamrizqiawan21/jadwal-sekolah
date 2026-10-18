export interface OpsiGambar {
  /** Sisi terpanjang hasil (piksel). Gambar yang lebih kecil tidak diperbesar. */
  maksDimensi: number
  maksBytes?: number
}

const FORMAT_DIDUKUNG = /^image\/(png|jpe?g)$/

/**
 * Membaca berkas gambar dari input, memvalidasi jenis dan ukurannya, lalu
 * memperkecil agar berkas jadwal tidak membengkak. Melempar Error berpesan jelas.
 */
export async function bacaGambarSebagaiDataUrl(file: File, opsi: OpsiGambar): Promise<string> {
  if (!FORMAT_DIDUKUNG.test(file.type)) throw new Error('Gunakan berkas gambar PNG atau JPG.')
  if (file.size > (opsi.maksBytes ?? 5 * 1024 * 1024)) throw new Error('Ukuran gambar melebihi batas 5 MB.')

  const sumber = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Berkas gambar tidak dapat dibaca.'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Isi berkas bukan gambar yang valid.'))
    el.src = sumber
  })

  const skala = Math.min(1, opsi.maksDimensi / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * skala))
  const h = Math.max(1, Math.round(img.height * skala))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return sumber
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/png')
}
