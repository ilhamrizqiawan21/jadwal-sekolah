<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Check,
  Search,
  Eye,
  PlusCircle,
  PanelRightClose
} from 'lucide-vue-next'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useUiStore, SidebarTab } from '../../stores/uiStore'
import { Masalah, Penugasan } from '@core/types'
import { parseCellJP } from '@core/cell-parser'

const store = useScheduleStore()
const uiStore = useUiStore()

const searchQuery = ref<string>('')

// Masalah terkelompokkan berdasarkan tingkat resmi
const errorIssues = computed(() => {
  return store.hasilPemeriksaan.masalah.filter((m) => m.tingkat === 'error')
})

const warningIssues = computed(() => {
  return store.hasilPemeriksaan.masalah.filter((m) => m.tingkat === 'warn' || m.tingkat === 'info')
})

// Daftar penugasan dengan filter pencarian
const filteredPenugasan = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const list = store.proyek.master.penugasan
  if (!q) return list

  return list.filter((p) => {
    const mapelMatch = p.mapel.toLowerCase().includes(q)
    const kodeMatch = p.kode.toLowerCase().includes(q)
    const guruMatch = guruIdsOf(p).some((id) =>
      (store.proyek.master.guru.find((g) => g.id === id)?.nama ?? '').toLowerCase().includes(q)
    )
    return mapelMatch || kodeMatch || guruMatch
  })
})

function guruIdsOf(p: Penugasan): string[] {
  return p.guru_ids && p.guru_ids.length > 0 ? p.guru_ids : p.guru_id ? [p.guru_id] : []
}

function getGuruName(p: Penugasan): string {
  const names = guruIdsOf(p).map((id) => store.proyek.master.guru.find((g) => g.id === id)?.nama ?? id)
  return names.length ? names.join(' & ') : 'Belum ditentukan'
}

function namaKelas(kelasId: string): string {
  return store.proyek.master.kelas.find((k) => k.id === kelasId)?.nama ?? kelasId
}

function isSorot(p: Penugasan): boolean {
  return uiStore.highlightedGuruId !== null && guruIdsOf(p).includes(uiStore.highlightedGuruId)
}

function getTotalBeban(p: Penugasan): number {
  return Object.values(p.beban).reduce((sum, b) => sum + (b || 0), 0)
}

function getTerpasangCount(p: Penugasan): number {
  let count = 0
  const kodeUpper = p.kode.toUpperCase()
  for (const k of store.proyek.master.kelas) {
    count += store.terpasang[`${kodeUpper}:${k.id}`] || 0
  }
  return count
}

