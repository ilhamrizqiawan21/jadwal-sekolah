<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  UserPlus,
  Trash2,
  Edit2,
  Check,
  X,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-vue-next'
import { Guru } from '@core/types'
import { useScheduleStore } from '../../stores/scheduleStore'

const store = useScheduleStore()

const selectedGuruId = ref<string | null>(null)
const isEditing = ref<boolean>(false)

// Form State Guru
const formGuru = ref<{
  id: string
  nama: string
  nip: string
  kode_prefiks?: string
  warna?: string
}>({
  id: '',
  nama: '',
  nip: '',
  kode_prefiks: '',
  warna: '#10b981'
})

// Guru terpilih saat ini
const activeGuru = computed(() => {
  return store.proyek.master.guru.find((g) => g.id === selectedGuruId.value) || null
})

// Hari aktif KBM
const activeDays = computed(() => {
  return Object.entries(store.proyek.struktur_waktu.hari)
    .filter(([_, data]) => data.aktif)
    .map(([hari, data]) => ({ hari, ...data }))
})

// Daftar slot KBM maksimal untuk header tabel
const maxSlots = computed(() => {
  let slots: Array<{ id: string; nama: string }> = []
  for (const day of activeDays.value) {
    const kbmSlots = day.slots.filter((s) => s.tipe === 'kbm')
    if (kbmSlots.length > slots.length) {
      slots = kbmSlots.map((s) => ({ id: s.id, nama: s.label || s.id }))
    }
  }
  return slots
})

function selectGuru(guruId: string): void {
  selectedGuruId.value = guruId
  isEditing.value = false
}

function openAddGuruModal(): void {
  const nextNum = store.proyek.master.guru.length + 1
  formGuru.value = {
    id: `guru:${Date.now()}`,
    nama: '',
    nip: '',
    kode_prefiks: `${nextNum}`,
    warna: '#10b981'
  }
  isEditing.value = true
  selectedGuruId.value = null
}

function editGuru(guru: Guru): void {
  formGuru.value = {
    id: guru.id,
    nama: guru.nama,
    nip: guru.nip || '',
    kode_prefiks: guru.kode_prefiks || '',
    warna: guru.warna || '#10b981'
  }
  isEditing.value = true
  selectedGuruId.value = guru.id
}

function saveGuru(): void {
  if (!formGuru.value.nama.trim()) return

  const existingIdx = store.proyek.master.guru.findIndex((g) => g.id === formGuru.value.id)
  if (existingIdx !== -1) {
    const existing = store.proyek.master.guru[existingIdx]
    store.updateGuru({
      ...existing,
      nama: formGuru.value.nama.trim(),
      nip: formGuru.value.nip.trim(),
      kode_prefiks: formGuru.value.kode_prefiks?.trim(),
      warna: formGuru.value.warna
    })
  } else {
    store.addGuru({
      id: formGuru.value.id,
      nama: formGuru.value.nama.trim(),
      nip: formGuru.value.nip.trim(),
      kode_prefiks: formGuru.value.kode_prefiks?.trim(),
      warna: formGuru.value.warna,
      tidak_bisa: {}
    })
    selectedGuruId.value = formGuru.value.id
  }
  isEditing.value = false
}

