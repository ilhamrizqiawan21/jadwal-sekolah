import { describe, it, expect, beforeEach } from 'vitest'
import path from 'path'
import {
  izinkanProyek,
  pastikanProyekDiizinkan,
  izinkanEkspor,
  ambilIzinEkspor,
  resetIzinUntukUji
} from '../src/main/file-access'

const abs = (n: string) => path.resolve('/tmp', n)

describe('kontrol akses berkas dari renderer', () => {
  beforeEach(resetIzinUntukUji)

  it('menolak jalur proyek yang belum dipilih lewat dialog', () => {
    expect(() => pastikanProyekDiizinkan(abs('a.jadwal'))).toThrow(/dialog/)
  })

  it('menerima jalur proyek yang sudah dipilih', () => {
    izinkanProyek(abs('a.jadwal'))
    expect(pastikanProyekDiizinkan(abs('a.jadwal'))).toBe(abs('a.jadwal'))
  })

  it('menolak jalur relatif, bukan teks, dan ekstensi lain', () => {
    expect(() => pastikanProyekDiizinkan('a.jadwal')).toThrow()
    expect(() => pastikanProyekDiizinkan(42)).toThrow()
    izinkanProyek(abs('rahasia.txt'))
    expect(() => pastikanProyekDiizinkan(abs('rahasia.txt'))).toThrow(/\.jadwal/)
  })

  it('traversal tidak lolos karena jalur dinormalisasi', () => {
    izinkanProyek(abs('a.jadwal'))
    expect(() => pastikanProyekDiizinkan(abs('x/../b.jadwal'))).toThrow()
    expect(pastikanProyekDiizinkan(abs('x/../a.jadwal'))).toBeTruthy()
  })

  it('izin ekspor hanya sekali pakai dan terikat ekstensi', () => {
    izinkanEkspor(abs('a.xlsx'), '.xlsx')
    expect(() => ambilIzinEkspor(abs('a.xlsx'), '.pdf')).toThrow()
    expect(ambilIzinEkspor(abs('a.xlsx'), '.xlsx')).toBe(abs('a.xlsx'))
    expect(() => ambilIzinEkspor(abs('a.xlsx'), '.xlsx')).toThrow()
  })
})
