<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Copy,
  Scissors,
  RotateCcw,
  RotateCw,
  Search,
  PanelLeftOpen,
  PanelRightOpen,
  PanelRightClose,
  Maximize2,
  Minimize2
} from 'lucide-vue-next'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useUiStore, SelectedCell } from '../../stores/uiStore'
import { parseCellJP, cellTextJP, ambilTokenAktif } from '@core/cell-parser'
import { SlotJam, Penugasan } from '@core/types'

const store = useScheduleStore()
const uiStore = useUiStore()

// State lokal editing sel
const editingCell = ref<SelectedCell | null>(null)
const editingText = ref<string>('')
const inputRef = ref<HTMLInputElement | HTMLInputElement[] | null>(null)
const clipboardText = ref<string>('')

function getInputEl(): HTMLInputElement | null {
  if (!inputRef.value) return null
  if (Array.isArray(inputRef.value)) {
    return (inputRef.value[0] as HTMLInputElement) || null
  }
  return inputRef.value as HTMLInputElement
}

// State lokal autocomplete saran kode inline (ADR-0008)
interface SaranKode {
  kode: string
  guruNama: string
  mapel: string
  sisaJp: number
}
const showSuggestions = ref(false)
const suggestionList = ref<SaranKode[]>([])
const activeSuggestionIndex = ref(-1)
const suggestionPos = ref<{ top: number; left: number } | null>(null)

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
        const key = `${s[0]}#${s[1]}#${s[2]}`
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
      warna: p.warna_sel,
      guru_id: p.guru_id,
      guru_ids: p.guru_ids
    }
  }
  return map
})

// Peta nama guru untuk tampilan saran autocomplete
const namaGuruMap = computed(() => {
  const map = new Map<string, string>()
  for (const g of store.proyek.master.guru) map.set(g.id, g.nama)
  return map
})

// Jumlah error & total masalah untuk badge toolbar
const errorCount = computed(() => {
  return store.hasilPemeriksaan.masalah.filter((m) => m.tingkat === 'error').length
})
const totalIssueCount = computed(() => {
  return store.hasilPemeriksaan.masalah.length
})

// Daftar hari yang ditampilkan (filter per hari untuk tampilan fokus & besar)
const displayedHariList = computed(() => {
  if (!uiStore.selectedHariFilter || uiStore.selectedHariFilter === 'all') {
    return activeHariList.value
  }
  return activeHariList.value.filter(
    (h) => h.nama.toLowerCase() === uiStore.selectedHariFilter.toLowerCase()
  )
})

// Cek apakah mode tampilan besar & fokus aktif
const isLargeView = computed(() => uiStore.gridDensity === 'large')

// Peta detail penugasan untuk tampilan sel mode besar (kode -> mapel, guru, warna)
const penugasanDetailsByCode = computed(() => {
  const map = new Map<string, { mapel: string; guru: string; warna?: string }>()
  for (const p of store.proyek.master.penugasan) {
    const gids = p.guru_ids && p.guru_ids.length > 0 ? p.guru_ids : (p.guru_id ? [p.guru_id] : [])
    const guru = gids.map((id) => namaGuruMap.value.get(id) || '').filter(Boolean).join(' & ')
    map.set(p.kode.toUpperCase(), {
      mapel: p.mapel,
      guru,
      warna: p.warna_sel
    })
  }
  return map
})

// Ambil detail token kode untuk ditampilkan di sel mode besar
function getCellTokenDetails(raw: string): Array<{ kode: string; mapel: string; guru: string }> {
  if (!raw) return []
  const tokens = raw.split(/[\s/|]+/).map((t) => t.trim().toUpperCase()).filter(Boolean)
  return tokens.map((token) => {
    const detail = penugasanDetailsByCode.value.get(token)
    return {
      kode: token,
      mapel: detail?.mapel || '',
      guru: detail?.guru || ''
    }
  })
}

// Fungsi ganti filter hari & otomatis sesuaikan sel aktif serta densitas
function selectHariFilter(hari: string): void {
  uiStore.setSelectedHariFilter(hari)
  if (hari !== 'all') {
    // Mode harian otomatis membesarkan sel agar fokus dan nyaman
    uiStore.setGridDensity('large')
    const targetHari = activeHariList.value.find((h) => h.nama.toLowerCase() === hari.toLowerCase())
    if (targetHari) {
      const firstKbm = targetHari.slots.find((s) => s.tipe === 'kbm')
      const firstKelas = kelasList.value[0]
      if (firstKbm && firstKelas) {
        if (uiStore.selectedCell?.hari.toLowerCase() !== hari.toLowerCase()) {
          selectCell(targetHari.nama, firstKbm.id, firstKelas.id)
        }
      }
    }
  } else {
    uiStore.setGridDensity('compact')
  }
}

