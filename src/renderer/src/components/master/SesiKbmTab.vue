<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Copy,
  Plus,
  Save,
  Trash2
} from 'lucide-vue-next'
import { useScheduleStore } from '../../stores/scheduleStore'
import { SlotJam, SlotTipe, StrukturWaktu } from '@core/types'
import { buildSlotTiming, createSlotId, getDefaultSlotLabel, validateHariSlots } from '@core/session-config'

interface DraftSlot {
  id: string
  tipe: SlotTipe
  label: string
  mulai: string
  selesai: string
  jumlahJp: 1 | 2
  warna?: string
}

interface DraftHari {
  aktif: boolean
  judul: string
  slots: DraftSlot[]
}

const store = useScheduleStore()
const durasiJpMenit = ref(store.proyek.struktur_waktu.durasi_jp_menit || 40)
const selectedHari = ref(Object.keys(store.proyek.struktur_waktu.hari)[0] || 'Senin')
const drafts = ref<Record<string, DraftHari>>({})
const isSaved = ref(false)

function getStart(slot: SlotJam): string {
  return slot.waktu[0]?.split('-')[0]?.trim() || '07.00'
}

function getEnd(slot: SlotJam): string {
  return slot.waktu[slot.waktu.length - 1]?.split('-')[1]?.trim() || getStart(slot)
}

function toDraftSlot(slot: SlotJam): DraftSlot {
  return {
    id: slot.id,
    tipe: slot.tipe,
    label: slot.label || (slot.tipe === 'kbm' ? '' : slot.tipe === 'jeda' ? 'ISTIRAHAT' : slot.tipe.toUpperCase()),
    mulai: getStart(slot),
    selesai: getEnd(slot),
    jumlahJp: slot.tipe === 'kbm' && slot.jp.length === 1 ? 1 : 2,
    warna: slot.warna
  }
}

function slotOrdinal(slots: DraftSlot[], index: number, tipe: SlotTipe): number {
  return slots.slice(0, index + 1).filter((slot) => slot.tipe === tipe).length - 1
}

function slotPlaceholder(slots: DraftSlot[], index: number): string {
  return getDefaultSlotLabel(slots[index].tipe, slotOrdinal(slots, index, slots[index].tipe))
}

function syncDrafts(): void {
  const struktur = store.proyek.struktur_waktu
  durasiJpMenit.value = struktur.durasi_jp_menit || 40
  const hariNames = Object.keys(struktur.hari)
  if (!hariNames.includes(selectedHari.value)) selectedHari.value = hariNames[0] || 'Senin'
  const next: Record<string, DraftHari> = {}
  for (const [hariName, hari] of Object.entries(struktur.hari)) {
    next[hariName] = {
      aktif: hari.aktif,
      judul: hari.judul || hariName.toUpperCase(),
      slots: hari.slots.map(toDraftSlot)
    }
  }
  drafts.value = next
  normalizeDraftIds()
}

syncDrafts()

watch(
  () => store.proyek.struktur_waktu,
  () => syncDrafts(),
  { deep: true }
)

const hariNames = computed(() => Object.keys(drafts.value))
const currentHari = computed(() => drafts.value[selectedHari.value])
const currentHariIssues = computed(() => {
  if (!currentHari.value) return []
  return validateHariSlots(toHari(currentHari.value))
})
const allIssues = computed(() => Object.values(drafts.value).flatMap((hari) => validateHariSlots(toHari(hari))))

function toHari(draft: DraftHari): { aktif: boolean; judul: string; slots: SlotJam[] } {
  let nextJp = 1
  const slots = draft.slots.map((item, index) => {
    const base: SlotJam = {
      id: item.id.trim(),
      tipe: item.tipe,
      label: item.label.trim() || getDefaultSlotLabel(item.tipe, slotOrdinal(draft.slots, index, item.tipe)),
      waktu: [],
      jp: item.tipe === 'kbm' ? Array.from({ length: item.jumlahJp }, () => 0) : [],
      warna: item.warna
    }
    const timed = buildSlotTiming(base, item.mulai, item.selesai, durasiJpMenit.value)
    if (timed.tipe === 'kbm') timed.jp = Array.from({ length: item.jumlahJp }, () => nextJp++)
    return timed
  })
  return { aktif: draft.aktif, judul: draft.judul.trim(), slots }
}

function buildStruktur(): StrukturWaktu {
  const struktur = store.proyek.struktur_waktu
  const hari: StrukturWaktu['hari'] = {}
  for (const [hariName, draft] of Object.entries(drafts.value)) {
    hari[hariName] = toHari(draft)
  }
  return {
    ...struktur,
    durasi_jp_menit: Math.max(1, Math.round(durasiJpMenit.value)),
    hari
  }
}

function saveSessions(): void {
  normalizeDraftIds()
  const struktur = buildStruktur()
  const issues = Object.values(struktur.hari).flatMap((hari) => validateHariSlots(hari))
  if (issues.length > 0) return
  store.updateStrukturWaktu(struktur)
  isSaved.value = true
  setTimeout(() => {
    isSaved.value = false
  }, 2500)
}

