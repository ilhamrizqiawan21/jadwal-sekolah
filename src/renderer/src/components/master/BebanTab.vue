<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Trash2, Pencil, Check, BookOpen, Users, Layers } from 'lucide-vue-next'
import { Penugasan } from '@core/types'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useNotifyStore } from '../../stores/notifyStore'
import BaseModal from '../ui/BaseModal.vue'

const store = useScheduleStore()
const notify = useNotifyStore()

const PALET_SEL = ['#FDE68A', '#BFDBFE', '#C7D2FE', '#BBF7D0', '#FBCFE8', '#DDD6FE', '#FED7AA', '#A7F3D0', '#FECDD3', '#BAE6FD']

const isEditing = ref<boolean>(false)
const isNew = ref<boolean>(false)
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
  warna: PALET_SEL[0],
  beban: {}
})

const kelasList = computed(() => store.proyek.master.kelas)
const guruList = computed(() => store.proyek.master.guru)

function guruIdsOf(a: Penugasan): string[] {
  return a.guru_ids && a.guru_ids.length > 0 ? a.guru_ids : a.guru_id ? [a.guru_id] : []
}

// Kode yang dipegang lebih dari satu guru (tanpa mode team teaching) layak ditandai
const kodeClashes = computed(() => {
  const map: Record<string, Set<string>> = {}
  for (const a of store.proyek.master.penugasan) {
    const key = a.kode.toUpperCase()
    map[key] ??= new Set()
    for (const gid of guruIdsOf(a)) map[key].add(gid)
  }
  const clashes: Record<string, boolean> = {}
  for (const kode in map) if (map[kode].size > 1) clashes[kode] = true
  return clashes
})

// Peringatan saat kode yang sedang diketik sudah dipakai penugasan lain
const kodeSudahAda = computed(() => {
  const kode = formPenugasan.value.kode.trim().toUpperCase()
  if (!kode) return null
  return (
    store.proyek.master.penugasan.find(
      (a) => a.id !== formPenugasan.value.id && a.kode.toUpperCase() === kode
    ) ?? null
  )
})

function getTotalBeban(penugasan: Penugasan): number {
  return Object.values(penugasan.beban).reduce((sum, b) => sum + (b || 0), 0)
}

function getTerpasangTotal(penugasan: Penugasan): number {
  let count = 0
  for (const kelas of kelasList.value) {
    count += store.terpasang[`${penugasan.kode.toUpperCase()}:${kelas.id}`] || 0
  }
  return count
}

function openAddModal(): void {
  const initialBeban: Record<string, number> = {}
  kelasList.value.forEach((k) => {
    initialBeban[k.id] = 0
  })

  let nomor = store.proyek.master.penugasan.length + 1
  const dipakai = new Set(store.proyek.master.penugasan.map((a) => a.kode.toUpperCase()))
  while (dipakai.has(String(nomor))) nomor++

  formPenugasan.value = {
    id: `penugasan:${Date.now()}`,
    guru_id: guruList.value[0]?.id || '',
    guru_ids: [],
    is_team_teaching: false,
    kode: String(nomor),
    mapel: '',
    kategori: 'Wajib',
    warna: PALET_SEL[store.proyek.master.penugasan.length % PALET_SEL.length],
    beban: initialBeban
  }
  isNew.value = true
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
    warna: a.warna_sel || a.warna || PALET_SEL[0],
    beban: initialBeban
  }
  isNew.value = false
  isEditing.value = true
}

const formValid = computed(() => {
  const f = formPenugasan.value
  if (!f.kode.trim() || !f.mapel.trim()) return false
  return f.is_team_teaching ? f.guru_ids.length >= 2 : Boolean(f.guru_id)
})

function savePenugasan(): void {
  const f = formPenugasan.value
  if (!formValid.value) {
    notify.warn(
      f.is_team_teaching ? 'Pilih minimal dua guru untuk team teaching' : 'Lengkapi kode, mapel, dan guru pengampu'
    )
    return
  }

  const cleanBeban: Record<string, number> = {}
  for (const kId in f.beban) {
    const val = Math.max(0, Math.min(20, Math.round(Number(f.beban[kId]) || 0)))
    if (val > 0) cleanBeban[kId] = val
  }

  const existing = store.proyek.master.penugasan.find((p) => p.id === f.id)
  // Bidang lain (keterangan, bbt_jam, dan seterusnya) dari berkas lama dipertahankan
  const payload: Penugasan = {
    ...existing,
    id: f.id,
    guru_id: f.is_team_teaching ? f.guru_ids[0] || '' : f.guru_id,
    guru_ids: f.is_team_teaching ? [...f.guru_ids] : undefined,
    kode: f.kode.trim(),
    mapel: f.mapel.trim(),
    kategori: f.kategori,
    warna: f.warna,
    warna_sel: f.warna,
    beban: cleanBeban
  }

  if (existing) store.updatePenugasan(payload)
  else store.addPenugasan(payload)
  isEditing.value = false
}

