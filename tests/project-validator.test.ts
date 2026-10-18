import { describe, it, expect } from 'vitest'
import { validasiProyek, pastikanProyekValid } from '../src/core/project-validator'
import { buatProyekContoh } from '../src/core/sample-data'

describe('validasiProyek', () => {
  it('menerima proyek contoh yang utuh', () => {
    expect(validasiProyek(buatProyekContoh())).toEqual({ ok: true, errors: [] })
  })

  it('menolak masukan yang bukan objek', () => {
    expect(validasiProyek(null).ok).toBe(false)
    expect(validasiProyek([]).ok).toBe(false)
    expect(validasiProyek('teks').ok).toBe(false)
  })

  it('menolak bagian wajib yang hilang', () => {
    const p: any = buatProyekContoh()
    delete p.master
    delete p.jadwal
    const hasil = validasiProyek(p)
    expect(hasil.ok).toBe(false)
    expect(hasil.errors.join(' ')).toContain('master')
    expect(hasil.errors.join(' ')).toContain('jadwal')
  })

  it('menolak guru tanpa id', () => {
    const p: any = buatProyekContoh()
    p.master.guru[0] = { nama: 'Tanpa Id' }
    expect(validasiProyek(p).ok).toBe(false)
  })

  it('menolak kunci berbahaya prototype pollution', () => {
    const p: any = JSON.parse(JSON.stringify(buatProyekContoh()))
    p.jadwal = JSON.parse('{"__proto__": {"x": {}}}')
    expect(validasiProyek(p).ok).toBe(false)
  })

  it('menolak gambar base64 yang terlalu besar', () => {
    const p: any = buatProyekContoh()
    p.meta.logo_base64 = 'A'.repeat(3_000_001)
    expect(validasiProyek(p).ok).toBe(false)
  })

  it('pastikanProyekValid melempar galat berpesan jelas', () => {
    expect(() => pastikanProyekValid({})).toThrow(/tidak valid atau rusak/)
  })
})

import { periksa } from '../src/core/checker'

describe('buatProyekContoh', () => {
  it('menghasilkan jadwal contoh tanpa bentrok dan tanpa data nyata', () => {
    const p = buatProyekContoh()
    const hasil = periksa(p)
    expect(hasil.masalah.filter((m) => m.tingkat === 'error')).toEqual([])
    expect(hasil.masalah.filter((m) => m.tingkat === 'info')).toEqual([])
    expect(JSON.stringify(p)).not.toMatch(/ihsan|batujajar|lina/i)
    expect(p.meta.logo_base64 ?? '').toBe('')
    expect(p.meta.kop_base64 ?? '').toBe('')
  })
})

import { renggangkanLabel } from '../src/core/label-format'

describe('renggangkanLabel', () => {
  it('merenggangkan huruf dan menjaga jarak antar kata', () => {
    expect(renggangkanLabel('Istirahat')).toBe('I S T I R A H A T')
    expect(renggangkanLabel('upacara bendera')).toBe('U P A C A R A   B E N D E R A')
    expect(renggangkanLabel('')).toBe('')
  })
})
