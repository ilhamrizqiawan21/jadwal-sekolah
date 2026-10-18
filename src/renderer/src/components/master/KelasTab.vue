<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  ChevronUp,
  ChevronDown,
  Layers,
  GraduationCap
} from 'lucide-vue-next'
import { Kelas } from '@core/types'
import { useScheduleStore } from '../../stores/scheduleStore'

const store = useScheduleStore()

const isEditing = ref<boolean>(false)
const formKelas = ref<{
  id: string
  nama: string
  tingkat: number
  wali_guru_id: string | null
}>({
  id: '',
  nama: '',
  tingkat: 7,
  wali_guru_id: null
})

// Hitung total jam KBM efektif dalam seminggu (dalam satuan Jam Pelajaran / JP riil)
const totalWeeklyJP = computed(() => {
  let count = 0
  for (const hari in store.proyek.struktur_waktu.hari) {
    const day = store.proyek.struktur_waktu.hari[hari]
    if (day.aktif) {
      for (const s of day.slots) {
        if (s.tipe === 'kbm') {
          count += s.jp.length > 0 ? s.jp.length : 2
        }
      }
    }
  }
  return count
})

function getTerpasangCount(kelasId: string): number {
  let count = 0
  for (const hari in store.proyek.jadwal) {
    const day = store.proyek.struktur_waktu.hari[hari]
    if (!day || !day.aktif) continue

    for (const slotId in store.proyek.jadwal[hari]) {
      const slotDef = day.slots.find((s) => s.id === slotId)
      if (!slotDef || slotDef.tipe !== 'kbm') continue

      const cell = store.proyek.jadwal[hari][slotId][kelasId]
      if (cell) {
        if (cell[0] && cell[0].length > 0) count += 1
        if (cell[1] && cell[1].length > 0) count += 1
      }
    }
  }
  return count
}


function openAddModal(): void {
  const nextOrder = store.proyek.master.kelas.length + 1
  formKelas.value = {
    id: `kelas:${Date.now()}`,
    nama: '',
    tingkat: 7,
    wali_guru_id: null
  }
  isEditing.value = true
}

function editKelas(k: Kelas): void {
  formKelas.value = {
    id: k.id,
    nama: k.nama,
    tingkat: k.tingkat || 7,
    wali_guru_id: k.wali_guru_id || null
  }
  isEditing.value = true
}

function saveKelas(): void {
  if (!formKelas.value.nama.trim()) return

  const existingIdx = store.proyek.master.kelas.findIndex((k) => k.id === formKelas.value.id)
  if (existingIdx !== -1) {
    const existing = store.proyek.master.kelas[existingIdx]
    store.updateKelas({
      ...existing,
      nama: formKelas.value.nama.trim(),
      tingkat: Number(formKelas.value.tingkat),
      wali_guru_id: formKelas.value.wali_guru_id || null
    })
  } else {
    store.addKelas({
      id: formKelas.value.id,
      nama: formKelas.value.nama.trim(),
      tingkat: Number(formKelas.value.tingkat),
      urutan: store.proyek.master.kelas.length + 1,
      wali_guru_id: formKelas.value.wali_guru_id || null
    })
  }
  isEditing.value = false
}

function removeKelas(kelasId: string): void {
  if (confirm('Yakin ingin menghapus kelas ini? Seluruh data jadwal di kelas ini akan dihapus.')) {
    store.deleteKelas(kelasId)
  }
}

function moveUp(index: number): void {
  if (index > 0) {
    store.reorderKelas(index, index - 1)
  }
}

function moveDown(index: number): void {
  if (index < store.proyek.master.kelas.length - 1) {
    store.reorderKelas(index, index + 1)
  }
}

function getGuruName(guruId: string | null | undefined): string {
  if (!guruId) return 'Belum ditentukan'
  const g = store.proyek.master.guru.find((guru) => guru.id === guruId)
  return g ? g.nama : 'Tidak ditemukan'
}
</script>

