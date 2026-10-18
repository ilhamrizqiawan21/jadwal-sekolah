import { describe, it, expect } from 'vitest'
import { parseCell, parseCellJP, cellText, cellTextJP, ambilTokenAktif } from '../src/core/cell-parser'

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

  describe('ambilTokenAktif (ekstraksi token untuk autocomplete)', () => {
    it('mengambil seluruh teks sebagai token saat kode tunggal', () => {
      expect(ambilTokenAktif('4A', 2)).toEqual({ token: '4A', start: 0, end: 2 })
      expect(ambilTokenAktif('4A', 0)).toEqual({ token: '4A', start: 0, end: 2 })
    })

    it('membatasi token pada pemisah multi-kode saat kursor di token kedua', () => {
      // "4A/6" dengan kursor di akhir -> token aktif adalah "6"
      expect(ambilTokenAktif('4A/6', 4)).toEqual({ token: '6', start: 3, end: 4 })
      // kursor di tengah "4A" (indeks 1) -> token aktif tetap "4A"
      expect(ambilTokenAktif('4A/6', 1)).toEqual({ token: '4A', start: 0, end: 2 })
    })

    it('membatasi token pada pemisah split JP (|)', () => {
      // "13|23" dengan kursor di akhir -> token aktif adalah "23"
      expect(ambilTokenAktif('13|23', 5)).toEqual({ token: '23', start: 3, end: 5 })
      // kursor tepat setelah "13" (sebelum '|') -> token aktif adalah "13"
      expect(ambilTokenAktif('13|23', 2)).toEqual({ token: '13', start: 0, end: 2 })
    })

    it('menangani kursor di tengah teks campuran (multi-kode + split JP)', () => {
      // "4A/6|9B" kursor di tengah "6" (indeks 4) -> token aktif "6"
      expect(ambilTokenAktif('4A/6|9B', 4)).toEqual({ token: '6', start: 3, end: 4 })
      // kursor di tengah "9B" (indeks 6) -> token aktif "9B"
      expect(ambilTokenAktif('4A/6|9B', 6)).toEqual({ token: '9B', start: 5, end: 7 })
    })

    it('mengembalikan token kosong jika kursor tepat di pemisah atau teks kosong', () => {
      expect(ambilTokenAktif('', 0)).toEqual({ token: '', start: 0, end: 0 })
      expect(ambilTokenAktif('4A/', 3)).toEqual({ token: '', start: 3, end: 3 })
    })

    it('mengganti token aktif tanpa mengganggu kode lain dalam multi-kode atau split-JP', () => {
      // Kasus 1: token kedua pada multi-kode "4A/ASTRI" diganti dengan "26A"
      const text1 = '4A/ASTRI'
      const { start: s1, end: e1 } = ambilTokenAktif(text1, text1.length)
      const replaced1 = `${text1.slice(0, s1)}26A${text1.slice(e1)}`
      expect(replaced1).toBe('4A/26A')

      // Kasus 2: token kedua pada split-JP "13|PJOK" diganti dengan "27"
      const text2 = '13|PJOK'
      const { start: s2, end: e2 } = ambilTokenAktif(text2, text2.length)
      const replaced2 = `${text2.slice(0, s2)}27${text2.slice(e2)}`
      expect(replaced2).toBe('13|27')

      // Kasus 3: token pertama pada multi-kode "PJOK/24A" diganti dengan "27"
      const text3 = 'PJOK/24A'
      const { start: s3, end: e3 } = ambilTokenAktif(text3, 2)
      const replaced3 = `${text3.slice(0, s3)}27${text3.slice(e3)}`
      expect(replaced3).toBe('27/24A')
    })
  })
})
