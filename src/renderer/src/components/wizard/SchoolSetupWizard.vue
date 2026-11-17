<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  School,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  Sparkles
} from 'lucide-vue-next'
import { TingkatTingkat, SemesterTipe } from '@core/types'
import { HARI_5, HARI_6, HARI_7, PresetWaktuOptions } from '@core/default-presets'
import {
  WizardProfileData,
  validateProfileStep,
  buildProjectFromWizard
} from '@core/wizard-builder'
import { shouldConfirmProjectReplacement } from '@core/project-safety'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useUiStore } from '../../stores/uiStore'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'completed'): void
}>()

const scheduleStore = useScheduleStore()
const uiStore = useUiStore()

const currentStep = ref<number>(1)
const validationErrors = ref<string[]>([])

// Form State
const profile = ref<WizardProfileData>({
  nama_sekolah: '',
  jenjang: 'SMP',
  semester: 'GANJIL',
  tahun_pelajaran: '2026/2027',
  kota_tanggal: 'Kota Baru, 13 Juli 2026',
  kepala_sekolah_nama: '',
  kepala_sekolah_nip: '',
  jabatan_pimpinan: 'Pimpinan Lembaga',
  jenis_lembaga: 'Lembaga Pendidikan',
  jenjang_custom: '',
  kop_base64: '',
  ttd_base64: ''
})

const polaMode = ref<'5' | '6' | 'custom'>('5')
const selectedHariAktif = ref<string[]>([...HARI_5])
const polaHari = computed(() => selectedHariAktif.value.length)
const presetJenjang = ref<TingkatTingkat>('SMP')

function selectPolaMode(mode: '5' | '6' | 'custom'): void {
  polaMode.value = mode
  if (mode === '5') selectedHariAktif.value = [...HARI_5]
  else if (mode === '6') selectedHariAktif.value = [...HARI_6]
}

function applyHariPreset(days: string[]): void {
  polaMode.value = 'custom'
  selectedHariAktif.value = HARI_7.filter((h) => days.includes(h))
}

function toggleHariAktif(hari: string): void {
  polaMode.value = 'custom'
  const exists = selectedHariAktif.value.includes(hari)
  if (exists && selectedHariAktif.value.length <= 1) return
  const next = exists
    ? selectedHariAktif.value.filter((item) => item !== hari)
    : [...selectedHariAktif.value, hari]
  selectedHariAktif.value = HARI_7.filter((item) => next.includes(item))
}
const customWaktu = ref({
  durasiJP: 40,
  blokPerHari: 4,
  jamMulai: '07:00',
  jedaSetelahBlok: '2',
  tambahkanTutupJumat: false
})

function getCustomWaktuOptions(): PresetWaktuOptions {
  const [jam, menit] = customWaktu.value.jamMulai.split(':').map(Number)
  const jedaSetelahBlok = customWaktu.value.jedaSetelahBlok
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)

  return {
    durasiJP: customWaktu.value.durasiJP,
    blokPerHari: customWaktu.value.blokPerHari,
    jamMulaiMenit: (Number.isFinite(jam) ? jam : 7) * 60 + (Number.isFinite(menit) ? menit : 0),
    jedaSetelahBlok,
    tambahkanTutupJumat: customWaktu.value.tambahkanTutupJumat
  }
}

// Sinkronkan presetJenjang saat jenjang di step 1 berubah
function onJenjangChange(): void {
  presetJenjang.value = profile.value.jenjang
}

function handleImageUpload(field: 'kop_base64' | 'ttd_base64', event: Event): void {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        profile.value[field] = e.target.result
      }
    }
    reader.readAsDataURL(file)
  }
}

function nextStep(): void {
  validationErrors.value = []

  if (currentStep.value === 1) {
    const errors = validateProfileStep(profile.value)
    if (errors.length > 0) {
      validationErrors.value = errors
      return
    }
  }

  if (currentStep.value === 3 && presetJenjang.value === 'LAINNYA') {
    if (customWaktu.value.durasiJP < 1 || customWaktu.value.durasiJP > 180) {
      validationErrors.value.push('Durasi JP harus berada di antara 1 sampai 180 menit')
    }
    if (customWaktu.value.blokPerHari < 1 || customWaktu.value.blokPerHari > 12) {
      validationErrors.value.push('Jumlah blok per hari harus berada di antara 1 sampai 12')
    }
    if (validationErrors.value.length > 0) return
  }

  if (currentStep.value < 4) {
    currentStep.value++
  }
}

