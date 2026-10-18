<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  BookOpen,
  Users
} from 'lucide-vue-next'
import { Penugasan } from '@core/types'
import { useScheduleStore } from '../../stores/scheduleStore'

const store = useScheduleStore()

const isEditing = ref<boolean>(false)
const formPenugasan = ref<{
  id: string
  guru_id: string
  guru_ids: string[]
  is_team_teaching: boolean
  kode: string
  mapel: string
  kategori: string
  warna: string
  beban: Record<string, number>
}>({
  id: '',
  guru_id: '',
  guru_ids: [],
  is_team_teaching: false,
  kode: '',
  mapel: '',
  kategori: 'Wajib',
  warna: '#3b82f6',
  beban: {}
})

const kelasList = computed(() => store.proyek.master.kelas)
const guruList = computed(() => store.proyek.master.guru)

// Validasi kode ganda yang bentrok (dipakai guru lain tanpa team teaching)
const kodeClashes = computed(() => {
  const map: Record<string, string[]> = {}
  for (const a of store.proyek.master.penugasan) {
    if (!map[a.kode]) map[a.kode] = []
    const gIds = a.guru_ids || [a.guru_id]
    for (const gid of gIds) {
      if (!map[a.kode].includes(gid)) map[a.kode].push(gid)
    }
  }

  const clashes: Record<string, boolean> = {}
  for (const kode in map) {
    if (map[kode].length > 1) {
      clashes[kode] = true
    }
  }
  return clashes
})

function getTotalBeban(penugasan: Penugasan): number {
  return Object.values(penugasan.beban).reduce((sum, b) => sum + (b || 0), 0)
}

function getTerpasangTotal(penugasan: Penugasan): number {
  let count = 0
  for (const kelas of kelasList.value) {
    const key = `${penugasan.kode}:${kelas.id}`
    count += store.terpasang[key] || 0
  }
  return count
}

function openAddModal(): void {
  const nextNum = store.proyek.master.penugasan.length + 1
  const initialBeban: Record<string, number> = {}
  kelasList.value.forEach((k) => {
    initialBeban[k.id] = 0
  })

  formPenugasan.value = {
    id: `penugasan:${Date.now()}`,
    guru_id: guruList.value[0]?.id || '',
    guru_ids: [],
    is_team_teaching: false,
    kode: `${nextNum}`,
    mapel: '',
    kategori: 'Wajib',
    warna: '#3b82f6',
    beban: initialBeban
  }
  isEditing.value = true
}

function editPenugasan(a: Penugasan): void {
  const isTeam = Array.isArray(a.guru_ids) && a.guru_ids.length > 1
  const initialBeban: Record<string, number> = {}
  kelasList.value.forEach((k) => {
    initialBeban[k.id] = a.beban[k.id] || 0
  })

  formPenugasan.value = {
    id: a.id,
    guru_id: a.guru_id,
    guru_ids: a.guru_ids || (a.guru_id ? [a.guru_id] : []),
    is_team_teaching: isTeam,
    kode: a.kode,
    mapel: a.mapel,
    kategori: a.kategori || 'Wajib',
    warna: a.warna || '#3b82f6',
    beban: initialBeban
  }
  isEditing.value = true
}

