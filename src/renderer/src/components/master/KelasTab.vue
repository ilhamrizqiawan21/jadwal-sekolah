<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Trash2, Pencil, Check, ChevronUp, ChevronDown, GraduationCap } from 'lucide-vue-next'
import { Kelas } from '@core/types'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useNotifyStore } from '../../stores/notifyStore'
import BaseModal from '../ui/BaseModal.vue'

const store = useScheduleStore()
const notify = useNotifyStore()

const isEditing = ref<boolean>(false)
const isNew = ref<boolean>(false)
const formKelas = ref<{
  id: string
  nama: string
  tingkat: number
  wali_guru_id: string | null
}>({ id: '', nama: '', tingkat: 7, wali_guru_id: null })

const namaTerpakai = computed(() => {
  const nama = formKelas.value.nama.trim().toLowerCase()
  if (!nama) return false
  return store.proyek.master.kelas.some(
    (k) => k.id !== formKelas.value.id && k.nama.trim().toLowerCase() === nama
  )
})

// Total JP riil dalam seminggu dari struktur waktu yang aktif
const totalWeeklyJP = computed(() => {
  let count = 0
  for (const day of Object.values(store.proyek.struktur_waktu.hari)) {
    if (!day.aktif) continue
    for (const s of day.slots) {
      if (s.tipe === 'kbm') count += s.jp.length > 0 ? s.jp.length : 2
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
  formKelas.value = { id: `kelas:${Date.now()}`, nama: '', tingkat: 7, wali_guru_id: null }
  isNew.value = true
  isEditing.value = true
}

function editKelas(k: Kelas): void {
  formKelas.value = {
    id: k.id,
    nama: k.nama,
    tingkat: k.tingkat || 7,
    wali_guru_id: k.wali_guru_id || null
  }
  isNew.value = false
  isEditing.value = true
}

function saveKelas(): void {
  const nama = formKelas.value.nama.trim()
  if (!nama || namaTerpakai.value) return

  if (isNew.value) {
    store.addKelas({
      id: formKelas.value.id,
      nama,
      tingkat: Number(formKelas.value.tingkat),
      urutan: store.proyek.master.kelas.length + 1,
      wali_guru_id: formKelas.value.wali_guru_id || null
    })
  } else {
    const existing = store.proyek.master.kelas.find((k) => k.id === formKelas.value.id)
    if (existing) {
      store.updateKelas({
        ...existing,
        nama,
        tingkat: Number(formKelas.value.tingkat),
        wali_guru_id: formKelas.value.wali_guru_id || null
      })
    }
  }
  isEditing.value = false
}

async function removeKelas(k: Kelas): Promise<void> {
  const terisi = getTerpasangCount(k.id)
  const ok = await notify.confirm({
    title: `Hapus kelas ${k.nama}?`,
    message:
      terisi > 0
        ? `${terisi} JP yang sudah dijadwalkan untuk kelas ini ikut terhapus. Anda masih bisa membatalkannya dengan Undo.`
        : 'Kelas ini belum memiliki jadwal.',
    confirmLabel: 'Hapus kelas',
    danger: true
  })
  if (ok) store.deleteKelas(k.id)
}

function moveUp(index: number): void {
  if (index > 0) store.reorderKelas(index, index - 1)
}

function moveDown(index: number): void {
  if (index < store.proyek.master.kelas.length - 1) store.reorderKelas(index, index + 1)
}

function getGuruName(guruId: string | null | undefined): string {
  if (!guruId) return 'Belum ditentukan'
  const g = store.proyek.master.guru.find((guru) => guru.id === guruId)
  return g ? g.nama : 'Tidak ditemukan'
}
</script>

<template>
  <div class="flex h-full w-full flex-col gap-4 overflow-hidden p-4 sm:p-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">Rombongan Belajar</h1>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Atur daftar kelas, tingkat, wali kelas, dan urutan kolom pada kisi jadwal.
        </p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">
        <Plus class="h-4 w-4" />
        Tambah kelas
      </button>
    </header>

    <div class="card min-h-0 flex-1 overflow-auto">
      <table class="data-table">
        <thead>
          <tr>
            <th class="w-28 px-4 py-3 text-center">Urutan</th>
            <th class="px-4 py-3">Nama rombel</th>
            <th class="px-4 py-3">Tingkat</th>
            <th class="px-4 py-3">Wali kelas</th>
            <th class="px-4 py-3 text-center">Jam terplot</th>
            <th class="w-28 px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.proyek.master.kelas.length === 0">
            <td colspan="6" class="px-4 py-16 text-center">
              <GraduationCap class="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
              <p class="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">Belum ada kelas</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Tambahkan kelas pertama agar kisi jadwal dapat dibuat.
              </p>
            </td>
          </tr>

          <tr v-for="(k, idx) in store.proyek.master.kelas" :key="k.id">
            <td class="px-4 py-2.5">
              <div class="flex items-center justify-center gap-0.5">
                <button
                  :disabled="idx === 0"
                  class="btn-icon !h-7 !w-7"
                  :aria-label="`Naikkan ${k.nama}`"
                  @click="moveUp(idx)"
                >
                  <ChevronUp class="h-3.5 w-3.5" />
                </button>
                <span class="w-5 text-center font-mono text-xs text-slate-500 dark:text-slate-400">{{ idx + 1 }}</span>
                <button
                  :disabled="idx === store.proyek.master.kelas.length - 1"
                  class="btn-icon !h-7 !w-7"
                  :aria-label="`Turunkan ${k.nama}`"
                  @click="moveDown(idx)"
                >
                  <ChevronDown class="h-3.5 w-3.5" />
                </button>
              </div>
            </td>

            <td class="px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ k.nama }}</td>

            <td class="px-4 py-2.5">
              <span class="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Kelas {{ k.tingkat || '-' }}
              </span>
            </td>

            <td class="px-4 py-2.5 text-slate-600 dark:text-slate-300">{{ getGuruName(k.wali_guru_id) }}</td>

            <td class="px-4 py-2.5 text-center">
              <span
                :class="[
                  'chip font-mono',
                  getTerpasangCount(k.id) >= totalWeeklyJP
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                ]"
              >
                {{ getTerpasangCount(k.id) }} / {{ totalWeeklyJP }} JP
              </span>
            </td>

            <td class="px-4 py-2.5">
              <div class="flex items-center justify-end gap-0.5">
                <button class="btn-icon" :aria-label="`Ubah ${k.nama}`" title="Ubah kelas" @click="editKelas(k)">
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  class="btn-icon hover:!bg-conflict-50 hover:!text-conflict-600 dark:hover:!bg-conflict-500/15"
                  :aria-label="`Hapus ${k.nama}`"
                  title="Hapus kelas"
                  @click="removeKelas(k)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal
      v-model="isEditing"
      :title="isNew ? 'Tambah kelas' : 'Ubah kelas'"
      description="Lengkapi informasi rombongan belajar."
    >
      <form class="space-y-4" @submit.prevent="saveKelas">
        <div>
          <label class="field-label" for="kelas-nama">Nama rombel</label>
          <input
            id="kelas-nama"
            v-model="formKelas.nama"
            data-autofocus
            type="text"
            maxlength="40"
            placeholder="Contoh: 7A, X-IPA 1, XII TKJ 2"
            class="field"
          />
          <p v-if="namaTerpakai" class="mt-1.5 text-[11px] font-medium text-conflict-600 dark:text-conflict-400">
            Nama kelas ini sudah dipakai.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="field-label" for="kelas-tingkat">Tingkat</label>
            <input id="kelas-tingkat" v-model.number="formKelas.tingkat" type="number" min="1" max="13" class="field" />
          </div>
          <div>
            <label class="field-label" for="kelas-wali">Wali kelas</label>
            <select id="kelas-wali" v-model="formKelas.wali_guru_id" class="field">
              <option :value="null">Tidak ada</option>
              <option v-for="guru in store.proyek.master.guru" :key="guru.id" :value="guru.id">
                {{ guru.nama }}
              </option>
            </select>
          </div>
        </div>
        <button type="submit" class="hidden" tabindex="-1" aria-hidden="true" />
      </form>

      <template #footer>
        <button class="btn btn-ghost" @click="isEditing = false">Batal</button>
        <button class="btn btn-primary" :disabled="!formKelas.nama.trim() || namaTerpakai" @click="saveKelas">
          <Check class="h-3.5 w-3.5" />
          Simpan kelas
        </button>
      </template>
    </BaseModal>
  </div>
</template>