function getSisaJpKelas(p: Penugasan, kelasId?: string): number {
  if (!kelasId) {
    const totalBeban = Object.values(p.beban).reduce((sum, b) => sum + (b || 0), 0)
    let terpasangTotal = 0
    for (const k of store.proyek.master.kelas) {
      terpasangTotal += store.terpasang[`${p.kode.toUpperCase()}:${k.id}`] || 0
    }
    return totalBeban - terpasangTotal
  }
  const target = p.beban[kelasId] || 0
  const terpasang = store.terpasang[`${p.kode.toUpperCase()}:${kelasId}`] || 0
  return target - terpasang
}

// Filter kandidat saran dari penugasan: prefix match kode, atau substring match nama guru/mapel
function computeSuggestions(token: string): SaranKode[] {
  const q = token.trim().toUpperCase()
  if (!q) return []

  const activeKelasId = editingCell.value?.kelasId
  const matched: Array<{ p: Penugasan; guruNama: string; prefixMatch: boolean }> = []

  for (const p of store.proyek.master.penugasan) {
    const kodeUpper = p.kode.toUpperCase()
    const gids = p.guru_ids && p.guru_ids.length > 0 ? p.guru_ids : (p.guru_id ? [p.guru_id] : [])
    const guruNama = gids.map((id) => namaGuruMap.value.get(id) || '?').join(' & ')

    const prefixMatch = kodeUpper.startsWith(q)
    const guruMatch = guruNama.toUpperCase().includes(q)
    const mapelMatch = p.mapel.toUpperCase().includes(q)

    if (prefixMatch || guruMatch || mapelMatch) {
      matched.push({ p, guruNama, prefixMatch })
    }
  }

  matched.sort((a, b) => {
    if (a.prefixMatch !== b.prefixMatch) return a.prefixMatch ? -1 : 1
    return a.p.kode.localeCompare(b.p.kode)
  })

  // Hitung sisa JP hanya untuk 8 kandidat terpilih (optimasi beban & spesifik kelas aktif)
  return matched.slice(0, 8).map((m) => ({
    kode: m.p.kode,
    guruNama: m.guruNama,
    mapel: m.p.mapel,
    sisaJp: getSisaJpKelas(m.p, activeKelasId)
  }))
}

function closeSuggestions(): void {
  showSuggestions.value = false
  suggestionList.value = []
  activeSuggestionIndex.value = -1
  suggestionPos.value = null
}

function updateSuggestionPosition(): void {
  const el = getInputEl()
  if (!el) {
    suggestionPos.value = null
    return
  }
  const rect = el.getBoundingClientRect()
  const DROPDOWN_HEIGHT = 240
  const DROPDOWN_WIDTH = 256
  let top = rect.bottom + 2
  let left = rect.left

  // Jika meluap ke bawah viewport, render di atas input sel
  if (top + DROPDOWN_HEIGHT > window.innerHeight && rect.top > DROPDOWN_HEIGHT) {
    top = Math.max(8, rect.top - DROPDOWN_HEIGHT - 2)
  }
  // Jika meluap ke kanan viewport, geser ke kiri
  if (left + DROPDOWN_WIDTH > window.innerWidth) {
    left = Math.max(8, window.innerWidth - DROPDOWN_WIDTH - 8)
  }

  suggestionPos.value = { top, left }
}

// Dipanggil setiap keystroke di input sel (lihat ADR-0008) — hanya filter
// atas computed yang sudah ter-cache, menjaga Tier 1 NFR < 5ms (ADR-0007).
function onCellInput(): void {
  const el = getInputEl()
  const caret = el ? el.selectionStart ?? editingText.value.length : editingText.value.length
  const { token } = ambilTokenAktif(editingText.value, caret)
  const sugg = computeSuggestions(token)
  const exactSingle = sugg.length === 1 && sugg[0].kode.toUpperCase() === token.trim().toUpperCase()

  if (!token.trim() || sugg.length === 0 || exactSingle) {
    closeSuggestions()
    return
  }

  suggestionList.value = sugg
  activeSuggestionIndex.value = -1
  updateSuggestionPosition()
  showSuggestions.value = true
}