function savePenugasan(): void {
  if (!formPenugasan.value.kode.trim() || !formPenugasan.value.mapel.trim()) return

  // Validasi pemilihan guru pengampu
  if (formPenugasan.value.is_team_teaching) {
    if (!formPenugasan.value.guru_ids || formPenugasan.value.guru_ids.length === 0) {
      alert('Harap centang minimal 1 guru untuk penugasan Team Teaching.')
      return
    }
  } else {
    if (!formPenugasan.value.guru_id) {
      alert('Harap pilih guru pengampu terlebih dahulu.')
      return
    }
  }

  // Bersihkan nilai beban 0
  const cleanBeban: Record<string, number> = {}
  for (const kId in formPenugasan.value.beban) {
    const val = Number(formPenugasan.value.beban[kId])
    if (val > 0) cleanBeban[kId] = val
  }

  const payload: Penugasan = {
    id: formPenugasan.value.id,
    guru_id: formPenugasan.value.is_team_teaching
      ? formPenugasan.value.guru_ids[0] || ''
      : formPenugasan.value.guru_id,
    guru_ids: formPenugasan.value.is_team_teaching
      ? formPenugasan.value.guru_ids
      : undefined,
    kode: formPenugasan.value.kode.trim(),
    mapel: formPenugasan.value.mapel.trim(),
    kategori: formPenugasan.value.kategori,
    warna: formPenugasan.value.warna,
    beban: cleanBeban
  }


  const existingIdx = store.proyek.master.penugasan.findIndex((p) => p.id === payload.id)
  if (existingIdx !== -1) {
    store.updatePenugasan(payload)
  } else {
    store.addPenugasan(payload)
  }
  isEditing.value = false
}

function removePenugasan(penugasanId: string): void {
  if (confirm('Yakin ingin menghapus penugasan ini?')) {
    store.deletePenugasan(penugasanId)
  }
}

function getGuruDisplay(a: Penugasan): string {
  if (a.guru_ids && a.guru_ids.length > 1) {
    const names = a.guru_ids
      .map((gid: string) => guruList.value.find((g) => g.id === gid)?.nama || gid)
      .join(' & ')
    return `[Team Teaching] ${names}`
  }
  const single = guruList.value.find((g) => g.id === a.guru_id)
  return single ? single.nama : 'Belum ditentukan'
}
</script>

