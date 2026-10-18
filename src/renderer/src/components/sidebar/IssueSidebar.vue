<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  Search,
  Eye,
  PlusCircle,
  ChevronRight,
  BookOpen
} from 'lucide-vue-next'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useUiStore, SidebarTab } from '../../stores/uiStore'
import { MasalahJadwal, Penugasan } from '@core/types'
import { parseCellJP } from '@core/cell-parser'

const store = useScheduleStore()
const uiStore = useUiStore()

const searchQuery = ref<string>('')

// Masalah terkelompokkan
const errorIssues = computed(() => {
  return store.hasilPemeriksaan.masalah.filter((m) =>
    ['bentrok_guru', 'tidak_bisa', 'kode_tidak_dikenal', 'beban_lebih', 'kapasitas_terlampaui'].includes(
      m.jenis
    )
  )
})

const warningIssues = computed(() => {
  return store.hasilPemeriksaan.masalah.filter((m) => m.jenis === 'beban_kurang')
})

// Daftar penugasan dengan filter pencarian
const filteredPenugasan = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const list = store.proyek.master.penugasan
  if (!q) return list

  return list.filter((p) => {
    const mapelMatch = p.mapel.toLowerCase().includes(q)
    const kodeMatch = p.kode.toLowerCase().includes(q)
    const guru = store.proyek.master.guru.find((g) => g.id === p.guru_id)
    const guruMatch = guru ? guru.nama.toLowerCase().includes(q) : false
    return mapelMatch || kodeMatch || guruMatch
  })
})

function getGuruName(guruId: string | null | undefined): string {
  if (!guruId) return 'Belum ditentukan'
  const g = store.proyek.master.guru.find((guru) => guru.id === guruId)
  return g ? g.nama : guruId
}

function getTotalBeban(p: Penugasan): number {
  return Object.values(p.beban).reduce((sum, b) => sum + (b || 0), 0)
}

function getTerpasangCount(p: Penugasan): number {
  let count = 0
  for (const k of store.proyek.master.kelas) {
    count += store.terpasang[`${p.kode}:${k.id}`] || 0
  }
  return count
}

