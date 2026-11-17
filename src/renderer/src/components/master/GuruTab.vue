<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  UserPlus,
  Trash2,
  Edit2,
  Check,
  X,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  Search
} from 'lucide-vue-next'
import { Guru } from '@core/types'
import { getGuruCode } from '@core/guru-codes'
import { validateRequiredField } from '@core/ui-validation'
import { getSlotOperatorLabel } from '@core/session-config'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useUiStore } from '../../stores/uiStore'

const store = useScheduleStore()
const uiStore = useUiStore()

const selectedGuruId = ref<string | null>(store.proyek.master.guru[0]?.id || null)
const isEditing = ref<boolean>(false)
const guruSearch = ref('')

watch(
  () => store.proyek.master.guru.length,
  () => {
    if (!selectedGuruId.value && !isEditing.value) {
      selectedGuruId.value = store.proyek.master.guru[0]?.id || null
    }
  },
  { immediate: true }
)

// Form State Guru
const formGuru = ref<{
  id: string
  nama: string
  nip: string
  kode_prefiks?: string
  jabatan?: string
  warna?: string
}>({
  id: '',
  nama: '',
  nip: '',
  kode_prefiks: '',
  jabatan: '',
  warna: '#10b981'
})

// Guru terpilih saat ini
const activeGuru = computed(() => {
  return store.proyek.master.guru.find((g) => g.id === selectedGuruId.value) || null
})

const filteredGurus = computed(() => {
  const query = guruSearch.value.trim().toLowerCase()
  if (!query) return store.proyek.master.guru
  return store.proyek.master.guru.filter((guru) => {
    const code = getGuruCode(guru).toLowerCase()
    const nip = (guru.nip_nuptk || '').toLowerCase()
    return guru.nama.toLowerCase().includes(query) || code.includes(query) || nip.includes(query)
  })
})

// Hari aktif KBM
const activeDays = computed(() => {
  return Object.entries(store.proyek.struktur_waktu.hari)
    .filter(([_, data]) => data.aktif)
    .map(([hari, data]) => ({ hari, ...data }))
})

// Daftar slot KBM unik dari seluruh hari aktif untuk header tabel ketersediaan
const maxSlots = computed(() => {
  const map = new Map<string, string>()
  for (const day of activeDays.value) {
    for (const [slotIndex, s] of day.slots.entries()) {
      if (s.tipe === 'kbm' && !map.has(s.id)) {
        const ordinal = day.slots.slice(0, slotIndex + 1).filter((slot) => slot.tipe === 'kbm').length
        map.set(s.id, getSlotOperatorLabel(s, ordinal))
      }
    }
  }
  return Array.from(map.entries()).map(([id, nama]) => ({ id, nama }))
})


function selectGuru(guruId: string): void {
  selectedGuruId.value = guruId
  isEditing.value = false
}

function handleGuruKeydown(event: KeyboardEvent, guruId: string): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectGuru(guruId)
  }
}

function openAddGuruModal(): void {
  formGuru.value = {
    id: `guru:${Date.now()}`,
    nama: '',
    nip: '',
    kode_prefiks: '',
    jabatan: 'Guru Mata Pelajaran',
    warna: '#10b981'
  }
  isEditing.value = true
  selectedGuruId.value = null
}

function editGuru(guru: Guru): void {
  formGuru.value = {
    id: guru.id,
    nama: guru.nama,
    nip: guru.nip_nuptk || '',
    kode_prefiks: guru.kode_prefiks || '',
    jabatan: guru.jabatan || '',
    warna: guru.warna_badge || '#10b981'
  }
  isEditing.value = true
  selectedGuruId.value = guru.id
}

async function saveGuru(): Promise<void> {
  const namaError = validateRequiredField(formGuru.value.nama, 'Nama guru')
  if (namaError) {
    await uiStore.showAlert(namaError, 'Validasi Data Guru', 'warning')
    return
  }

  const existingIdx = store.proyek.master.guru.findIndex((g) => g.id === formGuru.value.id)
  if (existingIdx !== -1) {
    const existing = store.proyek.master.guru[existingIdx]
    store.updateGuru({
      ...existing,
      nama: formGuru.value.nama.trim(),
      nip_nuptk: formGuru.value.nip.trim() || undefined,
      kode_prefiks: formGuru.value.kode_prefiks?.trim() || undefined,
      jabatan: formGuru.value.jabatan?.trim() || undefined,
      warna_badge: formGuru.value.warna
    })
  } else {
    store.addGuru({
      id: formGuru.value.id,
      nama: formGuru.value.nama.trim(),
      nip_nuptk: formGuru.value.nip.trim() || undefined,
      kode_prefiks: formGuru.value.kode_prefiks?.trim() || undefined,
      jabatan: formGuru.value.jabatan?.trim() || undefined,
      warna_badge: formGuru.value.warna,
      tidak_bisa: {}
    })
    selectedGuruId.value = formGuru.value.id
  }
  isEditing.value = false
}

