import { describe, it, expect } from 'vitest'
import { getPresetStrukturWaktu } from '../src/core/default-presets'

describe('default-presets', () => {
  it('menghasilkan preset SD 5 hari dengan durasi 35 menit per JP', () => {
    const sw = getPresetStrukturWaktu('SD', 5)
    expect(sw.pola_hari).toBe(5)
    expect(sw.durasi_jp_menit).toBe(35)
    expect(Object.keys(sw.hari)).toHaveLength(5)
    expect(sw.hari['Senin'].slots.length).toBeGreaterThan(0)
    expect(sw.hari['Sabtu']).toBeUndefined()
  })

  it('menghasilkan preset SMA 6 hari dengan durasi 45 menit per JP', () => {
    const sw = getPresetStrukturWaktu('SMA', 6)
    expect(sw.pola_hari).toBe(6)
    expect(sw.durasi_jp_menit).toBe(45)
    expect(Object.keys(sw.hari)).toHaveLength(6)
    expect(sw.hari['Sabtu']).toBeDefined()
    expect(sw.hari['Sabtu'].aktif).toBe(true)
  })

  it('menyediakan slot KBM dan jeda istirahat yang terstruktur', () => {
    const sw = getPresetStrukturWaktu('SMP', 5)
    const seninSlots = sw.hari['Senin'].slots
    const kbmSlots = seninSlots.filter((s) => s.tipe === 'kbm')
    const jedaSlots = seninSlots.filter((s) => s.tipe === 'jeda')
    expect(kbmSlots.length).toBeGreaterThanOrEqual(4)
    expect(jedaSlots.length).toBeGreaterThanOrEqual(1)
  })
})
