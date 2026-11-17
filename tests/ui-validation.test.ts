import { describe, expect, it } from 'vitest'
import { canApplyCodeToCell, validateRequiredField, validateTeamTeaching } from '../src/core/ui-validation'

describe('Validasi interaksi operator', () => {
  it('memberi pesan yang jelas untuk kolom wajib kosong', () => {
    expect(validateRequiredField('', 'Nama guru')).toBe('Nama guru wajib diisi.')
    expect(validateRequiredField('  ', 'Kode mapel')).toBe('Kode mapel wajib diisi.')
    expect(validateRequiredField('Matematika', 'Mata pelajaran')).toBeNull()
  })

  it('mengharuskan minimal dua guru untuk Team Teaching', () => {
    expect(validateTeamTeaching([])).toBe('Team Teaching memerlukan minimal 2 guru.')
    expect(validateTeamTeaching(['g1'])).toBe('Team Teaching memerlukan minimal 2 guru.')
    expect(validateTeamTeaching(['g1', 'g2'])).toBeNull()
  })

  it('hanya mengizinkan pengisian kode jika ada sel jadwal yang dipilih', () => {
    expect(canApplyCodeToCell(null)).toBe(false)
    expect(canApplyCodeToCell({ hari: '', slotId: 'B1', kelasId: 'c1' })).toBe(false)
    expect(canApplyCodeToCell({ hari: 'Senin', slotId: 'B1', kelasId: 'c1' })).toBe(true)
  })
})