async function removeGuru(guruId: string): Promise<void> {
  const confirmed = await uiStore.showConfirm(
    'Yakin ingin menghapus guru ini? Seluruh penugasan terkait akan terpengaruh.',
    {
      title: 'Hapus Data Guru',
      confirmLabel: 'Ya, Hapus',
      variant: 'danger'
    }
  )
  if (confirmed) {
    store.deleteGuru(guruId)
    if (selectedGuruId.value === guruId) {
      selectedGuruId.value = store.proyek.master.guru[0]?.id || null
    }
  }
}

// Toggle ketersediaan jam mengajar guru (Availability Matrix)
function toggleAvailability(hari: string, slotId: string): void {
  if (!activeGuru.value) return

  const tidakBisa = { ...(activeGuru.value.tidak_bisa || {}) }
  const currentSlots = [...(tidakBisa[hari] || [])]

  const exists = currentSlots.includes(slotId)
  if (exists) {
    tidakBisa[hari] = currentSlots.filter((id) => id !== slotId)
    if (tidakBisa[hari].length === 0) {
      delete tidakBisa[hari]
    }
  } else {
    currentSlots.push(slotId)
    tidakBisa[hari] = currentSlots
  }

  store.updateGuru({
    ...activeGuru.value,
    tidak_bisa: tidakBisa
  })
}

function isSlotUnavailable(hari: string, slotId: string): boolean {
  if (!activeGuru.value?.tidak_bisa) return false
  return activeGuru.value.tidak_bisa[hari]?.includes(slotId) || false
}

async function setAllDayUnavailable(hari: string): Promise<void> {
  if (!activeGuru.value) return
  const dayData = store.proyek.struktur_waktu.hari[hari]
  if (!dayData) return

  const confirmed = await uiStore.showConfirm(
    `Tandai semua sesi KBM hari ${hari} sebagai berhalangan untuk ${activeGuru.value.nama}?`,
    {
      title: 'Tandai Izin Seharian',
      confirmLabel: 'Ya, Tandai'
    }
  )
  if (!confirmed) return

  const kbmSlotIds = dayData.slots.filter((s) => s.tipe === 'kbm').map((s) => s.id)
  const tidakBisa = { ...(activeGuru.value.tidak_bisa || {}) }
  tidakBisa[hari] = kbmSlotIds

  store.updateGuru({
    ...activeGuru.value,
    tidak_bisa: tidakBisa
  })
}

function clearDayUnavailable(hari: string): void {
  if (!activeGuru.value) return
  const tidakBisa = { ...(activeGuru.value.tidak_bisa || {}) }
  delete tidakBisa[hari]

  store.updateGuru({
    ...activeGuru.value,
    tidak_bisa: tidakBisa
  })
}
</script>