function nextSlotId(): string {
  return createSlotId(currentHari.value?.slots || [], 'kbm')
}

function normalizeDraftIds(): void {
  for (const draft of Object.values(drafts.value)) {
    const used: Array<{ id: string; tipe: SlotTipe }> = []
    for (const slot of draft.slots) {
      const duplicate = !slot.id.trim() || used.some((item) => item.id === slot.id.trim())
      if (duplicate) slot.id = createSlotId(used, slot.tipe)
      else slot.id = slot.id.trim()
      used.push({ id: slot.id, tipe: slot.tipe })
    }
  }
}

function addSlot(): void {
  if (!currentHari.value) return
  const previous = currentHari.value.slots[currentHari.value.slots.length - 1]
  currentHari.value.slots.push({
    id: nextSlotId(),
    tipe: 'kbm',
    label: '',
    mulai: previous?.selesai || '07.00',
    selesai: previous?.selesai || '08.20',
    jumlahJp: 2
  })
}

function addBreak(): void {
  if (!currentHari.value) return
  const previous = currentHari.value.slots[currentHari.value.slots.length - 1]
  currentHari.value.slots.push({
    id: createSlotId(currentHari.value.slots, 'jeda'),
    tipe: 'jeda',
    label: 'ISTIRAHAT',
    mulai: previous?.selesai || '09.40',
    selesai: '10.00',
    jumlahJp: 1
  })
}

function removeSlot(index: number): void {
  currentHari.value?.slots.splice(index, 1)
}

function moveSlot(index: number, direction: -1 | 1): void {
  if (!currentHari.value) return
  const target = index + direction
  if (target < 0 || target >= currentHari.value.slots.length) return
  const slots = currentHari.value.slots
  ;[slots[index], slots[target]] = [slots[target], slots[index]]
}

function copyToOtherDays(): void {
  if (!currentHari.value) return
  const source = currentHari.value
  for (const hariName of hariNames.value) {
    if (hariName === selectedHari.value) continue
    drafts.value[hariName] = {
      aktif: drafts.value[hariName].aktif,
      judul: drafts.value[hariName].judul,
      slots: source.slots.map((slot) => ({ ...slot }))
    }
  }
}

