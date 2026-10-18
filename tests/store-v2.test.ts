import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScheduleStore } from '../src/renderer/src/stores/scheduleStore'
import { useNotifyStore } from '../src/renderer/src/stores/notifyStore'
import { buatProyekContoh } from '../src/core/sample-data'

describe('scheduleStore: perilaku riwayat dan penyimpanan', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('dimulai dari proyek kosong yang dianggap pristine', () => {
    const store = useScheduleStore()
    expect(store.isPristine).toBe(true)
    expect(store.proyek.master.kelas).toHaveLength(0)
  })

  it('setCell dengan isi yang sama tidak menambah riwayat atau menandai kotor', () => {
    const store = useScheduleStore()
    store.loadProjectData(buatProyekContoh(), '/x/a.jadwal')
    const sebelum = store.undoStack.length
    const isi = store.getCell('Senin', 'B1', 'c1')
    store.setCell('Senin', 'B1', 'c1', JSON.parse(JSON.stringify(isi)))
    store.setCell('Senin', 'B1', 'c1', [[], []]) // mengosongkan sel berisi adalah perubahan
    expect(store.undoStack.length).toBe(sebelum + 1)
    store.setCell('Senin', 'B1', 'c1', [[], []]) // sel sudah kosong
    expect(store.undoStack.length).toBe(sebelum + 1)
  })

  it('markSaved hanya membersihkan status kotor bila revisi masih sama', () => {
    const store = useScheduleStore()
    store.loadProjectData(buatProyekContoh(), '/x/a.jadwal')
    store.setCell('Senin', 'B1', 'c1', [['2'], ['2']])
    const revisi = store.revision
    store.setCell('Senin', 'B1', 'c2', [['3'], ['3']])
    store.markSaved(revisi)
    expect(store.dirty).toBe(true)
    store.markSaved()
    expect(store.dirty).toBe(false)
  })

  it('restoreFromSnapshot dapat dibatalkan dengan undo', () => {
    const store = useScheduleStore()
    store.loadProjectData(buatProyekContoh(), '/x/a.jadwal')
    const lama = store.proyek.meta.nama_sekolah
    const cadangan = buatProyekContoh()
    cadangan.meta.nama_sekolah = 'Versi Cadangan'
    store.restoreFromSnapshot(cadangan)
    expect(store.proyek.meta.nama_sekolah).toBe('Versi Cadangan')
    expect(store.dirty).toBe(true)
    store.undo()
    expect(store.proyek.meta.nama_sekolah).toBe(lama)
  })

  it('menghapus guru ikut membersihkan penugasan yatim dan wali kelas', () => {
    const store = useScheduleStore()
    store.loadProjectData(buatProyekContoh(), '/x/a.jadwal')
    store.proyek.master.kelas[0].wali_guru_id = 'g1'
    store.deleteGuru('g1')
    expect(store.proyek.master.penugasan.find((a) => a.guru_id === 'g1')).toBeUndefined()
    expect(store.proyek.master.kelas[0].wali_guru_id).toBeNull()
  })

  it('guru di penugasan tim dilepas tanpa menghapus penugasannya', () => {
    const store = useScheduleStore()
    store.loadProjectData(buatProyekContoh(), '/x/a.jadwal')
    store.proyek.master.penugasan[0].guru_ids = ['g1', 'g2']
    store.deleteGuru('g1')
    const a = store.proyek.master.penugasan.find((p) => p.id === 'a1')!
    expect(a.guru_id).toBe('g2')
    expect(a.guru_ids).toBeUndefined()
  })
})

describe('notifyStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('confirm mengembalikan true hanya bila dikonfirmasi', async () => {
    const n = useNotifyStore()
    const p = n.confirm({ title: 't', message: 'm' })
    n.answer('confirm')
    expect(await p).toBe(true)
    const q = n.confirm({ title: 't', message: 'm' })
    n.answer('cancel')
    expect(await q).toBe(false)
  })

  it('dialog baru membatalkan dialog sebelumnya', async () => {
    const n = useNotifyStore()
    const pertama = n.ask({ title: 'a', message: 'a' })
    const kedua = n.ask({ title: 'b', message: 'b' })
    expect(await pertama).toBe('cancel')
    n.answer('alt')
    expect(await kedua).toBe('alt')
  })

  it('toast dibatasi jumlahnya', () => {
    const n = useNotifyStore()
    for (let i = 0; i < 8; i++) n.info(`pesan ${i}`)
    expect(n.toasts.length).toBeLessThanOrEqual(4)
  })
})
