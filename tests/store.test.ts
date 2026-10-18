import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScheduleStore } from '../src/renderer/src/stores/scheduleStore'
import { useUiStore } from '../src/renderer/src/stores/uiStore'
import { getPresetStrukturWaktu } from '../src/core/default-presets'

describe('Pinia Stores (scheduleStore & uiStore)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('uiStore mengelola tema, tab aktif, dan sel yang dipilih', () => {
    const ui = useUiStore()
    expect(ui.theme).toBe('dark')

    ui.toggleTheme()
    expect(ui.theme).toBe('light')

    ui.setActiveTab('beban')
    expect(ui.activeTab).toBe('beban')

    ui.setSelectedCell({ hari: 'Senin', slotId: 'B1', kelasId: 'c1' })
    expect(ui.selectedCell).toEqual({ hari: 'Senin', slotId: 'B1', kelasId: 'c1' })
  })

  it('scheduleStore terinisialisasi dengan preset dan menghitung validasi awal', () => {
    const store = useScheduleStore()
    expect(store.proyek).toBeDefined()
    expect(store.proyek.format_version).toBe(2)
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)
    expect(store.dirty).toBe(false)
  })

  it('mengubah sel jadwal mencatat riwayat undo dan memperbarui hasil pemeriksaan', () => {
    const store = useScheduleStore()
    store.initProjectFromPreset('SMP', 5)

    // Tambah master data guru & kelas & penugasan
    store.addKelas({ id: 'c1', nama: '7A', urutan: 1 })
    store.addGuru({ id: 'g1', nama: 'Guru Matematika', tidak_bisa: {} })
    store.addPenugasan({
      id: 'a1',
      guru_id: 'g1',
      kode: '1',
      mapel: 'Matematika',
      beban: { c1: 2 }
    })

    expect(store.canUndo).toBe(true)

    // Pasang kode 1 di Senin B1
    store.setCell('Senin', 'B1', 'c1', [['1'], ['1']])
    expect(store.proyek.jadwal.Senin.B1.c1).toEqual([['1'], ['1']])
    expect(store.dirty).toBe(true)
    expect(store.terpasang['1:c1']).toBe(2)

    // Verifikasi kuota terpenuhi (beban_kurang hilang)
    const bebanKurang = store.hasilPemeriksaan.masalah.filter((m) => m.jenis === 'beban_kurang')
    expect(bebanKurang.length).toBe(0)
  })

  it('menerapkan Command Pattern Undo/Redo dengan snapshot identik', () => {
    const store = useScheduleStore()
    store.initProjectFromPreset('SMP', 5)
    store.addKelas({ id: 'c1', nama: '7A', urutan: 1 })
    store.addGuru({ id: 'g1', nama: 'Guru IPA', tidak_bisa: {} })
    store.addPenugasan({
      id: 'a1',
      guru_id: 'g1',
      kode: 'IPA-1',
      mapel: 'IPA',
      beban: { c1: 2 }
    })

    // Snapshot awal sebelum ubah sel
    const initialJadwalState = JSON.stringify(store.proyek.jadwal)

    // Lakukan mutasi sel
    store.setCell('Senin', 'B1', 'c1', [['IPA-1'], ['IPA-1']])
    const mutatedJadwalState = JSON.stringify(store.proyek.jadwal)
    expect(mutatedJadwalState).not.toBe(initialJadwalState)

    // 1. Undo
    expect(store.canUndo).toBe(true)
    store.undo()
    expect(JSON.stringify(store.proyek.jadwal)).toBe(initialJadwalState)

    // 2. Redo
    expect(store.canRedo).toBe(true)
    store.redo()
    expect(JSON.stringify(store.proyek.jadwal)).toBe(mutatedJadwalState)

    // 3. Undo kembali
    store.undo()
    expect(JSON.stringify(store.proyek.jadwal)).toBe(initialJadwalState)
  })

  it('membatasi riwayat undo maksimal 50 langkah', () => {
    const store = useScheduleStore()
    store.initProjectFromPreset('SMP', 5)
    store.addKelas({ id: 'c1', nama: '7A', urutan: 1 })

    // Lakukan 60 mutasi
    for (let i = 1; i <= 60; i++) {
      store.setCell('Senin', 'B1', 'c1', [[`K${i}`], [`K${i}`]])
    }

    // Stack undo maksimal 50
    expect(store.undoStack.length).toBe(50)
  })

  it('dapat mengubah urutan kelas (reorderKelas) dan mencatat undo', () => {
    const store = useScheduleStore()
    store.initProjectFromPreset('SMP', 5)
    store.addKelas({ id: 'c1', nama: '7A', urutan: 1 })
    store.addKelas({ id: 'c2', nama: '7B', urutan: 2 })
    store.addKelas({ id: 'c3', nama: '7C', urutan: 3 })

    // Pindahkan 7C (index 2) ke posisi pertama (index 0)
    store.reorderKelas(2, 0)
    expect(store.proyek.master.kelas.map((k) => k.nama)).toEqual(['7C', '7A', '7B'])
    expect(store.proyek.master.kelas[0].urutan).toBe(1)
    expect(store.proyek.master.kelas[1].urutan).toBe(2)
    expect(store.proyek.master.kelas[2].urutan).toBe(3)

    // Undo mengembalikan urutan semula
    store.undo()
    expect(store.proyek.master.kelas.map((k) => k.nama)).toEqual(['7A', '7B', '7C'])
  })
})
