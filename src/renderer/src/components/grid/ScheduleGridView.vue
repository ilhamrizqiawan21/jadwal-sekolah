<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Scissors,
  RotateCcw,
  RotateCw,
  Search
} from 'lucide-vue-next'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useUiStore, SelectedCell } from '../../stores/uiStore'
import { parseCellJP, cellTextJP } from '@core/cell-parser'
import { SlotJam } from '@core/types'

const store = useScheduleStore()
const uiStore = useUiStore()

// State lokal editing sel
const editingCell = ref<SelectedCell | null>(null)
const editingText = ref<string>('')
const inputRef = ref<HTMLInputElement | null>(null)
const clipboardText = ref<string>('')

// Toast bentrok
const toastMessage = ref<string | null>(null)
let toastTimer: any = null

function showToast(msg: string): void {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = null
  }, 3500)
}

// Daftar kelas terurut
const kelasList = computed(() => store.proyek.master.kelas)

// Hari-hari aktif KBM
const activeHariList = computed(() => {
  return Object.entries(store.proyek.struktur_waktu.hari)
    .filter(([_, d]) => d.aktif)
    .map(([hari, d]) => ({
      nama: hari,
      judul: d.judul || hari.toUpperCase(),
      slots: d.slots
    }))
})

// Set kumpulan kode yang dikenal
const knownCodes = computed(() => {
  return new Set(store.proyek.master.penugasan.map((p) => p.kode.toUpperCase()))
})

// Indeks peta masalah per sel untuk lookup instan O(1)
const issuesByCellKey = computed(() => {
  const map: Record<string, string[]> = {}
  for (const issue of store.hasilPemeriksaan.masalah) {
    if (issue.sel && issue.sel.length > 0) {
      for (const s of issue.sel) {
        const key = `${s.hari}#${s.slot_id}#${s.kelas_id}`
        if (!map[key]) map[key] = []
        map[key].push(issue.pesan)
      }
    }
  }
  return map
})

// Peta penugasan berdasarkan kode untuk warna sel
const penugasanByCode = computed(() => {
  const map: Record<string, { warna?: string; guru_id?: string; guru_ids?: string[] }> = {}
  for (const p of store.proyek.master.penugasan) {
    map[p.kode.toUpperCase()] = {
      warna: p.warna,
      guru_id: p.guru_id,
      guru_ids: p.guru_ids
    }
  }
  return map
})

function getCellRaw(hari: string, slotId: string, kelasId: string): string {
  const cell = store.getCell(hari, slotId, kelasId)
  return cellTextJP(cell)
}

function hasClash(hari: string, slotId: string, kelasId: string): boolean {
  const key = `${hari}#${slotId}#${kelasId}`
  return Boolean(issuesByCellKey.value[key] && issuesByCellKey.value[key].length > 0)
}

function getClashTooltip(hari: string, slotId: string, kelasId: string): string {
  const key = `${hari}#${slotId}#${kelasId}`
  return issuesByCellKey.value[key]?.join('\n') || ''
}

function isHighlighted(hari: string, slotId: string, kelasId: string): boolean {
  if (!uiStore.highlightedGuruId) return false
  const cell = store.getCell(hari, slotId, kelasId)
  const allCodes = [...(cell[0] || []), ...(cell[1] || [])]
  for (const c of allCodes) {
    const p = penugasanByCode.value[c.toUpperCase()]
    if (p) {
      if (p.guru_id === uiStore.highlightedGuruId) return true
      if (p.guru_ids && p.guru_ids.includes(uiStore.highlightedGuruId)) return true
    }
  }
  return false
}

// ------------------------------------------------------------- Seleksi & Navigasi
function selectCell(hari: string, slotId: string, kelasId: string): void {
  if (editingCell.value) {
    commitEdit()
  }
  uiStore.setSelectedCell({ hari, slotId, kelasId })
}

