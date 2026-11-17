import { describe, expect, it } from 'vitest'
import { buildSlotTiming, createSlotId, getDefaultSlotLabel, getSlotOperatorLabel, validateHariSlots } from '../src/core/session-config'
import { HariKBM, SlotJam } from '../src/core/types'

function makeKbmSlot(overrides: Partial<SlotJam> = {}): SlotJam {
  return {
    id: 'B1',
    tipe: 'kbm',
    label: 'Sesi 1',
    waktu: ['07.00-08.20'],
    jp: [1, 2],
    ...overrides
  }
}

describe('Konfigurasi Sesi KBM', () => {
  it('membuat ID internal otomatis tanpa meminta operator menulis kode', () => {
    const next = createSlotId(
      [
        { id: 'B1', tipe: 'kbm' },
        { id: 'B2', tipe: 'kbm' },
        { id: 'JD1', tipe: 'jeda' }
      ],
      'kbm'
    )

    expect(next).toBe('B3')
    expect(getDefaultSlotLabel('kbm', 2)).toBe('Sesi KBM 3')
    expect(getDefaultSlotLabel('jeda', 1)).toBe('Istirahat 2')
  })

  it('menampilkan label sesi yang ramah operator tanpa membocorkan ID teknis', () => {
    expect(getSlotOperatorLabel(makeKbmSlot({ id: 'B7', label: '' }), 3)).toBe('Sesi 3')
    expect(getSlotOperatorLabel(makeKbmSlot({ id: 'B7', label: 'Literasi' }), 3)).toBe('Sesi 3 · Literasi')
    expect(getSlotOperatorLabel(makeKbmSlot({ id: 'B7', tipe: 'jeda', label: 'ISTIRAHAT' }), 0)).toBe('ISTIRAHAT')
  })

  it('menghitung ulang waktu sesi 2 JP dari jam mulai dan durasi JP', () => {
    const next = buildSlotTiming(makeKbmSlot(), '07.15', '', 40)

    expect(next.waktu).toEqual(['07.15-07.55', '07.55-08.35'])
    expect(next.jp).toEqual([1, 2])
  })

  it('menghitung sesi non-KBM dari rentang waktu manual', () => {
    const next = buildSlotTiming(
      makeKbmSlot({ id: 'JD1', tipe: 'jeda', jp: [], waktu: ['09.40-10.00'] }),
      '09.45',
      '10.10',
      40
    )

    expect(next.waktu).toEqual(['09.45-10.10'])
    expect(next.jp).toEqual([])
  })

  it('mendeteksi ID slot ganda dan waktu yang saling tumpang tindih', () => {
    const hari: HariKBM = {
      aktif: true,
      judul: 'SENIN',
      slots: [
        makeKbmSlot({ id: 'B1', waktu: ['07.00-08.20'] }),
        makeKbmSlot({ id: 'B1', waktu: ['08.00-09.20'] })
      ]
    }

    expect(validateHariSlots(hari)).toEqual([
      'ID sesi "B1" digunakan lebih dari sekali.',
      'Waktu sesi "B1" bertumpuk dengan sesi "B1".'
    ])
  })
})