// Lompat ke sel terkait masalah
function jumpToIssue(issue: Masalah): void {
  if (!issue.sel || issue.sel.length === 0) return
  const target = issue.sel[0]

  // Pastikan hari sel masalah tampil di kisi jika sedang ada filter hari aktif
  if (
    uiStore.selectedHariFilter !== 'all' &&
    uiStore.selectedHariFilter.toLowerCase() !== target[0].toLowerCase()
  ) {
    uiStore.setSelectedHariFilter(target[0])
  }

  uiStore.setSelectedCell({
    hari: target[0],
    slotId: target[1],
    kelasId: target[2]
  })

  // Pastikan tab aktif adalah jadwal
  uiStore.setActiveTab('jadwal')

  // Scroll sel ke tengah layar
  setTimeout(() => {
    const el = document.getElementById(
      `cell-${target[0]}-${target[1]}-${target[2]}`
    )
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, 100)
}

// Toggle sorot guru di jadwal
function toggleHighlightGuru(guruId: string): void {
  if (uiStore.highlightedGuruId === guruId) {
    uiStore.setHighlightedGuru(null)
  } else {
    uiStore.setHighlightedGuru(guruId)
  }
}

// Pasang kode ke sel yang sedang aktif di kisi jadwal
function applyCodeToSelectedCell(kode: string): void {
  const cur = uiStore.selectedCell
  if (!cur) return

  const knownCodes = new Set(store.proyek.master.penugasan.map((p) => p.kode.toUpperCase()))
  const parsed = parseCellJP(kode, knownCodes)
  store.setCell(cur.hari, cur.slotId, cur.kelasId, parsed)
}
</script>

<template>
  <div class="flex h-full w-80 max-w-[90vw] flex-col border-l border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
    <!-- Tab Navigasi Sidebar -->
    <div class="flex border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 px-2 pt-2">
      <button
        @click="uiStore.setSidebarTab('issues')"
        :class="[
          'relative flex flex-1 items-center justify-center space-x-1.5 py-2.5 text-xs font-semibold transition-colors',
          uiStore.sidebarTab === 'issues'
            ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        ]"
      >
        <span>Pemeriksaan</span>
        <span
          v-if="errorIssues.length > 0"
          class="rounded-full bg-rose-100 dark:bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-500/40"
        >
          {{ errorIssues.length }}
        </span>
        <span
          v-else
          class="rounded-full bg-emerald-100 p-0.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          aria-label="Tanpa bentrok"
        >
          <Check class="h-3 w-3" />
        </span>
      </button>

      <button
        @click="uiStore.setSidebarTab('codes')"
        :class="[
          'flex flex-1 items-center justify-center space-x-1.5 py-2.5 text-xs font-semibold transition-colors',
          uiStore.sidebarTab === 'codes'
            ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        ]"
      >
        <span>Daftar Kode</span>
        <span class="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-slate-700 dark:text-slate-400">
          {{ store.proyek.master.penugasan.length }}
        </span>
      </button>

      <!-- Tombol Tutup Panel (Fokus ke Jadwal Penuh) -->
      <button
        @click="uiStore.toggleRightSidebar"
        class="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors ml-1 self-center"
        title="Tutup Panel Masalah & Kode (Ctrl+I)"
      >
        <PanelRightClose class="h-4 w-4" />
      </button>
    </div>

    <!-- TAB 1: Masalah Jadwal (Realtime) -->
    <div
      v-if="uiStore.sidebarTab === 'issues'"
      class="flex-1 overflow-y-auto p-3 space-y-4"
    >
      <!-- Ringkasan Status Jadwal -->
      <div
        :class="[
          'flex items-center space-x-3 rounded-xl border p-3.5',
          errorIssues.length === 0
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300'
        ]"
      >
        <CheckCircle2 v-if="errorIssues.length === 0" class="h-6 w-6 text-emerald-500 dark:text-emerald-400 shrink-0" />
        <AlertCircle v-else class="h-6 w-6 text-rose-500 dark:text-rose-400 shrink-0" />
        <div>
          <div class="text-xs font-bold uppercase tracking-wider">
            {{ errorIssues.length === 0 ? 'Jadwal Bebas Bentrok' : 'Terdapat Masalah' }}
          </div>
          <div class="text-[11px] opacity-80">
            {{ errorIssues.length === 0 ? 'Semua alokasi guru dan jam valid.' : `${errorIssues.length} kesalahan harus diperbaiki.` }}
          </div>
        </div>
      </div>

      <!-- Kategori: Harus Diperbaiki (Errors) -->
      <div v-if="errorIssues.length > 0" class="space-y-2">
        <div class="flex items-center space-x-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          <AlertCircle class="h-3.5 w-3.5" />
          <span>Harus Diperbaiki ({{ errorIssues.length }})</span>
        </div>

        <div class="space-y-1.5">
          <div
            v-for="(issue, idx) in errorIssues"
            :key="idx"
            class="group rounded-lg border border-rose-200 bg-rose-50/60 p-2.5 text-xs text-rose-900 transition-all hover:border-rose-400 dark:border-rose-500/30 dark:bg-slate-900/90 dark:text-rose-200 dark:hover:border-rose-500/60"
          >
            <div class="flex items-start justify-between gap-1">
              <span class="text-[11px] leading-relaxed">{{ issue.pesan }}</span>
              <button
                v-if="issue.sel && issue.sel.length > 0"
                @click="jumpToIssue(issue)"
                class="shrink-0 rounded bg-rose-200 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 hover:bg-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/30 transition-colors"
                title="Lompat ke posisi sel di kisi jadwal"
              >
                Lompat
              </button>
            </div>
            <div
              v-if="issue.sel && issue.sel.length > 0"
              class="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono"
            >
              <span
                v-for="(s, sIdx) in issue.sel"
                :key="sIdx"
                class="rounded bg-white dark:bg-slate-950 px-1 py-0.2 border border-slate-200 dark:border-transparent"
              >
                {{ s[0] }} {{ s[1] }} ({{ namaKelas(s[2]) }})
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Kategori: Peringatan & Sisa Beban Belum Diplot -->
      <div v-if="warningIssues.length > 0" class="space-y-2">
        <div class="flex items-center space-x-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <AlertTriangle class="h-3.5 w-3.5" />
          <span>Belum Tuntas Diplot ({{ warningIssues.length }})</span>
        </div>

        <div class="space-y-1.5 max-h-72 overflow-y-auto">
          <div
            v-for="(issue, idx) in warningIssues"
            :key="idx"
            class="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900 dark:border-amber-500/30 dark:bg-slate-900/80 dark:text-amber-200"
          >
            <div>{{ issue.pesan }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: Daftar Kode & Guru (Pencarian Cepat) -->
    <div v-else class="flex flex-1 flex-col overflow-hidden p-3">
      <!-- Search Input -->
      <div class="relative mb-3">
        <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari mapel, kode, guru..."
          class="field"
        />
      </div>

      <!-- List Kode Penugasan -->
      <div class="flex-1 overflow-y-auto space-y-2 pr-1">
        <div
          v-if="filteredPenugasan.length === 0"
          class="p-6 text-center text-xs text-slate-400 dark:text-slate-500"
        >
          Tidak ada penugasan yang sesuai pencarian.
        </div>

        <div
          v-for="p in filteredPenugasan"
          :key="p.id"
          :class="[
            'group rounded-xl border p-3 transition-all',
            isSorot(p)
              ? 'border-amber-400 bg-amber-50 dark:border-amber-400/60 dark:bg-amber-500/10'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700'
          ]"
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="rounded bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 px-2 py-0.5 font-mono text-xs font-bold">
              {{ p.kode }}
            </span>
            <span class="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {{ getTerpasangCount(p) }} / {{ getTotalBeban(p) }} JP
            </span>
          </div>

          <div class="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
            {{ p.mapel }}
          </div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-2">
            {{ getGuruName(p) }}
          </div>

          <!-- Aksi Cepat Kode -->
          <div class="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-2 text-[10px]">
            <button
              @click="toggleHighlightGuru(guruIdsOf(p)[0])"
              :class="[
                'flex items-center space-x-1 rounded px-2 py-1 transition-colors',
                isSorot(p)
                  ? 'bg-amber-200 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 font-semibold'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              ]"
            >
              <Eye class="h-3 w-3" />
              <span>{{ isSorot(p) ? 'Lepas Sorot' : 'Sorot Guru' }}</span>
            </button>

            <button
              @click="applyCodeToSelectedCell(p.kode)"
              class="btn btn-primary !gap-1 !rounded-lg !px-2 !py-1 !text-[10px]"
              title="Isi kode ini ke sel yang sedang aktif di kisi jadwal"
            >
              <PlusCircle class="h-3 w-3" />
              <span>Isi ke Sel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