// Menerapkan saran terpilih: ganti hanya token yang sedang diketik, sisa isi sel tetap
function applySuggestion(item: SaranKode | undefined): void {
  const el = getInputEl()
  if (!item || !el) {
    closeSuggestions()
    return
  }
  const caret = el.selectionStart ?? editingText.value.length
  const { start, end } = ambilTokenAktif(editingText.value, caret)
  const before = editingText.value.slice(0, start)
  const after = editingText.value.slice(end)
  editingText.value = `${before}${item.kode}${after}`
  closeSuggestions()

  nextTick(() => {
    const input = getInputEl()
    const newCaret = before.length + item.kode.length
    input?.setSelectionRange(newCaret, newCaret)
    input?.focus()
  })
}

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
  closeSuggestions()

  nextTick(() => {
    const input = getInputEl()
    input?.focus()
    input?.select()
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
  closeSuggestions()
}

function cancelEdit(): void {
  editingCell.value = null
  closeSuggestions()
}

// Navigasi Keyboard
function handleKeyDown(event: KeyboardEvent): void {
  // Jika fokus sedang di input teks, textarea, select, atau modal wizard terbuka, jangan bajak input
  const target = event.target as HTMLElement | null
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  ) {
    return
  }
  if (uiStore.isWizardOpen) return

  // Jika sedang edit teks di input sel, biarkan Enter / Tab / Escape dihandle di input
  if (editingCell.value) return

  // Pintasan ganti filter hari (dapat dipanggil kapan saja tanpa harus ada sel aktif)
  if (event.altKey && !event.ctrlKey && !event.metaKey) {
    if (event.key === '1') {
      event.preventDefault()
      selectHariFilter('all')
      return
    }
    const dayIdx = parseInt(event.key, 10) - 2
    if (dayIdx >= 0 && dayIdx < activeHariList.value.length) {
      event.preventDefault()
      selectHariFilter(activeHariList.value[dayIdx].nama)
      return
    }
  }

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

  // Tombol Tab dan Shift+Tab
  if (event.key === 'Tab') {
    event.preventDefault()
    moveSelection(event.shiftKey ? 'ShiftTab' : 'Tab')
    return
  }

  // Tombol panah
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
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

  // Flat list semua sel KBM pada hari yang sedang ditampilkan
  const allKbmSlots: Array<{ hari: string; slotId: string }> = []
  for (const h of displayedHariList.value) {
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
  } else if (direction === 'ShiftTab') {
    if (nextKelasIdx > 0) {
      nextKelasIdx--
    } else if (nextSlotIdx > 0) {
      nextKelasIdx = kelasList.value.length - 1
      nextSlotIdx--
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

// Tangani event keyboard input saat edit sel (termasuk navigasi dropdown saran, ADR-0008)
function onInputKeyDown(event: KeyboardEvent): void {
  if (showSuggestions.value && suggestionList.value.length > 0) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (activeSuggestionIndex.value === -1) {
        activeSuggestionIndex.value = 0
      } else {
        activeSuggestionIndex.value = (activeSuggestionIndex.value + 1) % suggestionList.value.length
      }
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (activeSuggestionIndex.value <= 0) {
        activeSuggestionIndex.value = -1
      } else {
        activeSuggestionIndex.value--
      }
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      if (activeSuggestionIndex.value >= 0 && activeSuggestionIndex.value < suggestionList.value.length) {
        applySuggestion(suggestionList.value[activeSuggestionIndex.value])
      }
      commitEdit()
      moveSelection(event.key === 'Enter' ? 'ArrowDown' : 'Tab')
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSuggestions()
      return
    }
  }

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
  <div class="relative flex h-full w-full flex-col overflow-hidden bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100 select-none">
    <!-- Toolbar Kisi Jadwal Responsif -->
    <div class="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/90 px-3 py-2 text-xs shrink-0">
      <!-- Kolom Kiri: Toggle Sidebar, Judul, & Filter Hari -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Tombol Buka Sidebar jika Collapsed -->
        <button
          v-if="uiStore.isLeftSidebarCollapsed"
          @click="uiStore.toggleLeftSidebar"
          class="flex items-center justify-center rounded-lg p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800 transition-colors mr-0.5"
          title="Buka Sidebar Navigasi (Ctrl+B)"
        >
          <PanelLeftOpen class="h-4 w-4" />
        </button>

        <span class="font-bold text-slate-700 dark:text-slate-200 text-xs hidden sm:inline">Kisi Jadwal</span>
        <span class="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

        <!-- Segmented Tab Pemilih Hari (Fokus Harian) -->
        <div class="flex items-center rounded-xl bg-slate-200/70 p-0.5 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <button
            @click="selectHariFilter('all')"
            :class="[
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
              uiStore.selectedHariFilter === 'all'
                ? 'bg-white text-emerald-700 shadow-xs dark:bg-emerald-600 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            ]"
            title="Tampilkan semua hari pembelajaran (Alt+1)"
          >
            Semua Hari
          </button>
          <button
            v-for="(hari, idx) in activeHariList"
            :key="hari.nama"
            @click="selectHariFilter(hari.nama)"
            :class="[
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all capitalize',
              uiStore.selectedHariFilter.toLowerCase() === hari.nama.toLowerCase()
                ? 'bg-white text-emerald-700 shadow-xs dark:bg-emerald-600 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            ]"
            :title="`Fokus ke jadwal hari ${hari.nama} (Alt+${idx + 2})`"
          >
            {{ hari.nama }}
          </button>
        </div>
      </div>

      <!-- Kolom Kanan: Mode Ukuran/Densitas, Undo/Redo, & Toggle Panel Masalah -->
      <div class="flex items-center space-x-2 text-slate-500 dark:text-slate-400 ml-auto">
        <!-- Toggle Ukuran Tampilan Sel: Kompak vs Besar & Fokus -->
        <div class="flex items-center rounded-xl bg-slate-200/70 p-0.5 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <button
            @click="uiStore.setGridDensity('compact')"
            :class="[
              'flex items-center space-x-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all',
              !isLargeView
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            ]"
            title="Tampilan kisi sel kompak (tinggi 40px)"
          >
            <Minimize2 class="h-3 w-3" />
            <span class="hidden md:inline">Kompak</span>
          </button>
          <button
            @click="uiStore.setGridDensity('large')"
            :class="[
              'flex items-center space-x-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all',
              isLargeView
                ? 'bg-white text-emerald-700 shadow-xs dark:bg-emerald-600 dark:text-white font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            ]"
            title="Tampilan kisi sel besar & fokus rincian mapel (tinggi 64px)"
          >
            <Maximize2 class="h-3 w-3" />
            <span class="hidden md:inline">Besar & Fokus</span>
          </button>
        </div>

        <div class="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

        <!-- Undo & Redo -->
        <button
          :disabled="!store.canUndo"
          @click="store.undo()"
          class="flex items-center space-x-1 rounded-lg p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          <span class="hidden lg:inline text-[11px]">Undo</span>
        </button>
        <button
          :disabled="!store.canRedo"
          @click="store.redo()"
          class="flex items-center space-x-1 rounded-lg p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <RotateCw class="h-3.5 w-3.5" />
          <span class="hidden lg:inline text-[11px]">Redo</span>
        </button>

        <div class="h-4 w-px bg-slate-300 dark:bg-slate-700" />

        <!-- Toggle Panel Masalah & Kode (Sidebar Kanan) -->
        <button
          @click="uiStore.toggleRightSidebar"
          :class="[
            'flex items-center space-x-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all',
            uiStore.isRightSidebarOpen
              ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
              : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          :title="uiStore.isRightSidebarOpen ? 'Tutup Panel Masalah & Kode (Ctrl+I)' : 'Buka Panel Masalah & Kode (Ctrl+I)'"
        >
          <PanelRightOpen v-if="!uiStore.isRightSidebarOpen" class="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <PanelRightClose v-else class="h-3.5 w-3.5 shrink-0" />
          <span class="hidden md:inline">Panel Masalah</span>
          <span
            :class="[
              'rounded-full px-1.5 py-0.2 text-[10px] font-bold font-mono',
              errorCount > 0
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
            ]"
          >
            {{ errorCount > 0 ? `${errorCount} Bentrok` : 'Bebas Bentrok' }}
          </span>
        </button>
      </div>
    </div>

    <!-- Area Tabel Jadwal dengan Virtual Scroll & Sticky Headers -->
    <div @scroll="closeSuggestions" class="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
      <table class="border-separate border-spacing-0 text-center text-xs table-fixed">
        <!-- Kolom Lebar Tetap untuk Menjamin Sticky Alignment Sempurna -->
        <colgroup>
          <col class="w-[88px] min-w-[88px] max-w-[88px]" />
          <col class="w-[110px] min-w-[110px] max-w-[110px]" />
          <col
            v-for="kelas in kelasList"
            :key="kelas.id"
            :class="isLargeView ? 'w-[130px] min-w-[130px]' : 'w-[90px] min-w-[90px]'"
          />
        </colgroup>

        <!-- Header Kelas (Sticky Top) -->
        <thead class="sticky top-0 z-20 bg-slate-100 dark:bg-slate-950">
          <tr>
            <th
              class="sticky left-0 top-0 z-30 w-[88px] min-w-[88px] max-w-[88px] border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-2 py-3 text-center text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider"
            >
              Hari / Jam
            </th>
            <th
              class="sticky left-[88px] top-0 z-30 w-[110px] min-w-[110px] max-w-[110px] border-b border-r-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 px-2 py-3 text-center text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]"
            >
              Waktu KBM
            </th>
            <th
              v-for="kelas in kelasList"
              :key="kelas.id"
              :class="[
                'border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/95 px-3 py-2.5 font-bold text-emerald-600 dark:text-emerald-400 text-center transition-all',
                isLargeView ? 'w-[130px] min-w-[130px] text-sm' : 'w-[90px] min-w-[90px] text-xs'
              ]"
            >
              {{ kelas.nama }}
            </th>
          </tr>
        </thead>

        <tbody>
          <template v-for="hari in displayedHariList" :key="hari.nama">
            <template v-for="(slot, slotIdx) in hari.slots" :key="slot.id">
              <!-- Baris Slot Khusus: Upacara / Istirahat (Colspan penuh) -->
              <tr
                v-if="slot.tipe !== 'kbm'"
                class="bg-amber-500/10 text-amber-800 dark:bg-slate-950/40 dark:text-slate-400"
              >
                <!-- Label Hari (Sticky Left, hanya di slot pertama hari itu) -->
                <td
                  v-if="slotIdx === 0"
                  :rowspan="hari.slots.length"
                  class="sticky left-0 z-20 w-[88px] min-w-[88px] max-w-[88px] border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-2 py-2 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-center align-middle"
                >
                  {{ hari.nama }}
                </td>

                <td
                  class="sticky left-[88px] z-20 w-[110px] min-w-[110px] max-w-[110px] border-b border-r-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 font-mono text-[10px] text-slate-600 dark:text-slate-400 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]"
                >
                  {{ slot.waktu[0] || '-' }}
                </td>

                <td
                  :colspan="kelasList.length"
                  class="border-b border-r border-slate-200 dark:border-slate-800/80 bg-amber-50 dark:bg-amber-500/5 px-3 py-1.5 text-center text-[11px] font-medium text-amber-700 dark:text-amber-300/80 tracking-wide"
                >
                  — {{ slot.label || (slot.tipe === 'jeda' ? 'Istirahat' : 'Upacara') }} —
                </td>
              </tr>

              <!-- Baris Slot KBM Reguler -->
              <tr v-else class="hover:bg-slate-100/60 dark:hover:bg-slate-900/40">
                <!-- Label Hari (Sticky Left, jika slotIdx === 0) -->
                <td
                  v-if="slotIdx === 0"
                  :rowspan="hari.slots.length"
                  class="sticky left-0 z-20 w-[88px] min-w-[88px] max-w-[88px] border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-2 py-2 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-center align-middle"
                >
                  {{ hari.nama }}
                </td>

                <!-- Label Jam & Waktu KBM (Sticky Split Pane) -->
                <td
                  class="sticky left-[88px] z-20 w-[110px] min-w-[110px] max-w-[110px] border-b border-r-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 text-center transition-all shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]"
                  :class="isLargeView ? 'py-3' : 'py-2'"
                >
                  <div :class="['font-bold text-slate-800 dark:text-slate-300', isLargeView ? 'text-sm' : 'text-xs']">
                    {{ slot.id }}
                  </div>
                  <div :class="['font-mono text-slate-500 dark:text-slate-400 leading-tight mt-0.5', isLargeView ? 'text-[11px]' : 'text-[10px]']">
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
                    'relative border-b border-r border-slate-200 dark:border-slate-800/70 p-0 text-center font-mono cursor-pointer transition-all bg-white dark:bg-slate-900/60',
                    isLargeView ? 'h-16 min-h-[64px]' : 'h-10 text-xs font-semibold',
                    // Sel Aktif Terpilih
                    uiStore.selectedCell?.hari === hari.nama &&
                    uiStore.selectedCell?.slotId === slot.id &&
                    uiStore.selectedCell?.kelasId === kelas.id
                      ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50 dark:bg-emerald-500/20 text-emerald-900 dark:text-white z-10'
                      : '',
                    // Sel Bentrok (Clash)
                    hasClash(hari.nama, slot.id, kelas.id)
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 ring-2 ring-rose-500 ring-inset font-bold'
                      : '',
                    // Sorot Guru Aktif
                    isHighlighted(hari.nama, slot.id, kelas.id)
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-400/25 dark:text-amber-200 ring-2 ring-amber-500 dark:ring-amber-400 ring-inset'
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
                      :ref="(el) => { inputRef = (el as any) || null }"
                      v-model="editingText"
                      @keydown="onInputKeyDown"
                      @input="onCellInput"
                      @blur="commitEdit"
                      type="text"
                      :class="[
                        'h-full w-full rounded border border-emerald-500 dark:border-emerald-400 bg-white dark:bg-slate-950 px-1 text-center font-mono font-bold text-slate-900 dark:text-white focus:outline-none shadow-xs',
                        isLargeView ? 'text-sm' : 'text-xs'
                      ]"
                    />
                  </div>

                  <!-- Mode Tampilan Normal -->
                  <div
                    v-else
                    class="flex h-full w-full flex-col items-center justify-center p-1"
                  >
                    <template v-if="getCellRaw(hari.nama, slot.id, kelas.id)">
                      <!-- Tampilan Sel Mode Besar & Fokus: Kode BOLD + Rincian Mapel / Guru -->
                      <div v-if="isLargeView" class="flex flex-col items-center justify-center w-full leading-tight">
                        <span
                          :class="[
                            'font-mono font-extrabold text-sm',
                            hasClash(hari.nama, slot.id, kelas.id)
                              ? 'text-rose-700 dark:text-rose-300'
                              : 'text-slate-900 dark:text-white'
                          ]"
                        >
                          {{ getCellRaw(hari.nama, slot.id, kelas.id) }}
                        </span>
                        <div
                          v-for="(detail, dIdx) in getCellTokenDetails(getCellRaw(hari.nama, slot.id, kelas.id)).slice(0, 2)"
                          :key="`${detail.kode}-${dIdx}`"
                          class="truncate text-[10px] font-sans font-medium text-slate-500 dark:text-slate-400 max-w-[125px] px-0.5 mt-0.5"
                          :title="`${detail.mapel}${detail.guru ? ' (' + detail.guru + ')' : ''}`"
                        >
                          {{ detail.mapel || detail.guru || '' }}
                        </div>
                      </div>

                      <!-- Tampilan Sel Mode Kompak: Kode Biasa -->
                      <span
                        v-else
                        :class="[
                          'rounded px-1.5 py-0.5',
                          hasClash(hari.nama, slot.id, kelas.id)
                            ? 'text-rose-800 dark:text-rose-300 font-bold'
                            : 'text-slate-800 dark:text-slate-100 font-semibold'
                        ]"
                      >
                        {{ getCellRaw(hari.nama, slot.id, kelas.id) }}
                      </span>
                    </template>

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

    <!-- Dropdown Saran Kode Inline (ADR-0008) — di-teleport ke body agar tidak terpotong scroll container grid -->
    <Teleport to="body">
      <div
        v-if="showSuggestions && suggestionList.length > 0 && suggestionPos"
        :style="{ position: 'fixed', top: `${suggestionPos.top}px`, left: `${suggestionPos.left}px` }"
        class="z-50 w-64 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div
          v-for="(sugg, idx) in suggestionList"
          :key="sugg.kode"
          @mousedown.prevent="applySuggestion(sugg)"
          :class="[
            'flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] cursor-pointer',
            idx === activeSuggestionIndex
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
        >
          <span class="shrink-0 font-mono font-bold">{{ sugg.kode }}</span>
          <span class="flex-1 truncate text-slate-500 dark:text-slate-400">{{ sugg.guruNama }} · {{ sugg.mapel }}</span>
          <span class="shrink-0 font-mono text-slate-400 dark:text-slate-500">{{ sugg.sisaJp }} JP</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>