function startEditing(hari: string, slotId: string, kelasId: string, initialChar?: string): void {
  uiStore.setSelectedCell({ hari, slotId, kelasId })
  editingCell.value = { hari, slotId, kelasId }
  const current = getCellRaw(hari, slotId, kelasId)
  editingText.value = initialChar !== undefined ? initialChar : current

  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function commitEdit(): void {
  if (!editingCell.value) return
  const { hari, slotId, kelasId } = editingCell.value
  const prevClashCount = store.hasilPemeriksaan.masalah.length

  const parsed = parseCellJP(editingText.value, knownCodes.value)
  store.setCell(hari, slotId, kelasId, parsed)

  // Cek apakah ada bentrok baru tercipta
  const newClashCount = store.hasilPemeriksaan.masalah.length
  if (newClashCount > prevClashCount) {
    const key = `${hari}#${slotId}#${kelasId}`
    const cellIssues = issuesByCellKey.value[key]
    if (cellIssues && cellIssues.length > 0) {
      showToast(`⚠️ Bentrok terdeteksi: ${cellIssues[0]}`)
    }
  }

  editingCell.value = null
}

function cancelEdit(): void {
  editingCell.value = null
}

// Navigasi Keyboard
function handleKeyDown(event: KeyboardEvent): void {
  // Jika sedang edit teks di input, biarkan Enter / Tab / Escape dihandle di input
  if (editingCell.value) return

  const cur = uiStore.selectedCell
  if (!cur) return

  // Pintasan Undo/Redo/Copy/Paste
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    store.undo()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    store.redo()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
    event.preventDefault()
    clipboardText.value = getCellRaw(cur.hari, cur.slotId, cur.kelasId)
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
    event.preventDefault()
    if (clipboardText.value !== undefined) {
      const parsed = parseCellJP(clipboardText.value, knownCodes.value)
      store.setCell(cur.hari, cur.slotId, cur.kelasId, parsed)
    }
    return
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    store.clearCell(cur.hari, cur.slotId, cur.kelasId)
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    startEditing(cur.hari, cur.slotId, cur.kelasId)
    return
  }

  // Tombol panah
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
    event.preventDefault()
    moveSelection(event.key)
    return
  }

  // Karakter alfanumerik biasa: langsung buka edit dengan karakter tersebut
  if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
    event.preventDefault()
    startEditing(cur.hari, cur.slotId, cur.kelasId, event.key)
  }
}