<template>
  <div class="flex h-full w-full flex-col p-4 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg mb-4">
      <div>
        <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Beban Mengajar & Penugasan Guru</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Kelola kode mata pelajaran, guru pengampu (termasuk team teaching), dan alokasi JP per kelas.
        </p>
      </div>

      <button
        @click="openAddModal"
        class="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-900/30"
      >
        <Plus class="h-4 w-4" />
        <span>Tambah Penugasan</span>
      </button>
    </div>

    <!-- Modal Form Edit/Tambah Penugasan -->
    <div
      v-if="isEditing"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div class="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {{ formPenugasan.id.startsWith('penugasan:') ? 'Tambah Penugasan Guru' : 'Edit Penugasan Guru' }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Tentukan kode, mata pelajaran, dan distribusi JP per kelas</p>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Kode Unik Penugasan *</label>
              <input
                v-model="formPenugasan.kode"
                type="text"
                placeholder="Contoh: 1, 2A, MAT-1, PJOK"
                class="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Mata Pelajaran *</label>
              <input
                v-model="formPenugasan.mapel"
                type="text"
                placeholder="Contoh: Matematika, Bahasa Inggris"
                class="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <!-- Opsi Team Teaching -->
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center space-x-2">
                <Users class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Mode Team Teaching</span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="formPenugasan.is_team_teaching"
                  class="sr-only peer"
                />
                <div class="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <!-- Single Guru -->
            <div v-if="!formPenugasan.is_team_teaching">
              <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Guru Pengampu</label>
              <select
                v-model="formPenugasan.guru_id"
                class="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option v-for="g in guruList" :key="g.id" :value="g.id">
                  {{ g.nama }} {{ (g.nip_nuptk || g.nip) ? `(${g.nip_nuptk || g.nip})` : '' }}
                </option>
              </select>
            </div>

            <!-- Multi Guru (Team Teaching) -->
            <div v-else class="space-y-2">
              <label class="block text-xs font-medium text-slate-600 dark:text-slate-400">Pilih Guru Tim (Minimal 2)</label>
              <div class="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1">
                <label
                  v-for="g in guruList"
                  :key="g.id"
                  class="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white p-2 text-xs cursor-pointer hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    :value="g.id"
                    v-model="formPenugasan.guru_ids"
                    class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:text-emerald-500"
                  />
                  <span class="truncate text-slate-800 dark:text-slate-200">{{ g.nama }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Matriks Distribusi JP Per Kelas -->
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Alokasi JP per Kelas (Isi jam pelajaran per minggu)
            </label>
            <div class="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div
                v-for="k in kelasList"
                :key="k.id"
                class="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-800/80 dark:bg-slate-900"
              >
                <span class="font-medium text-slate-800 dark:text-slate-300">{{ k.nama }}</span>
                <div class="flex items-center space-x-1">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    v-model.number="formPenugasan.beban[k.id]"
                    class="h-7 w-12 rounded border border-slate-300 bg-white text-center text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <span class="text-[10px] text-slate-500">JP</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <button
            @click="isEditing = false"
            class="rounded-lg px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Batal
          </button>
          <button
            @click="savePenugasan"
            class="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-900/30"
          >
            <Check class="h-3.5 w-3.5" />
            <span>Simpan Penugasan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Table Penugasan -->
    <div class="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg">
      <table class="w-full text-left text-xs text-slate-800 dark:text-slate-200">
        <thead class="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-400">
          <tr>
            <th class="w-16 px-4 py-3.5 text-center">Kode</th>
            <th class="px-4 py-3.5">Mata Pelajaran</th>
            <th class="px-4 py-3.5">Guru Pengampu</th>
            <th class="px-4 py-3.5 text-center">Target JP</th>
            <th class="px-4 py-3.5 text-center">Terplot JP</th>
            <th class="px-4 py-3.5">Status Alokasi</th>
            <th class="w-24 px-4 py-3.5 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800/60">
          <tr
            v-if="store.proyek.master.penugasan.length === 0"
            class="text-center"
          >
            <td colspan="7" class="p-8 text-xs text-slate-400 dark:text-slate-500">
              Belum ada penugasan beban mengajar. Klik tombol Tambah Penugasan di atas.
            </td>
          </tr>

          <tr
            v-for="a in store.proyek.master.penugasan"
            :key="a.id"
            class="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
          >
            <!-- Kode & Indikator Bentrok Kode -->
            <td class="px-4 py-3 text-center">
              <span
                :class="[
                  'inline-flex items-center rounded px-2 py-0.5 font-mono text-xs font-bold',
                  kodeClashes[a.kode]
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                ]"
                :title="kodeClashes[a.kode] ? 'Peringatan: Kode ini dipakai oleh beberapa guru berbeda!' : 'Kode valid'"
              >
                {{ a.kode }}
              </span>
            </td>

            <td class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">
              <div class="flex items-center space-x-1.5">
                <BookOpen class="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <span>{{ a.mapel }}</span>
              </div>
            </td>

            <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
              {{ getGuruDisplay(a) }}
            </td>

            <td class="px-4 py-3 text-center font-mono font-medium text-slate-600 dark:text-slate-300">
              {{ getTotalBeban(a) }} JP
            </td>

            <td class="px-4 py-3 text-center font-mono font-medium">
              <span
                :class="[
                  getTerpasangTotal(a) === getTotalBeban(a)
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : getTerpasangTotal(a) > getTotalBeban(a)
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : 'text-amber-600 dark:text-amber-400 font-bold'
                ]"
              >
                {{ getTerpasangTotal(a) }} JP
              </span>
            </td>

            <td class="px-4 py-3">
              <span
                v-if="getTerpasangTotal(a) === getTotalBeban(a)"
                class="rounded bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium"
              >
                Lengkap (Tuntas)
              </span>
              <span
                v-else-if="getTerpasangTotal(a) < getTotalBeban(a)"
                class="rounded bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 px-2 py-0.5 text-[10px] font-medium"
              >
                Sisa {{ getTotalBeban(a) - getTerpasangTotal(a) }} JP
              </span>
              <span
                v-else
                class="rounded bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 px-2 py-0.5 text-[10px] font-medium"
              >
                Kelebihan {{ getTerpasangTotal(a) - getTotalBeban(a) }} JP
              </span>
            </td>

            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end space-x-1">
                <button
                  @click="editPenugasan(a)"
                  class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <Edit2 class="h-3.5 w-3.5" />
                </button>
                <button
                  @click="removePenugasan(a.id)"
                  class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 transition-colors"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
