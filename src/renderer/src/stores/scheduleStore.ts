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
import { DEFAULT_PROJECT_NAME } from '../../../core/app-meta'

const MAX_HISTORY = 50

function createEmptyProject(jenjang: TingkatTingkat = 'SMP', polaHari: 5 | 6 = 5): ProyekData {
  return {
    format_version: 2,
    app_version: '2.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    meta: {
      nama_sekolah: DEFAULT_PROJECT_NAME,
      jenjang,
      jenis_lembaga: 'Lembaga Pendidikan',
      jenjang_custom: '',
      semester: 'GANJIL',
      tahun_pelajaran: '2026/2027',
      kota_tanggal: '',
      pejabat_ttd: {
        jabatan: 'Pimpinan Lembaga',
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

function parseJamMenit(value: string | undefined): number | null {
  const match = value?.match(/^(\d{1,2})[.:](\d{2})$/)
  if (!match) return null
  const jam = Number(match[1])
  const menit = Number(match[2])
  if (jam > 23 || menit > 59) return null
  return jam * 60 + menit
}

function formatJamMenit(totalMenit: number): string {
  const jam = Math.floor(totalMenit / 60) % 24
  const menit = totalMenit % 60
  return `${String(jam).padStart(2, '0')}.${String(menit).padStart(2, '0')}`
}

export const useScheduleStore = defineStore('schedule', () => {
  const proyek = ref<ProyekData>(createEmptyProject())
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

    // Slot yang dihapus atau diubah menjadi non-KBM tidak boleh meninggalkan
    // isi jadwal tersembunyi yang dapat muncul kembali saat ID slot dipakai ulang.
    for (const [hariName, jadwalHari] of Object.entries(proyek.value.jadwal)) {
      const strukturHari = sw.hari[hariName]
      const slotMap = new Map((strukturHari?.slots || []).map((slot) => [slot.id, slot]))

      for (const slotId of Object.keys(jadwalHari)) {
        const slot = slotMap.get(slotId)
        if (!slot || slot.tipe !== 'kbm') {
          delete jadwalHari[slotId]
          continue
        }

        for (const kelasId of Object.keys(jadwalHari[slotId])) {
          const cell = jadwalHari[slotId][kelasId] || [[], []]
          jadwalHari[slotId][kelasId] = [cell[0] || [], slot.jp.length > 1 ? cell[1] || [] : []]
        }
      }
    }

    runCheck()
  }

  function updateJumlahJpPerSesi(jpPerSesi: 1 | 2): { droppedJp: number } {
    const jumlahJp = jpPerSesi === 1 ? 1 : 2
    recordHistory()
    const current = proyek.value.struktur_waktu
    const nextHari: StrukturWaktu['hari'] = {}
    let droppedJp = 0

    for (const [hariName, hari] of Object.entries(current.hari)) {
      let nextJp = 1
      const nextSlots = hari.slots.map((slot) => {
        if (slot.tipe !== 'kbm') return slot

        const startMenit = parseJamMenit(slot.waktu[0]?.split('-')[0])
        const waktu = startMenit === null
          ? slot.waktu.slice(0, jumlahJp)
          : Array.from({ length: jumlahJp }, (_, index) => {
              const start = startMenit + index * current.durasi_jp_menit
              return `${formatJamMenit(start)}-${formatJamMenit(start + current.durasi_jp_menit)}`
            })
        const jp = Array.from({ length: jumlahJp }, () => nextJp++)

        const row = proyek.value.jadwal[hariName]?.[slot.id]
        if (row) {
          for (const kelasId of Object.keys(row)) {
            const cell = row[kelasId] || [[], []]
            if (jumlahJp === 1 && cell[1]?.length) droppedJp += cell[1].length
            row[kelasId] = [cell[0] || [], jumlahJp === 2 ? cell[1] || [] : []]
          }
        }

        return { ...slot, waktu, jp }
      })

      nextHari[hariName] = { ...hari, slots: nextSlots }
    }

    proyek.value.struktur_waktu = {
      ...current,
      jp_per_sesi: jumlahJp,
      hari: nextHari
    }
    runCheck()
    return { droppedJp }
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

    const codesToRemove = new Set<string>()
    const remainingAssignments = []
    for (const assignment of proyek.value.master.penugasan) {
      const holders =
        assignment.guru_ids && assignment.guru_ids.length > 0
          ? assignment.guru_ids
          : [assignment.guru_id]
      const remainingHolders = holders.filter((id) => id !== guruId)

      if (remainingHolders.length === 0) {
        codesToRemove.add(assignment.kode.toUpperCase())
        continue
      }

      if (assignment.guru_ids && assignment.guru_ids.length > 0) {
        remainingAssignments.push({
          ...assignment,
          guru_id: remainingHolders[0],
          guru_ids: remainingHolders
        })
      } else {
        remainingAssignments.push(assignment)
      }
    }
    proyek.value.master.penugasan = remainingAssignments

    const stillKnownCodes = new Set(
      remainingAssignments.map((assignment) => assignment.kode.toUpperCase())
    )
    removeCodesFromSchedule(
      Array.from(codesToRemove).filter((kode) => !stillKnownCodes.has(kode))
    )
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
    const removed = proyek.value.master.penugasan.find((a) => a.id === penugasanId)
    proyek.value.master.penugasan = proyek.value.master.penugasan.filter((a) => a.id !== penugasanId)
    if (removed) {
      const removedCode = removed.kode.toUpperCase()
      const stillUsed = proyek.value.master.penugasan.some(
        (assignment) => assignment.kode.toUpperCase() === removedCode
      )
      if (!stillUsed) removeCodesFromSchedule([removedCode])
    }
    runCheck()
  }

  function removeCodesFromSchedule(codes: string[]): void {
    const codeSet = new Set(codes)
    for (const hari of Object.keys(proyek.value.jadwal)) {
      for (const slotId of Object.keys(proyek.value.jadwal[hari])) {
        const slot = proyek.value.jadwal[hari][slotId]
        for (const kelasId of Object.keys(slot)) {
          const current = slot[kelasId]
          const next = current.map((jp) => jp.filter((kode) => !codeSet.has(kode.toUpperCase())))
          if (next.every((jp) => jp.length === 0)) {
            delete slot[kelasId]
          } else {
            slot[kelasId] = next
          }
        }
      }
    }
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
    updateJumlahJpPerSesi,
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
