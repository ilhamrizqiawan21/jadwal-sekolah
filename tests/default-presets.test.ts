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

  it('tidak membuat slot Jumat bertumpuk pada preset SMA/SMK', () => {
    const sw = getPresetStrukturWaktu('SMA', 5)
    const slots = sw.hari['Jumat'].slots
    const ranges = slots.map((slot) => {
      const first = slot.waktu[0].split('-')[0]
      const last = slot.waktu[slot.waktu.length - 1].split('-')[1]
      return [first, last]
    })

    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i][0] >= ranges[i - 1][1]).toBe(true)
    }
  })

  it('mendukung konfigurasi waktu kustom untuk jenjang atau lembaga lain', () => {
    const sw = getPresetStrukturWaktu('LAINNYA', 6, {
      durasiJP: 50,
      blokPerHari: 3,
      jamMulaiMenit: 8 * 60,
      jedaSetelahBlok: [1],
      tambahkanTutupJumat: false
    })

    expect(sw.durasi_jp_menit).toBe(50)
    expect(sw.hari['Selasa'].slots[0].waktu[0]).toBe('08.00-08.50')
    expect(sw.hari['Selasa'].slots.filter((slot) => slot.tipe === 'kbm')).toHaveLength(3)
    expect(sw.hari['Jumat'].slots.some((slot) => slot.id === 'TUTUP')).toBe(false)
  })

  it('menyimpan konfigurasi satu sesi KBM sebagai 2 JP secara eksplisit', () => {
    const sw = getPresetStrukturWaktu('SMP', 5, { jpPerSesi: 2 })
    const sesiPertama = sw.hari['Selasa'].slots.find((slot) => slot.tipe === 'kbm')!

    expect(sw.jp_per_sesi).toBe(2)
    expect(sesiPertama.jp).toEqual([1, 2])
    expect(sesiPertama.waktu).toHaveLength(2)
  })

  it('dapat membentuk sesi KBM satu JP bila lembaga membutuhkannya', () => {
    const sw = getPresetStrukturWaktu('LAINNYA', 5, { jpPerSesi: 1, blokPerHari: 3 })
    const sesiPertama = sw.hari['Selasa'].slots.find((slot) => slot.tipe === 'kbm')!

    expect(sw.jp_per_sesi).toBe(1)
    expect(sesiPertama.jp).toEqual([1])
    expect(sesiPertama.waktu).toHaveLength(1)
  })
})
