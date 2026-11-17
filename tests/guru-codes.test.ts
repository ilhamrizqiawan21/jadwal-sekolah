import { describe, it, expect } from 'vitest'
import { getGuruCode, getGuruCodes } from '../src/core/guru-codes'

describe('guru-codes', () => {
  it('menggunakan kode prefiks guru dan fallback ke id', () => {
    expect(getGuruCode({ id: 'g1', kode_prefiks: ' G01 ' })).toBe('G01')
    expect(getGuruCode({ id: 'g2' })).toBe('g2')
  })

  it('menggabungkan kode guru untuk team teaching', () => {
    expect(
      getGuruCodes(
        [
          { id: 'g1', nama: 'Guru Satu', kode_prefiks: 'G01', tidak_bisa: {} },
          { id: 'g2', nama: 'Guru Dua', kode_prefiks: 'G02', tidak_bisa: {} }
        ],
        ['g1', 'g2']
      )
    ).toBe('G01 & G02')
  })
})