function moveSelection(direction: string): void {
  const cur = uiStore.selectedCell
  if (!cur) return

  // Flat list semua sel KBM
  const allKbmSlots: Array<{ hari: string; slotId: string }> = []
  for (const h of activeHariList.value) {
    for (const s of h.slots) {
      if (s.tipe === 'kbm') {
        allKbmSlots.push({ hari: h.nama, slotId: s.id })
      }
    }
  }

  const slotIdx = allKbmSlots.findIndex(
    (s) => s.hari === cur.hari && s.slotId === cur.slotId
  )
  const kelasIdx = kelasList.value.findIndex((k) => k.id === cur.kelasId)

  if (slotIdx === -1 || kelasIdx === -1) return

  let nextSlotIdx = slotIdx
  let nextKelasIdx = kelasIdx

  if (direction === 'ArrowUp' && slotIdx > 0) {
    nextSlotIdx--
  } else if (direction === 'ArrowDown' && slotIdx < allKbmSlots.length - 1) {
    nextSlotIdx++
  } else if (direction === 'ArrowLeft' && kelasIdx > 0) {
    nextKelasIdx--
  } else if (direction === 'ArrowRight' && kelasIdx < kelasList.value.length - 1) {
    nextKelasIdx++
  } else if (direction === 'Tab') {
    if (nextKelasIdx < kelasList.value.length - 1) {
      nextKelasIdx++
    } else if (nextSlotIdx < allKbmSlots.length - 1) {
      nextKelasIdx = 0
      nextSlotIdx++
    }
  }

  const targetSlot = allKbmSlots[nextSlotIdx]
  const targetKelas = kelasList.value[nextKelasIdx]
  if (targetSlot && targetKelas) {
    selectCell(targetSlot.hari, targetSlot.slotId, targetKelas.id)
    // Scroll view ke sel terpilih jika di luar viewport
    const el = document.getElementById(
      `cell-${targetSlot.hari}-${targetSlot.slotId}-${targetKelas.id}`
    )
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}

// Tangani event keyboard input saat edit sel
function onInputKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitEdit()
    moveSelection('ArrowDown')
  } else if (event.key === 'Tab') {
    event.preventDefault()
    commitEdit()
    moveSelection('Tab')
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelEdit()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div class="relative flex h-full w-full flex-col overflow-hidden bg-slate-900 select-none">
    <!-- Toolbar Kisi Jadwal -->
    <div class="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-2 text-xs">
      <div class="flex items-center space-x-3">
        <span class="font-semibold text-slate-300">Kisi Jadwal Pelajaran</span>
        <span class="text-slate-600">|</span>
        <span class="text-slate-400">
          {{ kelasList.length }} Kelas · {{ activeHariList.length }} Hari Belajar
        </span>
      </div>

      <div class="flex items-center space-x-2 text-slate-400">
        <button
          :disabled="!store.canUndo"
          @click="store.undo()"
          class="flex items-center space-x-1 rounded p-1.5 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          <span>Undo</span>
        </button>
        <button
          :disabled="!store.canRedo"
          @click="store.redo()"
          class="flex items-center space-x-1 rounded p-1.5 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
          title="Redo (Ctrl+Y)"
        >
          <RotateCw class="h-3.5 w-3.5" />
          <span>Redo</span>
        </button>
      </div>
    </div>

    <!-- Area Tabel Jadwal dengan Virtual Scroll & Sticky Headers -->
    <div class="flex-1 overflow-auto bg-slate-900">
      <table class="border-separate border-spacing-0 text-center text-xs">
        <!-- Header Kelas (Sticky Top) -->
        <thead class="sticky top-0 z-20 bg-slate-950">
          <tr>
            <th
              class="sticky left-0 top-0 z-30 w-24 border-b border-r border-slate-800 bg-slate-950 px-3 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            >
              Hari / Jam
            </th>
            <th
              class="sticky left-24 top-0 z-30 w-28 border-b border-r border-slate-800 bg-slate-950 px-2 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider"
            >
              Waktu KBM
            </th>
            <th
              v-for="kelas in kelasList"
              :key="kelas.id"
              class="min-w-[90px] border-b border-r border-slate-800 bg-slate-950/95 px-3 py-3 text-xs font-bold text-emerald-400"
            >
              {{ kelas.nama }}
            </th>
          </tr>
        </thead>

        <tbody>
          <template v-for="hari in activeHariList" :key="hari.nama">
            <template v-for="(slot, slotIdx) in hari.slots" :key="slot.id">
              <!-- Baris Slot Khusus: Upacara / Istirahat (Colspan penuh) -->
              <tr
                v-if="slot.tipe !== 'kbm'"
                class="bg-slate-950/40 text-slate-400"
              >
                <!-- Label Hari (Sticky Left, hanya di slot pertama hari itu) -->
                <td
                  v-if="slotIdx === 0"
                  :rowspan="hari.slots.length"
                  class="sticky left-0 z-10 border-b border-r border-slate-800 bg-slate-950 px-3 py-2 font-bold text-slate-200 uppercase tracking-wider text-center align-middle"
                >
                  {{ hari.nama }}
                </td>

                <td
                  class="sticky left-24 z-10 border-b border-r border-slate-800 bg-slate-950/90 px-2 py-1.5 font-mono text-[10px] text-slate-400"
                >
                  {{ slot.waktu[0] || '-' }}
                </td>

                <td
                  :colspan="kelasList.length"
                  class="border-b border-r border-slate-800/80 bg-amber-500/5 px-3 py-1.5 text-center text-[11px] font-medium text-amber-300/80 tracking-wide"
                >
                  — {{ slot.label || (slot.tipe === 'istirahat' ? 'Istirahat' : 'Upacara') }} —
                </td>
              </tr>

              <!-- Baris Slot KBM Reguler -->
              <tr v-else class="hover:bg-slate-900/40">
                <!-- Label Hari (Sticky Left, jika slotIdx === 0) -->
                <td
                  v-if="slotIdx === 0"
                  :rowspan="hari.slots.length"
                  class="sticky left-0 z-10 border-b border-r border-slate-800 bg-slate-950 px-3 py-2 font-bold text-slate-200 uppercase tracking-wider text-center align-middle"
                >
                  {{ hari.nama }}
                </td>

                <!-- Label Jam & Waktu KBM -->
                <td
                  class="sticky left-24 z-10 border-b border-r border-slate-800 bg-slate-950/90 px-2 py-2 text-center"
                >
                  <div class="font-bold text-slate-300 text-xs">{{ slot.id }}</div>
                  <div class="font-mono text-[10px] text-slate-400 leading-tight mt-0.5">
                    {{ slot.waktu[0] ? slot.waktu[0].split('-')[0] : '' }}
                  </div>
                </td>

                <!-- Sel Interaktif per Kelas -->
                <td
                  v-for="kelas in kelasList"
                  :key="kelas.id"
                  :id="`cell-${hari.nama}-${slot.id}-${kelas.id}`"
                  @click="selectCell(hari.nama, slot.id, kelas.id)"
                  @dblclick="startEditing(hari.nama, slot.id, kelas.id)"
                  :class="[
                    'relative h-10 border-b border-r border-slate-800/70 p-0 text-center font-mono text-xs font-semibold cursor-pointer transition-all',
                    // Sel Aktif Terpilih
                    uiStore.selectedCell?.hari === hari.nama &&
                    uiStore.selectedCell?.slotId === slot.id &&
                    uiStore.selectedCell?.kelasId === kelas.id
                      ? 'ring-2 ring-emerald-400 ring-inset bg-emerald-500/20 z-10'
                      : '',
                    // Sel Bentrok (Clash)
                    hasClash(hari.nama, slot.id, kelas.id)
                      ? 'bg-rose-500/20 text-rose-300 ring-2 ring-rose-500 ring-inset font-bold'
                      : '',
                    // Sorot Guru Aktif
                    isHighlighted(hari.nama, slot.id, kelas.id)
                      ? 'bg-amber-400/25 text-amber-200 ring-2 ring-amber-400 ring-inset'
                      : ''
                  ]"
                  :title="getClashTooltip(hari.nama, slot.id, kelas.id)"
                >
                  <!-- Mode Edit Langsung dalam Sel -->
                  <div
                    v-if="
                      editingCell?.hari === hari.nama &&
                      editingCell?.slotId === slot.id &&
                      editingCell?.kelasId === kelas.id
                    "
                    class="h-full w-full p-1"
                  >
                    <input
                      ref="inputRef"
                      v-model="editingText"
                      @keydown="onInputKeyDown"
                      @blur="commitEdit"
                      type="text"
                      class="h-full w-full rounded border border-emerald-400 bg-slate-950 px-1 text-center font-mono text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <!-- Mode Tampilan Normal -->
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center p-1"
                  >
                    <span
                      v-if="getCellRaw(hari.nama, slot.id, kelas.id)"
                      :class="[
                        'rounded px-1.5 py-0.5',
                        hasClash(hari.nama, slot.id, kelas.id)
                          ? 'text-rose-300 font-bold'
                          : 'text-slate-100'
                      ]"
                    >
                      {{ getCellRaw(hari.nama, slot.id, kelas.id) }}
                    </span>

                    <!-- Badge Peringatan Bentrok Kecil -->
                    <span
                      v-if="hasClash(hari.nama, slot.id, kelas.id)"
                      class="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-rose-500 animate-ping"
                    />
                  </div>
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Toast Peringatan Bentrok Non-Blocking (Muncul tanpa mencuri fokus input) -->
    <div
      v-if="toastMessage"
      class="pointer-events-none fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 rounded-xl border border-rose-500/40 bg-slate-950/95 px-4 py-3 text-xs text-rose-300 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-200"
    >
      <AlertTriangle class="h-4 w-4 text-rose-400 shrink-0" />
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>