function prevStep(): void {
  validationErrors.value = []
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

async function finishWizard(): Promise<void> {
  if (
    shouldConfirmProjectReplacement(scheduleStore.proyek, scheduleStore.filePath, scheduleStore.dirty) &&
    !(await uiStore.showConfirm(
      'Panduan penyiapan akan mengganti proyek yang sedang dibuka. Data jadwal lama tidak ikut dibawa. Lanjutkan?',
      {
        title: 'Buat Proyek Baru',
        confirmLabel: 'Ya, Buat Proyek'
      }
    ))
  ) {
    return
  }

  const baseOptions: PresetWaktuOptions =
    presetJenjang.value === 'LAINNYA' ? getCustomWaktuOptions() : {}
  const waktuOptions: PresetWaktuOptions =
    polaMode.value === 'custom'
      ? { ...baseOptions, hariAktif: selectedHariAktif.value }
      : baseOptions

  const newProject = buildProjectFromWizard(
    profile.value,
    polaHari.value,
    presetJenjang.value,
    waktuOptions
  )
  scheduleStore.loadProjectData(newProject, null)
  emit('completed')
  emit('update:modelValue', false)
}

function closeModal(): void {
  emit('update:modelValue', false)
}

async function loadDemoProject(): Promise<void> {
  if (
    shouldConfirmProjectReplacement(scheduleStore.proyek, scheduleStore.filePath, scheduleStore.dirty) &&
    !(await uiStore.showConfirm('Data demonstrasi akan mengganti proyek yang sedang dibuka. Lanjutkan?', {
      title: 'Muat Data Demonstrasi',
      confirmLabel: 'Ya, Muat Data Demo'
    }))
  ) {
    return
  }
  scheduleStore.loadDummyProject()
  emit('completed')
  emit('update:modelValue', false)
}

const steps = [
  { id: 1, title: 'Profil Lembaga', icon: School },
  { id: 2, title: 'Pola Hari', icon: Calendar },
  { id: 3, title: 'Struktur Jam', icon: Clock },
  { id: 4, title: 'Konfirmasi', icon: CheckCircle2 }
]
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    role="dialog"
    aria-modal="true"
    aria-labelledby="setup-wizard-title"
    tabindex="-1"
    @keydown.esc="closeModal"
  >
    <div
      class="flex max-h-[90vh] h-[620px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
    >
      <!-- Header panduan penyiapan -->
      <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/80">
        <div class="flex items-center space-x-3">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          >
            <Sparkles class="h-5 w-5" />
          </div>
          <div>
            <h2 id="setup-wizard-title" class="text-base font-semibold text-slate-900 dark:text-slate-100">Penyiapan Proyek Jadwal Baru</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Atur profil lembaga, pola hari, dan waktu belajar</p>
          </div>
        </div>
        <button
          type="button"
          @click="closeModal"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          aria-label="Tutup panduan penyiapan"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Step Indicator Bar -->
      <div class="border-b border-slate-200/80 bg-slate-50/50 px-6 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
        <div class="flex items-center justify-between">
          <template v-for="(step, idx) in steps" :key="step.id">
            <div class="flex items-center space-x-2.5">
              <div
                :class="[
                  'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-all',
                  currentStep === step.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 dark:bg-emerald-500 dark:text-slate-950 dark:shadow-emerald-500/30'
                    : currentStep > step.id
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                ]"
              >
                <component :is="step.icon" class="h-3.5 w-3.5" />
              </div>
              <span
                :class="[
                  'text-xs font-medium',
                  currentStep === step.id
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : currentStep > step.id
                    ? 'text-slate-700 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-500'
                ]"
              >
                {{ step.title }}
              </span>
            </div>
            <div
              v-if="idx < steps.length - 1"
              class="h-px flex-1 mx-3 bg-slate-200 dark:bg-slate-800"
            />
          </template>
        </div>
      </div>

      <!-- Step Content Area -->
      <div class="flex-1 overflow-y-auto p-6 text-slate-800 dark:text-slate-200">
        <!-- Error Banner -->
        <div
          v-if="validationErrors.length > 0"
          class="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
        >
          <div class="font-semibold mb-1">Periksa isian berikut:</div>
          <ul class="list-disc pl-4 space-y-0.5">
            <li v-for="err in validationErrors" :key="err">{{ err }}</li>
          </ul>
        </div>

        <!-- Step 1: Profil Lembaga -->
        <div v-if="currentStep === 1" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lembaga / Institusi *</label>
              <input
                v-model="profile.nama_sekolah"
                type="text"
                placeholder="Contoh: SMP Negeri 1 Merdeka, PKBM Harapan, atau Pesantren ..."
                class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jenjang Pendidikan *</label>
              <select
                v-model="profile.jenjang"
                @change="onJenjangChange"
                class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="PAUD">PAUD</option>
                <option value="TK">TK / RA</option>
                <option value="SD">SD</option>
                <option value="MI">MI</option>
                <option value="SMP">SMP</option>
                <option value="MTs">MTs</option>
                <option value="SMA">SMA</option>
                <option value="MA">MA</option>
                <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                <option value="PKBM">PKBM / Pendidikan Kesetaraan</option>
                <option value="PESANTREN">Pesantren / Asrama</option>
                <option value="LAINNYA">Lainnya</option>
              </select>
            </div>

            <div v-if="profile.jenjang === 'LAINNYA'">
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Jenjang / Program</label>
              <input
                v-model="profile.jenjang_custom"
                type="text"
                placeholder="Contoh: Kursus, Akademi, atau Program Internal"
                class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tahun Pelajaran *</label>
              <input
                v-model="profile.tahun_pelajaran"
                type="text"
                placeholder="2026/2027"
                class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Semester *</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="profile.semester = 'GANJIL'"
                  :class="[
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-all text-center',
                    profile.semester === 'GANJIL'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'border-slate-300 bg-slate-50 text-slate-600 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-slate-200'
                  ]"
                >
                  Ganjil
                </button>
                <button
                  type="button"
                  @click="profile.semester = 'GENAP'"
                  :class="[
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-all text-center',
                    profile.semester === 'GENAP'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'border-slate-300 bg-slate-50 text-slate-600 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-slate-200'
                  ]"
                >
                  Genap
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Kota & Titimangsa Dokumen</label>
              <input
                v-model="profile.kota_tanggal"
                type="text"
                placeholder="Contoh: Jakarta, 13 Juli 2026"
                class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Penanggung Jawab / Pimpinan</label>
              <input
                v-model="profile.kepala_sekolah_nama"
                type="text"
                placeholder="Nama lengkap beserta gelar"
                class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nomor Identitas Pimpinan</label>
              <input
                v-model="profile.kepala_sekolah_nip"
                type="text"
                placeholder="Opsional / jika ada"
                class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jabatan Penanggung Jawab</label>
              <input
                v-model="profile.jabatan_pimpinan"
                type="text"
                placeholder="Misalnya: Kepala Lembaga, Direktur, atau Pengasuh"
                class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>

            <!-- Upload Logo/Kop & TTD Opsional -->
            <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Kop / Logo Lembaga (Opsional)</label>
              <input
                type="file"
                accept="image/*"
                @change="(e) => handleImageUpload('kop_base64', e)"
                class="text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-slate-200 file:px-2.5 file:py-1 file:text-xs file:text-slate-700 hover:file:bg-slate-300 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700"
              />
              <span v-if="profile.kop_base64" class="block text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">✓ Berkas logo terpilih</span>
            </div>

            <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Scan Tanda Tangan (Opsional)</label>
              <input
                type="file"
                accept="image/*"
                @change="(e) => handleImageUpload('ttd_base64', e)"
                class="text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-slate-200 file:px-2.5 file:py-1 file:text-xs file:text-slate-700 hover:file:bg-slate-300 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700"
              />
              <span v-if="profile.ttd_base64" class="block text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">✓ Berkas tanda tangan terpilih</span>
            </div>
          </div>
        </div>

        <!-- Step 2: Pola Hari Belajar -->
        <div v-if="currentStep === 2" class="space-y-4">
          <div class="text-sm text-slate-600 dark:text-slate-300 mb-2">
            Pilih sistem hari belajar mingguan atau atur hari aktif & hari libur secara fleksibel (termasuk hari Minggu):
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <!-- Pilihan 5 Hari -->
            <div
              @click="selectPolaMode('5')"
              :class="[
                'cursor-pointer rounded-2xl border p-4 transition-all',
                polaMode === '5'
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-md shadow-emerald-500/10 dark:bg-emerald-500/10 dark:shadow-emerald-500/10'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">5 Hari (Sen–Jum)</span>
                <span
                  :class="[
                    'h-5 w-5 rounded-full border flex items-center justify-center text-xs',
                    polaMode === '5'
                      ? 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold'
                      : 'border-slate-300 dark:border-slate-700'
                  ]"
                >
                  <span v-if="polaMode === '5'">✓</span>
                </span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Senin sampai Jumat, libur Sabtu & Minggu.
              </p>
            </div>

            <!-- Pilihan 6 Hari -->
            <div
              @click="selectPolaMode('6')"
              :class="[
                'cursor-pointer rounded-2xl border p-4 transition-all',
                polaMode === '6'
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-md shadow-emerald-500/10 dark:bg-emerald-500/10 dark:shadow-emerald-500/10'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">6 Hari (Sen–Sab)</span>
                <span
                  :class="[
                    'h-5 w-5 rounded-full border flex items-center justify-center text-xs',
                    polaMode === '6'
                      ? 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold'
                      : 'border-slate-300 dark:border-slate-700'
                  ]"
                >
                  <span v-if="polaMode === '6'">✓</span>
                </span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Senin sampai Sabtu, libur hari Minggu.
              </p>
            </div>

            <!-- Pilihan Fleksibel / Kustom -->
            <div
              @click="selectPolaMode('custom')"
              :class="[
                'cursor-pointer rounded-2xl border p-4 transition-all',
                polaMode === 'custom'
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-md shadow-emerald-500/10 dark:bg-emerald-500/10 dark:shadow-emerald-500/10'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">Fleksibel / Kustom</span>
                <span
                  :class="[
                    'h-5 w-5 rounded-full border flex items-center justify-center text-xs',
                    polaMode === 'custom'
                      ? 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold'
                      : 'border-slate-300 dark:border-slate-700'
                  ]"
                >
                  <span v-if="polaMode === 'custom'">✓</span>
                </span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Aktifkan hari Minggu atau atur hari libur sesuai kebijakan lembaga.
              </p>
            </div>
          </div>

          <!-- Pemilih Hari Aktif & Libur -->
          <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/60 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Hari Belajar Aktif ({{ selectedHariAktif.length }} hari aktif, {{ 7 - selectedHariAktif.length }} hari libur):
              </span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  @click="applyHariPreset(['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis'])"
                  class="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  Libur Jum–Sab (Minggu–Kam)
                </button>
                <button
                  type="button"
                  @click="applyHariPreset(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Sabtu', 'Minggu'])"
                  class="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  Libur Jumat (6 Hari)
                </button>
                <button
                  type="button"
                  @click="applyHariPreset(HARI_7)"
                  class="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  7 Hari Penuh
                </button>
              </div>
            </div>

            <div class="grid grid-cols-7 gap-2">
              <button
                v-for="hari in HARI_7"
                :key="hari"
                type="button"
                @click="toggleHariAktif(hari)"
                :class="[
                  'flex flex-col items-center justify-center rounded-xl border py-2.5 px-1 text-xs font-semibold transition-all',
                  selectedHariAktif.includes(hari)
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
                ]"
              >
                <span>{{ hari }}</span>
                <span class="mt-0.5 text-[10px] font-normal">
                  {{ selectedHariAktif.includes(hari) ? 'Aktif' : 'Libur' }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Step 3: Struktur Jam & Preset Alokasi -->
        <div v-if="currentStep === 3" class="space-y-4">
          <div class="text-sm text-slate-600 dark:text-slate-300 mb-2">
            Pilih preset alokasi waktu dan durasi JP standar:
          </div>

          <div class="grid grid-cols-2 gap-3.5">
            <div
              v-for="item in [
                { id: 'SD', title: 'SD / MI', durasi: '35 Menit / JP', jam: '07:00 - 12:45', desc: 'Maks 7-8 JP per hari dengan 2x istirahat pendek' },
                { id: 'SMP', title: 'SMP / MTs', durasi: '40 Menit / JP', jam: '07:00 - 14:15', desc: 'Maks 9 JP per hari dengan istirahat & istirahat siang' },
                { id: 'SMA', title: 'SMA / MA', durasi: '45 Menit / JP', jam: '07:00 - 15:30', desc: 'Maks 10 JP per hari dengan istirahat dzuhur panjang' },
                { id: 'SMK', title: 'SMK', durasi: '45 Menit / JP', jam: '07:00 - 16:00', desc: 'Maks 10-11 JP per hari disesuaikan blok praktikum bengkel' },
                { id: 'LAINNYA', title: 'Kustom', durasi: 'Atur sendiri', jam: 'Sesuai kebutuhan', desc: 'Untuk lembaga, program, atau pola waktu yang tidak mengikuti preset standar' }
              ]"
              :key="item.id"
              @click="presetJenjang = item.id as TingkatTingkat"
              :class="[
                'cursor-pointer rounded-xl border p-4 transition-all',
                presetJenjang === item.id
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-sm dark:bg-emerald-500/10 dark:shadow-emerald-500/10'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
              ]"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-semibold text-slate-900 dark:text-slate-100 text-sm">{{ item.title }}</span>
                <span class="rounded-full bg-emerald-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-400">
                  {{ item.durasi }}
                </span>
              </div>
              <div class="text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1.5">Jam KBM: {{ item.jam }}</div>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ item.desc }}</p>
            </div>
          </div>
          <div v-if="presetJenjang === 'LAINNYA'" class="grid grid-cols-2 gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Durasi 1 JP (menit)</label>
              <input v-model.number="customWaktu.durasiJP" type="number" min="1" max="180" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Blok KBM per hari</label>
              <input v-model.number="customWaktu.blokPerHari" type="number" min="1" max="12" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jam mulai</label>
              <input v-model="customWaktu.jamMulai" type="time" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jeda setelah blok ke-</label>
              <input v-model="customWaktu.jedaSetelahBlok" type="text" placeholder="2,4" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <label class="col-span-2 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <input v-model="customWaktu.tambahkanTutupJumat" type="checkbox" class="rounded border-slate-300 text-emerald-600" />
              Tambahkan slot penutup Jumat jika tidak bertumpuk
            </label>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 italic mt-2">
            * Catatan: Anda tetap dapat mengubah slot waktu, durasi, dan nama jam secara manual kapan saja di menu Sesi KBM.
          </p>
        </div>

        <!-- Step 4: Konfirmasi -->
        <div v-if="currentStep === 4" class="space-y-4">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3 dark:border-slate-800 dark:bg-slate-950/70">
            <h3 class="text-sm font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
              Ringkasan Konfigurasi Jadwal
            </h3>

            <div class="grid grid-cols-2 gap-y-2 text-xs">
              <div class="text-slate-500 dark:text-slate-400">Nama Lembaga:</div>
              <div class="font-medium text-slate-900 dark:text-slate-100">{{ profile.nama_sekolah }}</div>

              <div class="text-slate-500 dark:text-slate-400">Jenjang & Preset:</div>
              <div class="font-medium text-slate-900 dark:text-slate-100">{{ profile.jenjang }} (Preset {{ presetJenjang }})</div>

              <div class="text-slate-500 dark:text-slate-400">Tahun Pelajaran:</div>
              <div class="font-medium text-slate-900 dark:text-slate-100">{{ profile.tahun_pelajaran }} — Semester {{ profile.semester }}</div>

              <div class="text-slate-500 dark:text-slate-400">Pola Hari:</div>
              <div class="font-medium text-slate-900 dark:text-slate-100">{{ polaHari }} Hari Kerja</div>

              <div class="text-slate-500 dark:text-slate-400">Penanggung Jawab:</div>
              <div class="font-medium text-slate-900 dark:text-slate-100">
                {{ profile.kepala_sekolah_nama || 'Belum diisi' }}
                <span v-if="profile.kepala_sekolah_nip" class="text-slate-500 dark:text-slate-400"> (NIP: {{ profile.kepala_sekolah_nip }})</span>
              </div>

              <div class="text-slate-500 dark:text-slate-400">Titimangsa Cetak:</div>
              <div class="font-medium text-slate-900 dark:text-slate-100">{{ profile.kota_tanggal || '-' }}</div>
            </div>
          </div>

          <div class="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-300">
            <p>
              Setelah mengonfirmasi, aplikasi akan membuat struktur kisi jadwal baru yang bersih dan siap untuk penginputan Master Guru, Kelas, dan Beban Mengajar.
            </p>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/80">
        <div class="flex items-center space-x-2">
          <button
            v-if="currentStep > 1"
            type="button"
            @click="prevStep"
            class="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft class="h-4 w-4" />
            <span>Sebelumnya</span>
          </button>

          <button
            type="button"
            @click="loadDemoProject"
            class="flex items-center space-x-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 transition-colors"
            title="Isi langsung dengan data demonstrasi lengkap (12 guru, 6 kelas, 12 mapel)"
          >
            <Sparkles class="h-3.5 w-3.5" />
            <span>Muat Data Demo</span>
          </button>
        </div>

        <div class="flex items-center space-x-2.5">
          <button
            type="button"
            @click="closeModal"
            class="rounded-lg px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Batal
          </button>

          <button
            v-if="currentStep < 4"
            type="button"
            @click="nextStep"
            class="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20"
          >
            <span>Lanjut</span>
            <ChevronRight class="h-4 w-4" />
          </button>

          <button
            v-else
            type="button"
            @click="finishWizard"
            class="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <CheckCircle2 class="h-4 w-4" />
            <span>Buat Proyek Jadwal</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