<template>
  <div class="flex h-full w-full flex-col p-4 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg mb-4">
      <div>
        <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Manajemen Rombongan Belajar (Kelas)</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Atur daftar rombel, tingkat kelas, wali kelas, dan urutan tampilan kolom pada kisi jadwal.
        </p>
      </div>

      <button
        @click="openAddModal"
        class="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-900/30"
      >
        <Plus class="h-4 w-4" />
        <span>Tambah Kelas Baru</span>
      </button>
    </div>

    <!-- Modal Form Edit/Tambah Kelas -->
    <div
      v-if="isEditing"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
          {{ formKelas.id.startsWith('kelas:') ? 'Tambah Kelas Baru' : 'Edit Kelas' }}
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Lengkapi informasi rombongan belajar</p>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Rombel / Kelas *</label>
            <input
              v-model="formKelas.nama"
              type="text"
              placeholder="Contoh: 7A, X-IPA 1, XII TKJ 2"
              class="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tingkat / Grade *</label>
            <input
              v-model.number="formKelas.tingkat"
              type="number"
              min="1"
              max="13"
              class="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Wali Kelas</label>
            <select
              v-model="formKelas.wali_guru_id"
              class="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option :value="null">-- Tidak ada wali kelas --</option>
              <option
                v-for="guru in store.proyek.master.guru"
                :key="guru.id"
                :value="guru.id"
              >
                {{ guru.nama }} {{ guru.nip_nuptk ? `(${guru.nip_nuptk})` : '' }}
              </option>
            </select>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-2">
            <button
              @click="isEditing = false"
              class="rounded-lg px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Batal
            </button>
            <button
              @click="saveKelas"
              class="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-900/30"
            >
              <Check class="h-3.5 w-3.5" />
              <span>Simpan Kelas</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Table Kelas -->
    <div class="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg">
      <table class="w-full text-left text-xs text-slate-800 dark:text-slate-200">
        <thead class="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-400">
          <tr>
            <th class="w-16 px-4 py-3.5 text-center">Urutan</th>
            <th class="px-4 py-3.5">Nama Rombel</th>
            <th class="px-4 py-3.5">Tingkat</th>
            <th class="px-4 py-3.5">Wali Kelas</th>
            <th class="px-4 py-3.5 text-center">Jam Terplot</th>
            <th class="w-40 px-4 py-3.5 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800/60">
          <tr
            v-if="store.proyek.master.kelas.length === 0"
            class="text-center"
          >
            <td colspan="6" class="p-8 text-xs text-slate-400 dark:text-slate-500">
              Belum ada kelas. Klik tombol Tambah Kelas Baru di atas.
            </td>
          </tr>

          <tr
            v-for="(k, idx) in store.proyek.master.kelas"
            :key="k.id"
            class="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
          >
            <!-- Tombol Urutan Naik / Turun -->
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center space-x-1">
                <button
                  :disabled="idx === 0"
                  @click="moveUp(idx)"
                  class="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20"
                >
                  <ChevronUp class="h-3.5 w-3.5" />
                </button>
                <span class="font-mono text-slate-500 dark:text-slate-400 text-xs w-4">{{ idx + 1 }}</span>
                <button
                  :disabled="idx === store.proyek.master.kelas.length - 1"
                  @click="moveDown(idx)"
                  class="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20"
                >
                  <ChevronDown class="h-3.5 w-3.5" />
                </button>
              </div>
            </td>

            <td class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {{ k.nama }}
            </td>

            <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
              <span class="rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 text-xs">
                Kelas {{ k.tingkat || '-' }}
              </span>
            </td>

            <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
              <div class="flex items-center space-x-1.5">
                <GraduationCap class="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <span>{{ getGuruName(k.wali_guru_id) }}</span>
              </div>
            </td>

            <!-- Rekap Jam Terplot -->
            <td class="px-4 py-3 text-center">
              <span
                :class="[
                  'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  getTerpasangCount(k.id) >= totalWeeklyJP
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                    : 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                ]"
              >
                {{ getTerpasangCount(k.id) }} / {{ totalWeeklyJP }} JP
              </span>
            </td>


            <!-- Aksi Edit / Hapus -->
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end space-x-1">
                <button
                  @click="editKelas(k)"
                  class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  title="Edit Kelas"
                >
                  <Edit2 class="h-3.5 w-3.5" />
                </button>
                <button
                  @click="removeKelas(k.id)"
                  class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 transition-colors"
                  title="Hapus Kelas"
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
