import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  ProyekData,
  HasilPemeriksaan,
  CellContent,
  Kelas,
  Guru,
  Penugasan,
  Metadata,
  StrukturWaktu,
  TingkatTingkat
} from '../../../core/types'
import { periksa, preview } from '../../../core/checker'
import { getPresetStrukturWaktu } from '../../../core/default-presets'
import { createDummyProject } from '../../../core/dummy-data'

const MAX_HISTORY = 50

function createEmptyProject(jenjang: TingkatTingkat = 'SMP', polaHari: 5 | 6 = 5): ProyekData {
  return {
    format_version: 2,
    app_version: '2.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    meta: {
      nama_sekolah: 'Sekolah Baru',
      jenjang,
      semester: 'GANJIL',
      tahun_pelajaran: '2026/2027',
      kota_tanggal: '',
      pejabat_ttd: {
        jabatan: 'Kepala Sekolah',
        nama: '',
        nip: ''
      }
    },
    struktur_waktu: getPresetStrukturWaktu(jenjang, polaHari),
    master: {
      kelas: [],
      guru: [],
      penugasan: []
    },
    jadwal: {}
  }
}

export const useScheduleStore = defineStore('schedule', () => {
  const proyek = ref<ProyekData>(createDummyProject())
  const filePath = ref<string | null>(null)
  const dirty = ref<boolean>(false)
  const hasilPemeriksaan = ref<HasilPemeriksaan>(periksa(proyek.value))

  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const terpasang = computed(() => hasilPemeriksaan.value.terpasang)

  function runCheck(): void {
    hasilPemeriksaan.value = periksa(proyek.value)
  }

  function recordHistory(): void {
    undoStack.value.push(JSON.stringify(proyek.value))
    if (undoStack.value.length > MAX_HISTORY) {
      undoStack.value.shift()
    }
    redoStack.value = []
    dirty.value = true
  }

  function undo(): boolean {
    if (!canUndo.value) return false
    const previousState = undoStack.value.pop()!
    redoStack.value.push(JSON.stringify(proyek.value))
    proyek.value = JSON.parse(previousState)
    runCheck()
    dirty.value = true
    return true
  }

  function redo(): boolean {
    if (!canRedo.value) return false
    const nextState = redoStack.value.pop()!
    undoStack.value.push(JSON.stringify(proyek.value))
    proyek.value = JSON.parse(nextState)
    runCheck()
    dirty.value = true
    return true
  }

  // ----------------------------------------------------------- Inisialisasi & Berkas
  function initProjectFromPreset(jenjang: TingkatTingkat, polaHari: 5 | 6 = 5): void {
    recordHistory()
    proyek.value = createEmptyProject(jenjang, polaHari)
    filePath.value = null
    dirty.value = false
    runCheck()
  }

  function loadProjectData(data: ProyekData, path: string | null = null): void {
    proyek.value = data
    filePath.value = path
    undoStack.value = []
    redoStack.value = []
    dirty.value = false
    runCheck()
  }

  function loadDummyProject(): void {
    recordHistory()
    proyek.value = createDummyProject()
    filePath.value = null
    dirty.value = false
    runCheck()
  }

  function resetToEmptyProject(jenjang: TingkatTingkat = 'SMP', polaHari: 5 | 6 = 5): void {
    recordHistory()
    proyek.value = createEmptyProject(jenjang, polaHari)
    filePath.value = null
    dirty.value = false
    runCheck()
  }

  // --------------------------------------------------------------- Mutasi Kisi Jadwal
  function setCell(
    hari: string,
    slotId: string,
    kelasId: string,
    content: CellContent
  ): void {
    recordHistory()

    if (!proyek.value.jadwal[hari]) {
      proyek.value.jadwal[hari] = {}
    }
    if (!proyek.value.jadwal[hari][slotId]) {
      proyek.value.jadwal[hari][slotId] = {}
    }

    const hasContent = content.some((jp) => jp.length > 0)
    if (hasContent) {
      proyek.value.jadwal[hari][slotId][kelasId] = content
    } else {
      delete proyek.value.jadwal[hari][slotId][kelasId]
    }

    runCheck()
  }

  function clearCell(hari: string, slotId: string, kelasId: string): void {
    setCell(hari, slotId, kelasId, [[], []])
  }

  function getCell(
    hari: string,
    slotId: string,
    kelasId: string
  ): CellContent {
    return proyek.value.jadwal[hari]?.[slotId]?.[kelasId] || [[], []]
  }

  function previewInput(
    hari: string,
    slotId: string,
    kelasId: string,
    content: CellContent
  ): string[] {
    return preview(proyek.value, hari, slotId, kelasId, content)
  }

  // ------------------------------------------------------------- Mutasi Master Data
  function updateMetadata(meta: Partial<Metadata>): void {
    recordHistory()
    proyek.value.meta = { ...proyek.value.meta, ...meta }
    runCheck()
  }

  function updateStrukturWaktu(sw: StrukturWaktu): void {
    recordHistory()
    proyek.value.struktur_waktu = sw
    runCheck()
  }

  // Kelas
  function addKelas(kelas: Kelas): void {
    recordHistory()
    proyek.value.master.kelas.push(kelas)
    runCheck()
  }

  function updateKelas(kelas: Kelas): void {
    recordHistory()
    const idx = proyek.value.master.kelas.findIndex((k) => k.id === kelas.id)
    if (idx !== -1) {
      proyek.value.master.kelas[idx] = kelas
      runCheck()
    }
  }

  function deleteKelas(kelasId: string): void {
    recordHistory()
    proyek.value.master.kelas = proyek.value.master.kelas.filter((k) => k.id !== kelasId)
    // Hapus sel terkait di jadwal
    for (const h in proyek.value.jadwal) {
      for (const s in proyek.value.jadwal[h]) {
        delete proyek.value.jadwal[h][s][kelasId]
      }
    }
    // Hapus beban di penugasan
    for (const a of proyek.value.master.penugasan) {
      delete a.beban[kelasId]
    }
    runCheck()
  }

  function reorderKelas(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= proyek.value.master.kelas.length) return
    if (toIndex < 0 || toIndex >= proyek.value.master.kelas.length) return
    if (fromIndex === toIndex) return

    recordHistory()
    const item = proyek.value.master.kelas.splice(fromIndex, 1)[0]
    proyek.value.master.kelas.splice(toIndex, 0, item)

    // Re-index urutan 1..N
    proyek.value.master.kelas.forEach((k, idx) => {
      k.urutan = idx + 1
    })
    runCheck()
  }

  // Guru
  function addGuru(guru: Guru): void {
    recordHistory()
    proyek.value.master.guru.push(guru)
    runCheck()
  }

  function updateGuru(guru: Guru): void {
    recordHistory()
    const idx = proyek.value.master.guru.findIndex((g) => g.id === guru.id)
    if (idx !== -1) {
      proyek.value.master.guru[idx] = guru
      runCheck()
    }
  }

  function deleteGuru(guruId: string): void {
    recordHistory()
    proyek.value.master.guru = proyek.value.master.guru.filter((g) => g.id !== guruId)
    // Hapus wali kelas
    for (const k of proyek.value.master.kelas) {
      if (k.wali_guru_id === guruId) k.wali_guru_id = null
    }
    runCheck()
  }

  // Penugasan / Beban
  function addPenugasan(penugasan: Penugasan): void {
    recordHistory()
    proyek.value.master.penugasan.push(penugasan)
    runCheck()
  }

  function updatePenugasan(penugasan: Penugasan): void {
    recordHistory()
    const idx = proyek.value.master.penugasan.findIndex((a) => a.id === penugasan.id)
    if (idx !== -1) {
      proyek.value.master.penugasan[idx] = penugasan
      runCheck()
    }
  }

  function deletePenugasan(penugasanId: string): void {
    recordHistory()
    proyek.value.master.penugasan = proyek.value.master.penugasan.filter(
      (a) => a.id !== penugasanId
    )
    runCheck()
  }

  return {
    proyek,
    filePath,
    dirty,
    hasilPemeriksaan,
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    terpasang,
    undo,
    redo,
    initProjectFromPreset,
    loadProjectData,
    loadDummyProject,
    resetToEmptyProject,
    setCell,
    clearCell,
    getCell,
    previewInput,
    updateMetadata,
    updateStrukturWaktu,
    addKelas,
    updateKelas,
    deleteKelas,
    reorderKelas,
    addGuru,
    updateGuru,
    deleteGuru,
    addPenugasan,
    updatePenugasan,
    deletePenugasan,
    runCheck
  }
})