async function removePenugasan(a: Penugasan): Promise<void> {
  const ok = await notify.confirm({
    title: `Hapus penugasan ${a.kode} (${a.mapel})?`,
    message:
      'Sel jadwal yang memakai kode ini akan ditandai sebagai kode tidak dikenal. Anda masih bisa membatalkannya dengan Undo.',
    confirmLabel: 'Hapus penugasan',
    danger: true
  })
  if (ok) store.deletePenugasan(a.id)
}

function getGuruDisplay(a: Penugasan): string {
  if (a.guru_ids && a.guru_ids.length > 1) {
    return a.guru_ids.map((gid) => guruList.value.find((g) => g.id === gid)?.nama || gid).join(' & ')
  }
  const single = guruList.value.find((g) => g.id === a.guru_id)
  return single ? single.nama : 'Belum ditentukan'
}

const totalJpForm = computed(() =>
  Object.values(formPenugasan.value.beban).reduce((s, v) => s + (Number(v) || 0), 0)
)
</script>

<template>
  <div class="flex h-full w-full flex-col gap-4 overflow-hidden p-4 sm:p-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">Beban Mengajar</h1>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Kelola kode mata pelajaran, guru pengampu termasuk team teaching, dan alokasi JP per kelas.
        </p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">
        <Plus class="h-4 w-4" />
        Tambah penugasan
      </button>
    </header>

    <div class="card min-h-0 flex-1 overflow-auto">
      <table class="data-table">
        <thead>
          <tr>
            <th class="w-20 px-4 py-3 text-center">Kode</th>
            <th class="px-4 py-3">Mata pelajaran</th>
            <th class="px-4 py-3">Guru pengampu</th>
            <th class="px-4 py-3 text-center">Target</th>
            <th class="px-4 py-3 text-center">Terplot</th>
            <th class="px-4 py-3">Status</th>
            <th class="w-24 px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.proyek.master.penugasan.length === 0">
            <td colspan="7" class="px-4 py-16 text-center">
              <Layers class="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
              <p class="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">Belum ada penugasan</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Tambahkan guru dan kelas terlebih dahulu, lalu buat penugasan pertama.
              </p>
            </td>
          </tr>

          <tr v-for="a in store.proyek.master.penugasan" :key="a.id">
            <td class="px-4 py-2.5 text-center">
              <span
                class="inline-flex min-w-[2rem] items-center justify-center rounded-lg px-2 py-1 font-mono text-xs font-bold text-slate-900 ring-1 ring-inset ring-black/10"
                :style="{ backgroundColor: a.warna_sel || a.warna || '#E2E8F0' }"
                :title="kodeClashes[a.kode.toUpperCase()] ? 'Kode ini dipegang beberapa guru berbeda' : 'Kode valid'"
              >
                {{ a.kode }}
              </span>
              <div
                v-if="kodeClashes[a.kode.toUpperCase()]"
                class="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
              >
                dipakai bersama
              </div>
            </td>

            <td class="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
              <div class="flex items-center gap-1.5">
                <BookOpen class="h-3.5 w-3.5 text-slate-400" />
                <span>{{ a.mapel }}</span>
              </div>
            </td>

            <td class="px-4 py-2.5 text-slate-600 dark:text-slate-300">
              <span v-if="a.guru_ids && a.guru_ids.length > 1" class="chip mr-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                Tim
              </span>
              {{ getGuruDisplay(a) }}
            </td>

            <td class="px-4 py-2.5 text-center font-mono text-slate-600 dark:text-slate-300">{{ getTotalBeban(a) }} JP</td>

            <td class="px-4 py-2.5 text-center font-mono font-semibold">
              <span
                :class="
                  getTerpasangTotal(a) === getTotalBeban(a)
                    ? 'text-brand-600 dark:text-brand-400'
                    : getTerpasangTotal(a) > getTotalBeban(a)
                      ? 'text-conflict-600 dark:text-conflict-400'
                      : 'text-amber-600 dark:text-amber-400'
                "
              >
                {{ getTerpasangTotal(a) }} JP
              </span>
            </td>

            <td class="px-4 py-2.5">
              <span
                v-if="getTerpasangTotal(a) === getTotalBeban(a)"
                class="chip bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
              >
                Lengkap
              </span>
              <span
                v-else-if="getTerpasangTotal(a) < getTotalBeban(a)"
                class="chip bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
              >
                Sisa {{ getTotalBeban(a) - getTerpasangTotal(a) }} JP
              </span>
              <span v-else class="chip bg-conflict-50 text-conflict-700 dark:bg-conflict-500/15 dark:text-conflict-300">
                Lebih {{ getTerpasangTotal(a) - getTotalBeban(a) }} JP
              </span>
            </td>

            <td class="px-4 py-2.5">
              <div class="flex items-center justify-end gap-0.5">
                <button class="btn-icon" :aria-label="`Ubah ${a.mapel}`" title="Ubah penugasan" @click="editPenugasan(a)">
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  class="btn-icon hover:!bg-conflict-50 hover:!text-conflict-600 dark:hover:!bg-conflict-500/15"
                  :aria-label="`Hapus ${a.mapel}`"
                  title="Hapus penugasan"
                  @click="removePenugasan(a)"
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
      size="lg"
      :title="isNew ? 'Tambah penugasan' : 'Ubah penugasan'"
      description="Tentukan kode, mata pelajaran, guru, dan distribusi JP per kelas."
    >
      <div class="space-y-5">
        <div class="grid grid-cols-[7rem_1fr_auto] gap-4">
          <div>
            <label class="field-label" for="pn-kode">Kode</label>
            <input id="pn-kode" v-model="formPenugasan.kode" data-autofocus type="text" maxlength="12" class="field font-mono" />
          </div>
          <div>
            <label class="field-label" for="pn-mapel">Mata pelajaran</label>
            <input id="pn-mapel" v-model="formPenugasan.mapel" type="text" maxlength="80" placeholder="Contoh: Matematika" class="field" />
          </div>
          <div>
            <span class="field-label">Warna sel</span>
            <div class="flex h-[38px] items-center gap-1">
              <button
                v-for="c in PALET_SEL.slice(0, 5)"
                :key="c"
                type="button"
                :class="[
                  'h-6 w-6 rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-slate-900',
                  formPenugasan.warna === c ? 'ring-2 ring-brand-500' : 'ring-1 ring-black/10 hover:scale-110'
                ]"
                :style="{ backgroundColor: c }"
                :aria-label="`Warna ${c}`"
                @click="formPenugasan.warna = c"
              />
              <input v-model="formPenugasan.warna" type="color" class="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label="Warna kustom" />
            </div>
          </div>
        </div>
        <p
          v-if="kodeSudahAda"
          class="-mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
        >
          Kode ini sudah dipakai penugasan {{ kodeSudahAda.mapel }}. Gunakan hanya jika memang kode bersama untuk team teaching.
        </p>

        <div class="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Users class="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Team teaching</span>
            </div>
            <label class="relative inline-flex cursor-pointer">
              <input v-model="formPenugasan.is_team_teaching" type="checkbox" class="peer sr-only" aria-label="Aktifkan team teaching" />
              <span class="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/20 dark:bg-slate-700" />
              <span class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
            </label>
          </div>

          <div v-if="!formPenugasan.is_team_teaching">
            <label class="field-label" for="pn-guru">Guru pengampu</label>
            <select id="pn-guru" v-model="formPenugasan.guru_id" class="field">
              <option v-for="g in guruList" :key="g.id" :value="g.id">
                {{ g.nama }}{{ g.nip_nuptk || g.nip ? ` (${g.nip_nuptk || g.nip})` : '' }}
              </option>
            </select>
          </div>

          <div v-else class="space-y-2">
            <span class="field-label">Pilih guru tim (minimal 2)</span>
            <div class="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto">
              <label
                v-for="g in guruList"
                :key="g.id"
                class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-2 text-xs transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <input
                  v-model="formPenugasan.guru_ids"
                  type="checkbox"
                  :value="g.id"
                  class="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span class="truncate text-slate-800 dark:text-slate-200">{{ g.nama }}</span>
              </label>
            </div>
          </div>
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <span class="field-label !mb-0">Alokasi JP per kelas (per minggu)</span>
            <span class="font-mono text-[11px] text-slate-500 dark:text-slate-400">Total {{ totalJpForm }} JP</span>
          </div>
          <div v-if="kelasList.length === 0" class="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            Belum ada kelas. Tambahkan kelas di menu Data Kelas.
          </div>
          <div v-else class="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-3 lg:grid-cols-4">
            <label
              v-for="k in kelasList"
              :key="k.id"
              class="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-slate-800/60"
            >
              <span class="truncate font-medium text-slate-700 dark:text-slate-300">{{ k.nama }}</span>
              <input
                v-model.number="formPenugasan.beban[k.id]"
                type="number"
                min="0"
                max="20"
                class="field !w-14 !rounded-lg !px-1.5 !py-1 text-center font-mono !text-xs"
                :aria-label="`JP untuk kelas ${k.nama}`"
              />
            </label>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn btn-ghost" @click="isEditing = false">Batal</button>
        <button class="btn btn-primary" @click="savePenugasan">
          <Check class="h-3.5 w-3.5" />
          Simpan penugasan
        </button>
      </template>
    </BaseModal>
  </div>
</template>
