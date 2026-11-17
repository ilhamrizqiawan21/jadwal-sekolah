import { describe, expect, it } from 'vitest'
import { ensureFilePath, ensureWithinRoots } from '../src/main/path-guards'

describe('IPC path guards', () => {
  it('menormalisasi path dan memeriksa ekstensi yang diharapkan', () => {
    expect(ensureFilePath('C:/data/jadwal.jadwal', '.jadwal')).toMatch(/jadwal\.jadwal$/i)
    expect(ensureFilePath('C:/data/jadwal', '.jadwal', true)).toMatch(/jadwal\.jadwal$/i)
    expect(() => ensureFilePath('C:/data/jadwal.txt', '.jadwal')).toThrow(/ekstensi/i)
  })

  it('menolak path kosong dan folder di luar root yang diizinkan', () => {
    expect(() => ensureFilePath('   ')).toThrow(/jalur berkas/i)
    expect(ensureWithinRoots('C:/data/cadangan/file.tmp', ['C:/data'])).toMatch(/file\.tmp$/i)
    expect(() => ensureWithinRoots('C:/other/file.tmp', ['C:/data'])).toThrow(/diizinkan/i)
  })
})
