import { describe, it, expect } from 'vitest'
import { parseCell, parseCellJP, cellText, cellTextJP } from '../src/core/cell-parser'

describe('cell-parser', () => {
  const knownCodes = new Set(['26A', '24A', '6', '3/15A', '3', 'MTK-1', 'IPA-2'])

  it('menguraikan kode tunggal', () => {
    expect(parseCell('26a', knownCodes)).toEqual(['26A'])
    expect(parseCell('MTK-1', knownCodes)).toEqual(['MTK-1'])
  })

  it('menguraikan multiple kode dengan pemisah slash atau koma', () => {
    expect(parseCell('24A/6', knownCodes)).toEqual(['24A', '6'])
    expect(parseCell('24a, 6', knownCodes)).toEqual(['24A', '6'])
  })

  it('mengenali greedy code yang mengandung slash jika ada di daftar kode', () => {
    expect(parseCell('3/15A', knownCodes)).toEqual(['3/15A'])
    expect(parseCell('3/15A/6', knownCodes)).toEqual(['3/15A', '6'])
  })

  it('mempertahankan kode tidak dikenal agar ketikan operator tidak hilang', () => {
    expect(parseCell('zzz', knownCodes)).toEqual(['ZZZ'])
    expect(parseCell('', knownCodes)).toEqual([])
    expect(parseCell('   ', knownCodes)).toEqual([])
  })

  it('menguraikan pemisah split JP dengan tanda pipa (|)', () => {
    expect(parseCellJP('24A|6', knownCodes)).toEqual([['24A'], ['6']])
    expect(parseCellJP('24A', knownCodes)).toEqual([['24A'], ['24A']])
    expect(parseCellJP('', knownCodes)).toEqual([[], []])
  })

  it('mengonversi daftar kode kembali menjadi teks', () => {
    expect(cellText(['24A', '6'])).toBe('24A/6')
    expect(cellText([])).toBe('')
    expect(cellTextJP([['24A'], ['24A']])).toBe('24A')
    expect(cellTextJP([['24A'], ['6']])).toBe('24A|6')
  })
})
