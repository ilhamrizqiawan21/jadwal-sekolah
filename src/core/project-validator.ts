import { ProyekData } from './types'

export interface HasilValidasiProyek {
  ok: boolean
  errors: string[]
}

const KUNCI_TERLARANG = new Set(['__proto__', 'constructor', 'prototype'])
const MAKS_PANJANG_TEKS = 2000
const MAKS_GAMBAR_BASE64 = 3_000_000

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function kunciAman(obj: Record<string, unknown>, lokasi: string, errors: string[]): void {
  for (const k of Object.keys(obj)) {
    if (KUNCI_TERLARANG.has(k)) errors.push(`Kunci tidak diizinkan pada ${lokasi}: "${k}"`)
  }
}

/**
 * Memeriksa bentuk berkas proyek hasil parse JSON sebelum dipakai aplikasi.
 * Fungsi murni: tidak mengubah masukan, hanya mengembalikan daftar galat.
 */
export function validasiProyek(raw: unknown): HasilValidasiProyek {
  const errors: string[] = []

  if (!isObj(raw)) {
    return { ok: false, errors: ['Isi berkas bukan objek proyek yang valid'] }
  }

  if (typeof raw.format_version !== 'number') errors.push('format_version tidak ditemukan')

  const meta = raw.meta
  if (!isObj(meta)) {
    errors.push('Bagian "meta" tidak ditemukan')
  } else {
    if (typeof meta.nama_sekolah !== 'string') errors.push('meta.nama_sekolah harus berupa teks')
    for (const [k, v] of Object.entries(meta)) {
      if (typeof v === 'string') {
        const batas = k.endsWith('_base64') ? MAKS_GAMBAR_BASE64 : MAKS_PANJANG_TEKS
        if (v.length > batas) errors.push(`meta.${k} terlalu panjang`)
      }
    }
  }

  const sw = raw.struktur_waktu
  if (!isObj(sw) || !isObj(sw.hari)) {
    errors.push('Bagian "struktur_waktu.hari" tidak ditemukan')
  } else {
    kunciAman(sw.hari, 'struktur_waktu.hari', errors)
    for (const [hari, h] of Object.entries(sw.hari)) {
      if (!isObj(h) || !Array.isArray(h.slots)) {
        errors.push(`Hari "${hari}" tidak memiliki daftar slot`)
        continue
      }
      for (const s of h.slots) {
        if (!isObj(s) || typeof s.id !== 'string' || typeof s.tipe !== 'string') {
          errors.push(`Slot pada hari "${hari}" tidak lengkap`)
          break
        }
      }
    }
  }

  const master = raw.master
  if (!isObj(master)) {
    errors.push('Bagian "master" tidak ditemukan')
  } else {
    for (const bagian of ['kelas', 'guru', 'penugasan'] as const) {
      if (!Array.isArray(master[bagian])) errors.push(`master.${bagian} harus berupa daftar`)
    }
    if (Array.isArray(master.kelas)) {
      for (const k of master.kelas) {
        if (!isObj(k) || typeof k.id !== 'string' || typeof k.nama !== 'string') {
          errors.push('Ada data kelas tanpa id atau nama')
          break
        }
      }
    }
    if (Array.isArray(master.guru)) {
      for (const g of master.guru) {
        if (!isObj(g) || typeof g.id !== 'string' || typeof g.nama !== 'string') {
          errors.push('Ada data guru tanpa id atau nama')
          break
        }
      }
    }
    if (Array.isArray(master.penugasan)) {
      for (const p of master.penugasan) {
        if (
          !isObj(p) ||
          typeof p.id !== 'string' ||
          typeof p.kode !== 'string' ||
          !isObj(p.beban)
        ) {
          errors.push('Ada data penugasan yang tidak lengkap')
          break
        }
        kunciAman(p.beban, 'beban penugasan', errors)
      }
    }
  }

  const jadwal = raw.jadwal
  if (!isObj(jadwal)) {
    errors.push('Bagian "jadwal" tidak ditemukan')
  } else {
    kunciAman(jadwal, 'jadwal', errors)
    for (const slots of Object.values(jadwal)) {
      if (!isObj(slots)) {
        errors.push('Struktur jadwal rusak')
        break
      }
      kunciAman(slots, 'jadwal', errors)
      for (const kelas of Object.values(slots)) {
        if (!isObj(kelas)) {
          errors.push('Struktur jadwal rusak')
          break
        }
        kunciAman(kelas, 'jadwal', errors)
      }
    }
  }

  return { ok: errors.length === 0, errors }
}

/** Versi yang melempar galat berpesan jelas, dipakai saat memuat berkas dari disk. */
export function pastikanProyekValid(raw: unknown): ProyekData {
  const hasil = validasiProyek(raw)
  if (!hasil.ok) {
    const ringkas = hasil.errors.slice(0, 3).join('; ')
    throw new Error(`Berkas jadwal tidak valid atau rusak: ${ringkas}`)
  }
  return raw as ProyekData
}