<template>
  <div class="flex h-full w-full gap-4 overflow-hidden p-4">
    <!-- Kolom Kiri: Daftar Guru -->
    <div class="flex w-80 flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg">
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Daftar Guru</h2>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">Total {{ store.proyek.master.guru.length }} guru terdaftar</p>
        </div>
        <button
          type="button"
          @click="openAddGuruModal"
          class="flex items-center space-x-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-900/30"
        >
          <UserPlus class="h-3.5 w-3.5" />
          <span>Tambah</span>
        </button>
      </div>

      <!-- List Guru -->
      <div class="border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <label for="guru-search" class="sr-only">Cari guru</label>
        <div class="relative">
          <Search class="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <input
            id="guru-search"
            v-model="guruSearch"
            type="search"
            autocomplete="off"
            placeholder="Cari nama, kode, atau NIP..."
            aria-describedby="guru-search-hint"
            class="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <p id="guru-search-hint" class="mt-1 px-1 text-[10px] text-slate-400">
          {{ filteredGurus.length }} dari {{ store.proyek.master.guru.length }} guru tampil
        </p>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div
          v-if="filteredGurus.length === 0"
          class="p-6 text-center text-xs text-slate-400 dark:text-slate-500"
        >
          {{ guruSearch ? 'Guru tidak ditemukan.' : 'Belum ada guru. Klik tombol Tambah di atas.' }}
        </div>

        <div
          v-for="guru in filteredGurus"
          :key="guru.id"
          @click="selectGuru(guru.id)"
          @keydown="handleGuruKeydown($event, guru.id)"
          role="button"
          tabindex="0"
          :aria-pressed="selectedGuruId === guru.id"
          :aria-label="`Pilih ${guru.nama}, ${getGuruCode(guru)}`"
          :class="[
            'group flex cursor-pointer items-center justify-between rounded-lg p-2.5 text-xs transition-all',
            selectedGuruId === guru.id
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-medium dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 border border-transparent'
          ]"
        >
          <div class="flex items-center space-x-2.5 overflow-hidden">
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-slate-950"
              :style="{ backgroundColor: guru.warna_badge || '#10b981' }"
            >
              {{ guru.nama.charAt(0) }}
            </span>
            <div class="truncate">
              <div class="flex items-center gap-1.5 truncate text-slate-800 dark:text-slate-100 font-medium">
                <span class="shrink-0 rounded bg-slate-100 px-1 font-mono text-[10px] text-emerald-700 dark:bg-slate-800 dark:text-emerald-300">
                  {{ getGuruCode(guru) }}
                </span>
                <span class="truncate">{{ guru.nama }}</span>
              </div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400">
                {{ guru.nip_nuptk ? `NIP: ${guru.nip_nuptk}` : 'Non-NIP' }}
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              @click.stop="editGuru(guru)"
              class="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
              :aria-label="`Edit ${guru.nama}`"
              title="Edit profil guru"
            >
              <Edit2 class="h-3 w-3" aria-hidden="true" />
            </button>
            <button
              type="button"
              @click.stop="removeGuru(guru.id)"
              class="rounded p-1 text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400"
              :aria-label="`Hapus ${guru.nama}`"
              title="Hapus guru"
            >
              <Trash2 class="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Kolom Kanan: Matriks Ketersediaan Guru -->
    <div class="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg overflow-hidden">
      <!-- Header Matriks -->
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-3.5">
        <div v-if="activeGuru">
          <div class="flex items-center space-x-2">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ activeGuru.nama }}</h3>
            <span class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
              {{ getGuruCode(activeGuru) }}
            </span>
            <span
              v-if="activeGuru.jabatan"
              class="rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-mono border border-slate-200 dark:border-transparent"
            >
              {{ activeGuru.jabatan }}
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Matriks ketersediaan jam mengajar (klik sel untuk menandai jam berhalangan / izin)
          </p>
        </div>
        <div v-else>
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Pilih Guru</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Pilih salah satu guru di kolom kiri untuk mengatur jadwal izinnya</p>
        </div>

        <div v-if="activeGuru" class="flex items-center space-x-2">
          <button
            type="button"
            @click="editGuru(activeGuru)"
            class="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Edit2 class="h-3.5 w-3.5" />
            <span>Edit Profil</span>
          </button>
        </div>
      </div>

      <!-- Body: Tampilan Matriks Ketersediaan Guru (Availability Matrix) -->
      <div v-if="activeGuru" class="flex-1 overflow-y-auto p-6">
        <div class="mb-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-1.5">
              <span class="h-3 w-3 rounded bg-emerald-100 border border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/40"></span>
              <span class="text-slate-700 dark:text-slate-300">Bisa Mengajar</span>
            </div>
            <div class="flex items-center space-x-1.5">
              <span class="h-3 w-3 rounded bg-rose-100 border border-rose-300 dark:bg-rose-500/20 dark:border-rose-500/40"></span>
              <span class="text-rose-600 dark:text-rose-400 font-medium">Berhalangan (Tidak Bisa)</span>
            </div>
          </div>
        </div>

        <!-- Tabel Matriks Hari x Slot Jam -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
          <table class="w-full text-left text-xs text-slate-800 dark:text-slate-200">
            <thead class="border-b border-slate-200 bg-slate-100 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3">Hari</th>
                <th
                  v-for="slot in maxSlots"
                  :key="slot.id"
                  class="px-2.5 py-3 text-center"
                >
                  {{ slot.nama }}
                </th>
                <th class="px-3 py-3 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800/60">
              <tr
                v-for="day in activeDays"
                :key="day.hari"
                class="hover:bg-slate-100/60 dark:hover:bg-slate-900/30 transition-colors"
              >
                <td class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-300">
                  {{ day.hari }}
                </td>

                <!-- Sel Slot Jam KBM -->
                <td
                  v-for="slot in maxSlots"
                  :key="slot.id"
                  class="px-1.5 py-2 text-center"
                >
                  <button
                    v-if="day.slots.some((s) => s.id === slot.id && s.tipe === 'kbm')"
                    type="button"
                    @click="toggleAvailability(day.hari, slot.id)"
                    :class="[
                      'h-8 w-full min-w-[40px] rounded-lg border text-xs font-semibold transition-all flex items-center justify-center',
                      isSlotUnavailable(day.hari, slot.id)
                        ? 'border-rose-300 bg-rose-100 text-rose-700 shadow-sm dark:border-rose-500/50 dark:bg-rose-500/20 dark:text-rose-400'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400'
                    ]"
                    :title="isSlotUnavailable(day.hari, slot.id) ? 'Status: Berhalangan' : 'Status: Tersedia'"
                    :aria-label="`${day.hari}, ${slot.nama}: ${isSlotUnavailable(day.hari, slot.id) ? 'berhalangan' : 'tersedia'}`"
                  >
                    <span v-if="isSlotUnavailable(day.hari, slot.id)">✕</span>
                    <span v-else>✓</span>
                  </button>
                  <span v-else class="text-slate-400 dark:text-slate-600 text-[10px]">—</span>
                </td>

                <td class="px-3 py-2 text-right">
                  <div class="flex items-center justify-end space-x-1 text-[10px]">
                    <button
                      type="button"
                      @click="setAllDayUnavailable(day.hari)"
                      class="rounded bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors px-2 py-1"
                    >
                      Izin Sehari
                    </button>
                    <button
                      type="button"
                      @click="clearDayUnavailable(day.hari)"
                      class="rounded bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors px-2 py-1"
                    >
                      Reset
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- State Kosong: Belum Pilih Guru -->
      <div v-else class="flex flex-1 items-center justify-center p-8 text-center text-xs text-slate-500 dark:text-slate-400">
        <div>
          <Calendar class="mx-auto h-8 w-8 text-slate-400 dark:text-slate-600 mb-2" />
          <p>Pilih salah satu guru di sebelah kiri untuk melihat dan menyunting matriks ketersediaan jam mengajarnya.</p>
        </div>
      </div>
    </div>

    <!-- Modal Overlay Tambah / Edit Data Guru -->
    <div
      v-if="isEditing"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guru-modal-title"
      tabindex="-1"
      @keydown.esc="isEditing = false"
    >
      <div class="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div>
            <h3 id="guru-modal-title" class="text-sm font-bold text-slate-900 dark:text-slate-100">
              {{ store.proyek.master.guru.some(g => g.id === formGuru.id) ? 'Edit Data Guru' : 'Tambah Guru Baru' }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Masukkan identitas lengkap guru &amp; kode pengampu</p>
          </div>
          <button
            type="button"
            @click="isEditing = false"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Tutup form guru"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-4 p-6">
          <div>
            <label for="guru-name" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap &amp; Gelar *</label>
            <input
              id="guru-name"
              v-model="formGuru.nama"
              type="text"
              placeholder="Contoh: Drs. H. Ahmad Dahlan, M.Pd."
              class="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="guru-nip" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">NIP / NUPTK</label>
              <input
                id="guru-nip"
                v-model="formGuru.nip"
                type="text"
                placeholder="19xxxxxxxxxxxxxx"
                class="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <label for="guru-jabatan" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jabatan / Peran</label>
              <input
                id="guru-jabatan"
                v-model="formGuru.jabatan"
                type="text"
                placeholder="Contoh: Wali Kelas VII A"
                class="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="guru-code" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Kode Guru</label>
              <input
                id="guru-code"
                v-model="formGuru.kode_prefiks"
                type="text"
                placeholder="Contoh: G01, AF, BIO"
                class="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <label for="guru-color" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Warna Penanda</label>
              <div class="flex items-center space-x-2">
                <input
                  id="guru-color"
                  v-model="formGuru.warna"
                  type="color"
                  class="h-9 w-12 rounded cursor-pointer border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-0.5"
                />
                <span class="text-xs font-mono text-slate-500 dark:text-slate-400">{{ formGuru.warna }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2 border-t border-slate-200 bg-slate-50/70 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
          <button
            type="button"
            @click="isEditing = false"
            class="rounded-lg px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Batal
          </button>
          <button
            type="button"
            @click="saveGuru"
            class="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <Check class="h-3.5 w-3.5" />
            <span>Simpan Data</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