// Lompat ke sel terkait masalah
function jumpToIssue(issue: MasalahJadwal): void {
  if (!issue.sel || issue.sel.length === 0) return
  const target = issue.sel[0]
  uiStore.setSelectedCell({
    hari: target.hari,
    slotId: target.slot_id,
    kelasId: target.kelas_id
  })

  // Pastikan tab aktif adalah jadwal
  uiStore.setActiveTab('jadwal')

  // Scroll sel ke tengah layar
  setTimeout(() => {
    const el = document.getElementById(
      `cell-${target.hari}-${target.slot_id}-${target.kelas_id}`
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
  <div class="flex h-full w-80 flex-col border-l border-slate-800 bg-slate-950 text-slate-200">
    <!-- Tab Navigasi Sidebar -->
    <div class="flex border-b border-slate-800 bg-slate-950 px-2 pt-2">
      <button
        @click="uiStore.setSidebarTab('issues')"
        :class="[
          'relative flex flex-1 items-center justify-center space-x-1.5 py-2.5 text-xs font-semibold transition-colors',
          uiStore.sidebarTab === 'issues'
            ? 'text-emerald-400 border-b-2 border-emerald-500'
            : 'text-slate-400 hover:text-slate-200'
        ]"
      >
        <span>Pemeriksaan</span>
        <span
          v-if="errorIssues.length > 0"
          class="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-400 border border-rose-500/40"
        >
          {{ errorIssues.length }}
        </span>
        <span
          v-else
          class="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-bold text-emerald-400 border border-emerald-500/20"
        >
          ✓
        </span>
      </button>

      <button
        @click="uiStore.setSidebarTab('codes')"
        :class="[
          'flex flex-1 items-center justify-center space-x-1.5 py-2.5 text-xs font-semibold transition-colors',
          uiStore.sidebarTab === 'codes'
            ? 'text-emerald-400 border-b-2 border-emerald-500'
            : 'text-slate-400 hover:text-slate-200'
        ]"
      >
        <span>Daftar Kode</span>
        <span class="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-slate-400">
          {{ store.proyek.master.penugasan.length }}
        </span>
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
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
        ]"
      >
        <CheckCircle2 v-if="errorIssues.length === 0" class="h-6 w-6 text-emerald-400 shrink-0" />
        <AlertCircle v-else class="h-6 w-6 text-rose-400 shrink-0" />
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
        <div class="flex items-center space-x-1.5 text-xs font-semibold text-rose-400">
          <AlertCircle class="h-3.5 w-3.5" />
          <span>Harus Diperbaiki ({{ errorIssues.length }})</span>
        </div>

        <div class="space-y-1.5">
          <div
            v-for="(issue, idx) in errorIssues"
            :key="idx"
            class="group rounded-lg border border-rose-500/30 bg-slate-900/90 p-2.5 text-xs text-rose-200 transition-all hover:border-rose-500/60"
          >
            <div class="flex items-start justify-between gap-1">
              <span class="text-[11px] leading-relaxed">{{ issue.pesan }}</span>
              <button
                v-if="issue.sel && issue.sel.length > 0"
                @click="jumpToIssue(issue)"
                class="shrink-0 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/30 transition-colors"
                title="Lompat ke posisi sel di kisi jadwal"
              >
                Lompat
              </button>
            </div>
            <div
              v-if="issue.sel && issue.sel.length > 0"
              class="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-400 font-mono"
            >
              <span
                v-for="(s, sIdx) in issue.sel"
                :key="sIdx"
                class="rounded bg-slate-950 px-1 py-0.2"
              >
                {{ s.hari }} {{ s.slot_id }} ({{ s.kelas_id.replace('kelas:', '') }})
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Kategori: Peringatan & Sisa Beban Belum Diplot -->
      <div v-if="warningIssues.length > 0" class="space-y-2">
        <div class="flex items-center space-x-1.5 text-xs font-semibold text-amber-400">
          <AlertTriangle class="h-3.5 w-3.5" />
          <span>Belum Tuntas Diplot ({{ warningIssues.length }})</span>
        </div>

        <div class="space-y-1.5 max-h-72 overflow-y-auto">
          <div
            v-for="(issue, idx) in warningIssues"
            :key="idx"
            class="rounded-lg border border-amber-500/30 bg-slate-900/80 p-2.5 text-[11px] text-amber-200"
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
        <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari mapel, kode, guru..."
          class="w-full rounded-lg border border-slate-800 bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <!-- List Kode Penugasan -->
      <div class="flex-1 overflow-y-auto space-y-2 pr-1">
        <div
          v-if="filteredPenugasan.length === 0"
          class="p-6 text-center text-xs text-slate-500"
        >
          Tidak ada penugasan yang sesuai pencarian.
        </div>

        <div
          v-for="p in filteredPenugasan"
          :key="p.id"
          :class="[
            'group rounded-xl border p-3 transition-all',
            uiStore.highlightedGuruId === p.guru_id
              ? 'border-amber-400/60 bg-amber-500/10'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          ]"
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/30">
              Kode: {{ p.kode }}
            </span>
            <span class="text-[11px] font-mono text-slate-400">
              {{ getTerpasangCount(p) }} / {{ getTotalBeban(p) }} JP
            </span>
          </div>

          <div class="text-xs font-semibold text-slate-100 truncate">
            {{ p.mapel }}
          </div>
          <div class="text-[11px] text-slate-400 truncate mb-2">
            {{ getGuruName(p.guru_id) }}
          </div>

          <!-- Aksi Cepat Kode -->
          <div class="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px]">
            <button
              @click="toggleHighlightGuru(p.guru_id)"
              :class="[
                'flex items-center space-x-1 rounded px-2 py-1 transition-colors',
                uiStore.highlightedGuruId === p.guru_id
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              ]"
            >
              <Eye class="h-3 w-3" />
              <span>{{ uiStore.highlightedGuruId === p.guru_id ? 'Lepas Sorot' : 'Sorot Guru' }}</span>
            </button>

            <button
              @click="applyCodeToSelectedCell(p.kode)"
              class="flex items-center space-x-1 rounded bg-emerald-600/80 px-2 py-1 text-white hover:bg-emerald-500 transition-colors"
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