function removeGuru(guruId: string): void {
  if (confirm('Yakin ingin menghapus guru ini? Seluruh penugasan terkait akan terpengaruh.')) {
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

function setAllDayUnavailable(hari: string): void {
  if (!activeGuru.value) return
  const dayData = store.proyek.struktur_waktu.hari[hari]
  if (!dayData) return

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
    <div class="flex w-80 flex-col rounded-xl border border-slate-800 bg-slate-950/60 shadow-lg">
      <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold text-slate-100">Daftar Guru</h2>
          <p class="text-[11px] text-slate-400">Total {{ store.proyek.master.guru.length }} guru terdaftar</p>
        </div>
        <button
          @click="openAddGuruModal"
          class="flex items-center space-x-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-900/30"
        >
          <UserPlus class="h-3.5 w-3.5" />
          <span>Tambah</span>
        </button>
      </div>

      <!-- List Guru -->
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div
          v-if="store.proyek.master.guru.length === 0"
          class="p-6 text-center text-xs text-slate-500"
        >
          Belum ada guru. Klik tombol Tambah di atas.
        </div>

        <div
          v-for="guru in store.proyek.master.guru"
          :key="guru.id"
          @click="selectGuru(guru.id)"
          :class="[
            'group flex cursor-pointer items-center justify-between rounded-lg p-2.5 text-xs transition-all',
            selectedGuruId === guru.id
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium'
              : 'text-slate-300 hover:bg-slate-900 border border-transparent'
          ]"
        >
          <div class="flex items-center space-x-2.5 overflow-hidden">
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-slate-950"
              :style="{ backgroundColor: guru.warna || '#10b981' }"
            >
              {{ guru.kode_prefiks || guru.nama.charAt(0) }}
            </span>
            <div class="truncate">
              <div class="truncate text-slate-100 font-medium">{{ guru.nama }}</div>
              <div class="text-[10px] text-slate-400">
                {{ guru.nip ? `NIP: ${guru.nip}` : 'Non-NIP' }}
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              @click.stop="editGuru(guru)"
              class="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <Edit2 class="h-3 w-3" />
            </button>
            <button
              @click.stop="removeGuru(guru.id)"
              class="rounded p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400"
            >
              <Trash2 class="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Kolom Kanan: Form Edit / Matriks Ketersediaan Guru -->
    <div class="flex flex-1 flex-col rounded-xl border border-slate-800 bg-slate-950/60 shadow-lg overflow-hidden">
      <!-- Header Matriks / Form -->
      <div class="flex items-center justify-between border-b border-slate-800 px-6 py-3.5">
        <div v-if="activeGuru">
          <div class="flex items-center space-x-2">
            <h3 class="text-sm font-semibold text-slate-100">{{ activeGuru.nama }}</h3>
            <span
              v-if="activeGuru.kode_prefiks"
              class="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400"
            >
              Kode: {{ activeGuru.kode_prefiks }}
            </span>
          </div>
          <p class="text-xs text-slate-400">
            Matriks ketersediaan jam mengajar (klik sel untuk menandai jam berhalangan / izin)
          </p>
        </div>
        <div v-else-if="isEditing">
          <h3 class="text-sm font-semibold text-slate-100">
            {{ formGuru.id.startsWith('guru:') ? 'Tambah Guru Baru' : 'Edit Data Guru' }}
          </h3>
          <p class="text-xs text-slate-400">Masukkan identitas lengkap guru</p>
        </div>
        <div v-else>
          <h3 class="text-sm font-semibold text-slate-100">Pilih Guru</h3>
          <p class="text-xs text-slate-400">Pilih salah satu guru di kolom kiri untuk mengatur jadwal izinnya</p>
        </div>

        <div v-if="activeGuru && !isEditing" class="flex items-center space-x-2">
          <button
            @click="editGuru(activeGuru)"
            class="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <Edit2 class="h-3.5 w-3.5" />
            <span>Edit Profil</span>
          </button>
        </div>
      </div>

      <!-- Body: Jika Sedang Mode Edit/Tambah Guru -->
      <div v-if="isEditing" class="p-6">
        <div class="max-w-md space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Nama Lengkap & Gelar *</label>
            <input
              v-model="formGuru.nama"
              type="text"
              placeholder="Contoh: Drs. H. Ahmad Dahlan, M.Pd."
              class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">NIP / NUPTK</label>
            <input
              v-model="formGuru.nip"
              type="text"
              placeholder="19xxxxxxxxxxxxxx (opsional)"
              class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Kode Singkat</label>
              <input
                v-model="formGuru.kode_prefiks"
                type="text"
                placeholder="Contoh: 1, 2, BIO"
                class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Warna Penanda</label>
              <div class="flex items-center space-x-2">
                <input
                  v-model="formGuru.warna"
                  type="color"
                  class="h-9 w-12 rounded cursor-pointer border border-slate-700 bg-slate-900 p-0.5"
                />
                <span class="text-xs font-mono text-slate-400">{{ formGuru.warna }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2 pt-2">
            <button
              @click="saveGuru"
              class="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-md"
            >
              <Check class="h-3.5 w-3.5" />
              <span>Simpan Data</span>
            </button>
            <button
              @click="isEditing = false"
              class="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Batal
            </button>
          </div>
        </div>
      </div>

      <!-- Body: Tampilan Matriks Ketersediaan Guru (Availability Matrix) -->
      <div v-else-if="activeGuru" class="flex-1 overflow-y-auto p-6">
        <div class="mb-4 flex items-center justify-between text-xs text-slate-400">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-1.5">
              <span class="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500/40"></span>
              <span>Bisa Mengajar</span>
            </div>
            <div class="flex items-center space-x-1.5">
              <span class="h-3 w-3 rounded bg-rose-500/20 border border-rose-500/40"></span>
              <span class="text-rose-400 font-medium">Berhalangan (Tidak Bisa)</span>
            </div>
          </div>
        </div>

        <!-- Tabel Matriks Hari x Slot Jam -->
        <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table class="w-full text-left text-xs text-slate-200">
            <thead class="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase">
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
            <tbody class="divide-y divide-slate-800/60">
              <tr
                v-for="day in activeDays"
                :key="day.hari"
                class="hover:bg-slate-900/30 transition-colors"
              >
                <td class="px-4 py-3 font-semibold text-slate-300">
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
                    @click="toggleAvailability(day.hari, slot.id)"
                    :class="[
                      'h-8 w-full min-w-[40px] rounded-lg border text-xs font-semibold transition-all flex items-center justify-center',
                      isSlotUnavailable(day.hari, slot.id)
                        ? 'border-rose-500/50 bg-rose-500/20 text-rose-400 shadow-sm shadow-rose-900/20'
                        : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:border-emerald-500/40'
                    ]"
                    :title="isSlotUnavailable(day.hari, slot.id) ? 'Status: Berhalangan' : 'Status: Tersedia'"
                  >
                    <span v-if="isSlotUnavailable(day.hari, slot.id)">✕</span>
                    <span v-else>✓</span>
                  </button>
                  <span v-else class="text-slate-600 text-[10px]">—</span>
                </td>

                <td class="px-3 py-2 text-right">
                  <div class="flex items-center justify-end space-x-1 text-[10px]">
                    <button
                      @click="setAllDayUnavailable(day.hari)"
                      class="rounded bg-rose-500/10 px-2 py-1 text-rose-400 hover:bg-rose-500/20 transition-colors"
                    >
                      Izin Sehari
                    </button>
                    <button
                      @click="clearDayUnavailable(day.hari)"
                      class="rounded bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700 transition-colors"
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
      <div v-else class="flex flex-1 items-center justify-center p-8 text-center text-xs text-slate-500">
        <div>
          <Calendar class="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <p>Pilih salah satu guru di sebelah kiri untuk melihat dan menyunting matriks ketersediaan jam mengajarnya.</p>
        </div>
      </div>
    </div>
  </div>
</template>
