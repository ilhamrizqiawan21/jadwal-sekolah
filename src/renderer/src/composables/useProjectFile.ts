import { ref, watch } from 'vue'
import type { ProyekData, InfoCadangan, BerkasTerbaru } from '@core/types'
import { useScheduleStore } from '../stores/scheduleStore'
import { useUiStore } from '../stores/uiStore'
import { useNotifyStore, pesanGalat } from '../stores/notifyStore'

const AUTOSAVE_INTERVAL_MS = 60_000

// State dipakai bersama oleh seluruh komponen
const isSaving = ref(false)
const isExporting = ref(false)
const saveError = ref<string | null>(null)
const lastSavedAt = ref<Date | null>(null)
const backups = ref<InfoCadangan[]>([])
const backupsLoading = ref(false)
const recent = ref<BerkasTerbaru[]>([])

let timer: ReturnType<typeof setInterval> | null = null
let disposers: Array<() => void> = []

function getApi(): NonNullable<Window['api']> | null {
  return typeof window !== 'undefined' && window.api ? window.api : null
}

export function useProjectFile() {
  const store = useScheduleStore()
  const ui = useUiStore()
  const notify = useNotifyStore()

  const snapshot = (): ProyekData => JSON.parse(JSON.stringify(store.proyek))

  function requireApi(): NonNullable<Window['api']> | null {
    const api = getApi()
    if (!api) notify.info('Fitur ini tersedia pada aplikasi desktop')
    return api
  }

  function namaDasar(): string {
    const slug = (store.proyek.meta.nama_sekolah || 'jadwal-sekolah')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return slug || 'jadwal-sekolah'
  }

  // ----------------------------------------------------------------------- Simpan
  async function saveProjectAs(): Promise<boolean> {
    const api = requireApi()
    if (!api) return false
    try {
      const rev = store.revision
      const path = await api.saveProjectAs(`${namaDasar()}.jadwal`, snapshot())
      if (!path) return false
      store.markSaved(rev, path)
      saveError.value = null
      lastSavedAt.value = new Date()
      await api.clearDraft()
      notify.success('Berkas berhasil disimpan', path)
      return true
    } catch (err) {
      saveError.value = pesanGalat(err)
      notify.error('Gagal menyimpan berkas', saveError.value)
      return false
    }
  }

  async function saveProject(): Promise<boolean> {
    const api = requireApi()
    if (!api) return false
    if (!store.filePath) return saveProjectAs()
    if (isSaving.value) return false
    isSaving.value = true
    try {
      const rev = store.revision
      await api.saveProject(store.filePath, snapshot(), false)
      store.markSaved(rev)
      saveError.value = null
      lastSavedAt.value = new Date()
      await api.clearDraft()
      notify.success('Perubahan tersimpan')
      return true
    } catch (err) {
      saveError.value = pesanGalat(err)
      notify.error('Gagal menyimpan berkas', saveError.value)
      return false
    } finally {
      isSaving.value = false
    }
  }

  /** Bila ada perubahan belum tersimpan, tanya pengguna. true = boleh lanjut. */
  async function confirmLeaveDirty(aksi: string): Promise<boolean> {
    if (!store.dirty) return true
    const hasil = await notify.ask({
      title: 'Ada perubahan yang belum disimpan',
      message: `Simpan dulu sebelum ${aksi}?`,
      confirmLabel: 'Simpan',
      altLabel: 'Jangan Simpan',
      cancelLabel: 'Batal'
    })
    if (hasil === 'cancel') return false
    if (hasil === 'alt') return true
    return saveProject()
  }

  async function openProject(): Promise<void> {
    const api = requireApi()
    if (!api) return
    if (!(await confirmLeaveDirty('membuka berkas lain'))) return
    try {
      const res = await api.openProject()
      if (!res) return
      store.loadProjectData(res.data, res.filePath)
      lastSavedAt.value = null
      await api.clearDraft()
      ui.setActiveTab('jadwal')
      notify.success('Berkas berhasil dibuka', res.filePath)
    } catch (err) {
      notify.error('Gagal membuka berkas', pesanGalat(err))
    }
  }

  async function bukaHasil(res: { filePath: string; data: ProyekData } | null): Promise<void> {
    if (!res) return
    store.loadProjectData(res.data, res.filePath)
    lastSavedAt.value = null
    await getApi()?.clearDraft()
    ui.setActiveTab('jadwal')
    notify.success('Berkas berhasil dibuka', res.filePath)
  }

  async function openRecent(filePath: string): Promise<void> {
    const api = requireApi()
    if (!api) return
    if (!(await confirmLeaveDirty('membuka berkas lain'))) return
    try {
      await bukaHasil(await api.openRecent(filePath))
    } catch (err) {
      notify.error('Gagal membuka berkas', pesanGalat(err))
      await refreshRecent()
    }
  }

  /** Berkas yang dibuka dari luar aplikasi (klik dua kali .jadwal di Explorer). */
  async function openPending(): Promise<void> {
    const api = getApi()
    if (!api) return
    try {
      const res = await api.takePendingOpen()
      if (!res) return
      if (!(await confirmLeaveDirty('membuka berkas lain'))) return
      await bukaHasil(res)
    } catch (err) {
      notify.error('Gagal membuka berkas', pesanGalat(err))
    }
  }

  async function refreshRecent(): Promise<void> {
    const api = getApi()
    recent.value = api ? await api.listRecent().catch(() => []) : []
  }

  async function clearRecent(): Promise<void> {
    await getApi()?.clearRecent()
    recent.value = []
  }

  // ------------------------------------------------------------------ Simpan otomatis
  async function autosaveTick(): Promise<void> {
    const api = getApi()
    if (!api || !store.dirty || isSaving.value) return
    const rev = store.revision
    const data = snapshot()
    try {
      if (ui.autoSaveEnabled && store.filePath) {
        isSaving.value = true
        await api.saveProject(store.filePath, data, true)
        store.markSaved(rev)
        lastSavedAt.value = new Date()
        saveError.value = null
        if (!store.dirty) await api.clearDraft()
      } else {
        await api.saveDraft(data)
      }
    } catch (err) {
      saveError.value = pesanGalat(err)
    } finally {
      isSaving.value = false
    }
  }

  function startAutosave(): void {
    stopAutosave()
    timer = setInterval(autosaveTick, AUTOSAVE_INTERVAL_MS)
    const api = getApi()
    if (!api) return

    disposers.push(api.onOpenRequested(() => void openPending()))
    disposers.push(watch(() => store.dirty, (d) => void api.setDirty(d), { immediate: true }))
    disposers.push(
      api.onCloseRequested(async () => {
        const hasil = await notify.ask({
          title: 'Tutup aplikasi?',
          message: 'Ada perubahan yang belum disimpan.',
          confirmLabel: 'Simpan dan Tutup',
          altLabel: 'Tutup Tanpa Menyimpan',
          cancelLabel: 'Kembali'
        })
        if (hasil === 'cancel') return
        if (hasil === 'confirm' && !(await saveProject())) return
        if (hasil === 'alt') await api.clearDraft()
        await api.confirmClose()
      })
    )
  }

  function stopAutosave(): void {
    if (timer) clearInterval(timer)
    timer = null
    disposers.forEach((d) => d())
    disposers = []
  }

  async function offerRecovery(): Promise<void> {
    const api = getApi()
    if (!api || !store.isPristine) return
    try {
      const draft = await api.loadDraft()
      if (!draft) return
      const waktu = new Date(draft.savedAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
      const pulihkan = await notify.confirm({
        title: 'Pulihkan pekerjaan sebelumnya?',
        message: `Ditemukan pekerjaan yang belum tersimpan (${draft.data.meta.nama_sekolah}, ${waktu}). Aplikasi mungkin tertutup tidak wajar.`,
        confirmLabel: 'Pulihkan',
        cancelLabel: 'Buang'
      })
      if (pulihkan) {
        store.loadProjectData(draft.data, null)
        store.dirty = true
        store.revision++
        notify.success('Pekerjaan berhasil dipulihkan', 'Simpan ke berkas agar tidak hilang.')
      } else {
        await api.clearDraft()
      }
    } catch {
      // draf rusak atau tidak terbaca: abaikan dan mulai dari awal
    }
  }

  // ------------------------------------------------------------------------ Ekspor
  async function exportFile(kind: 'xlsx' | 'pdf'): Promise<void> {
    const api = requireApi()
    if (!api || isExporting.value) return
    try {
      const target = await api.chooseExportTarget(kind, namaDasar())
      if (!target) return
      isExporting.value = true
      if (kind === 'xlsx') await api.exportExcel(target, snapshot())
      else await api.exportPdf(target, snapshot())
      notify.success(kind === 'xlsx' ? 'Ekspor Excel selesai' : 'Dokumen PDF selesai dibuat', target)
    } catch (err) {
      notify.error(kind === 'xlsx' ? 'Gagal ekspor Excel' : 'Gagal membuat PDF', pesanGalat(err))
    } finally {
      isExporting.value = false
    }
  }

  // ---------------------------------------------------------------------- Cadangan
  async function refreshBackups(): Promise<void> {
    const api = getApi()
    if (!api || !store.filePath) {
      backups.value = []
      return
    }
    backupsLoading.value = true
    try {
      backups.value = await api.listBackups(store.filePath)
    } catch (err) {
      backups.value = []
      notify.error('Gagal membaca daftar cadangan', pesanGalat(err))
    } finally {
      backupsLoading.value = false
    }
  }

  async function createSnapshotNow(): Promise<void> {
    const api = requireApi()
    if (!api) return
    if (!store.filePath && !(await saveProjectAs())) return
    try {
      await api.createSnapshot(store.filePath!, snapshot())
      notify.success('Cadangan manual dibuat')
      await refreshBackups()
    } catch (err) {
      notify.error('Gagal membuat cadangan', pesanGalat(err))
    }
  }

  async function restoreBackup(info: InfoCadangan): Promise<void> {
    const api = requireApi()
    if (!api || !store.filePath) return
    const waktu = new Date(info.createdAt).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    })
    const ok = await notify.confirm({
      title: 'Pulihkan dari cadangan ini?',
      message: `Isi jadwal akan diganti dengan versi ${waktu}. Kondisi saat ini disimpan dulu sebagai cadangan manual, dan langkah ini masih bisa dibatalkan dengan Undo.`,
      confirmLabel: 'Pulihkan'
    })
    if (!ok) return
    try {
      const data = await api.readBackup(store.filePath, info.path)
      await api.createSnapshot(store.filePath, snapshot())
      store.restoreFromSnapshot(data)
      notify.success('Cadangan dipulihkan', 'Tekan Ctrl+S untuk menyimpan hasil pemulihan.')
      await refreshBackups()
    } catch (err) {
      notify.error('Gagal memulihkan cadangan', pesanGalat(err))
    }
  }

  async function restoreFromFile(): Promise<void> {
    const api = requireApi()
    if (!api) return
    try {
      const res = await api.importBackupFile()
      if (!res) return
      const ok = await notify.confirm({
        title: 'Ganti jadwal dengan isi berkas ini?',
        message: `Isi jadwal saat ini akan diganti dengan "${res.fileName}". Langkah ini masih bisa dibatalkan dengan Undo.`,
        confirmLabel: 'Ganti'
      })
      if (!ok) return
      if (store.filePath) await api.createSnapshot(store.filePath, snapshot()).catch(() => undefined)
      store.restoreFromSnapshot(res.data)
      notify.success('Isi berkas berhasil dipulihkan')
      await refreshBackups()
    } catch (err) {
      notify.error('Gagal memulihkan dari berkas', pesanGalat(err))
    }
  }

  async function deleteBackup(info: InfoCadangan): Promise<void> {
    const api = requireApi()
    if (!api || !store.filePath) return
    const ok = await notify.confirm({
      title: 'Hapus cadangan ini?',
      message: 'Berkas cadangan akan dihapus permanen dari komputer.',
      confirmLabel: 'Hapus',
      danger: true
    })
    if (!ok) return
    try {
      await api.deleteBackup(store.filePath, info.path)
      notify.success('Cadangan dihapus')
      await refreshBackups()
    } catch (err) {
      notify.error('Gagal menghapus cadangan', pesanGalat(err))
    }
  }

  async function revealBackupFolder(): Promise<void> {
    const api = requireApi()
    if (!api || !store.filePath) return
    try {
      await api.revealBackupFolder(store.filePath)
    } catch (err) {
      notify.error('Folder cadangan tidak dapat dibuka', pesanGalat(err))
    }
  }

  return {
    isSaving,
    isExporting,
    saveError,
    lastSavedAt,
    backups,
    backupsLoading,
    hasApi: () => getApi() !== null,
    recent,
    openRecent,
    openPending,
    refreshRecent,
    clearRecent,
    openProject,
    saveProject,
    saveProjectAs,
    confirmLeaveDirty,
    startAutosave,
    stopAutosave,
    offerRecovery,
    exportFile,
    refreshBackups,
    createSnapshotNow,
    restoreBackup,
    restoreFromFile,
    deleteBackup,
    revealBackupFolder
  }
}