function tipeLabel(tipe: SlotTipe): string {
  return {
    kbm: 'KBM',
    jeda: 'Istirahat',
    upacara: 'Upacara',
    ibadah: 'Ibadah',
    tutup: 'Kegiatan / Tutup'
  }[tipe]
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-y-auto p-4">
    <div class="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 md:flex-row md:items-center md:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <Clock class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">Sesi KBM & Waktu Belajar</h2>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Atur jam belajar sesuai kalender dan kebiasaan masing-masing lembaga. Setiap hari dapat memiliki susunan sesi berbeda.
        </p>
      </div>
      <button
        type="button"
        @click="saveSessions"
        :disabled="allIssues.length > 0"
        :title="allIssues.length > 0 ? 'Perbaiki masalah waktu terlebih dahulu' : 'Simpan susunan sesi KBM'"
        class="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
      >
        <Save class="h-4 w-4" />
        <span>Simpan Sesi KBM</span>
      </button>
    </div>

    <div class="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
        <div class="mb-2 flex items-center justify-between px-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hari Belajar</span>
          <span class="text-[10px] text-slate-400">{{ hariNames.length }} hari</span>
        </div>
        <div class="space-y-1">
          <button
            type="button"
            v-for="hariName in hariNames"
            :key="hariName"
            @click="selectedHari = hariName"
            :class="[
              'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition-colors',
              selectedHari === hariName
                ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
            ]"
          >
            <span>{{ hariName }}</span>
            <span :class="drafts[hariName].aktif ? 'text-emerald-500' : 'text-slate-400'">{{ drafts[hariName].aktif ? 'Aktif' : 'Libur' }}</span>
          </button>
        </div>
        <div class="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
          <label for="hari-aktif" class="flex items-center gap-2 px-2 text-xs text-slate-600 dark:text-slate-300">
            <input v-if="currentHari" id="hari-aktif" v-model="currentHari.aktif" type="checkbox" class="accent-emerald-600" />
            Hari ini aktif digunakan
          </label>
        </div>
      </aside>

      <section v-if="currentHari" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
        <div class="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 md:flex-row md:items-end md:justify-between">
          <div>
            <label for="hari-judul" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Judul Hari</label>
            <input id="hari-judul" v-model="currentHari.judul" class="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
          </div>
          <div class="flex flex-wrap items-end gap-2">
            <div>
              <label for="durasi-jp" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Durasi 1 JP</label>
              <div class="flex items-center gap-1">
                <input id="durasi-jp" v-model.number="durasiJpMenit" type="number" min="1" max="180" class="w-20 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-right text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                <span class="text-xs text-slate-500">menit</span>
              </div>
            </div>
            <button type="button" @click="copyToOtherDays" class="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" title="Salin susunan hari ini ke semua hari lain">
              <Copy class="h-3.5 w-3.5" /> Salin ke hari lain
            </button>
          </div>
        </div>

        <div v-if="currentHariIssues.length > 0" role="alert" class="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <div v-for="issue in currentHariIssues" :key="issue" class="flex items-start gap-1.5">
            <AlertTriangle class="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{{ issue }}</span>
          </div>
        </div>

        <div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <span><strong class="text-slate-700 dark:text-slate-200">KBM</strong> = sesi yang masuk ke jadwal</span>
          <span><strong class="text-slate-700 dark:text-slate-200">Istirahat/Kegiatan</strong> = jeda yang tidak menerima alokasi mapel</span>
          <span>Waktu selesai KBM mengikuti durasi JP yang dipilih.</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[880px] text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                <th class="w-10 px-2 py-2">No</th>
                <th class="w-40 px-2 py-2">Jenis Kegiatan</th>
                <th class="px-2 py-2">Nama / Keterangan</th>
                <th class="w-36 px-2 py-2">Waktu</th>
                <th class="w-24 px-2 py-2">JP</th>
                <th class="w-32 px-2 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(slot, index) in currentHari.slots" :key="`${slot.id}-${index}`" :class="['border-b border-slate-100 dark:border-slate-900', slot.tipe === 'kbm' ? '' : 'bg-amber-50/40 dark:bg-amber-950/10']">
                <td class="px-2 py-2 text-slate-400">{{ index + 1 }}</td>
                <td class="px-2 py-2">
                  <label :for="`slot-type-${index}`" class="sr-only">Jenis kegiatan baris {{ index + 1 }}</label>
                  <select :id="`slot-type-${index}`" v-model="slot.tipe" class="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <option v-for="tipe in ['kbm', 'jeda', 'upacara', 'ibadah', 'tutup']" :key="tipe" :value="tipe">{{ tipeLabel(tipe as SlotTipe) }}</option>
                  </select>
                </td>
                <td class="px-2 py-2">
                  <label :for="`slot-label-${index}`" class="sr-only">Nama atau keterangan baris {{ index + 1 }}</label>
                  <input :id="`slot-label-${index}`" v-model="slot.label" :placeholder="slotPlaceholder(currentHari.slots, index)" class="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                </td>
                <td class="px-2 py-2">
                  <div class="flex items-center gap-1.5">
                    <label :for="`slot-start-${index}`" class="sr-only">Waktu mulai baris {{ index + 1 }}</label>
                    <input :id="`slot-start-${index}`" v-model="slot.mulai" placeholder="07.00" class="w-20 rounded border border-slate-300 bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                    <span class="text-slate-400">–</span>
                    <label v-if="slot.tipe !== 'kbm'" :for="`slot-end-${index}`" class="sr-only">Waktu selesai baris {{ index + 1 }}</label>
                    <input v-if="slot.tipe !== 'kbm'" :id="`slot-end-${index}`" v-model="slot.selesai" placeholder="08.00" class="w-20 rounded border border-slate-300 bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                    <span v-else class="font-mono text-[11px] text-slate-500">{{ slot.selesai }}</span>
                  </div>
                </td>
                <td class="px-2 py-2">
                  <label v-if="slot.tipe === 'kbm'" :for="`slot-jp-${index}`" class="sr-only">Aantal JP baris {{ index + 1 }}</label>
                  <select v-if="slot.tipe === 'kbm'" :id="`slot-jp-${index}`" v-model.number="slot.jumlahJp" class="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <option :value="1">1 JP</option>
                    <option :value="2">2 JP</option>
                  </select>
                  <span v-else class="text-slate-400">—</span>
                </td>
                <td class="px-2 py-2">
                  <div class="flex items-center gap-1">
                    <button type="button" @click="moveSlot(index, -1)" :disabled="index === 0" class="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800" title="Naikkan sesi" :aria-label="`Naikkan baris ${index + 1}`"><ArrowUp class="h-3.5 w-3.5" aria-hidden="true" /><span class="sr-only">Naikkan</span></button>
                    <button type="button" @click="moveSlot(index, 1)" :disabled="index === currentHari.slots.length - 1" class="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800" title="Turunkan sesi" :aria-label="`Turunkan baris ${index + 1}`"><ArrowDown class="h-3.5 w-3.5" aria-hidden="true" /><span class="sr-only">Turunkan</span></button>
                    <button type="button" @click="removeSlot(index)" class="rounded p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Hapus sesi" :aria-label="`Hapus baris ${index + 1}`"><Trash2 class="h-3.5 w-3.5" aria-hidden="true" /><span class="sr-only">Hapus</span></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" @click="addSlot" class="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            <Plus class="h-3.5 w-3.5" /> Tambah Sesi KBM
          </button>
          <button type="button" @click="addBreak" class="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <Plus class="h-3.5 w-3.5" /> Tambah Istirahat
          </button>
          <span v-if="isSaved" role="status" aria-live="polite" class="ml-2 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 class="h-4 w-4" aria-hidden="true" /> Sesi berhasil disimpan</span>
        </div>
      </section>
    </div>
  </div>
</template>
