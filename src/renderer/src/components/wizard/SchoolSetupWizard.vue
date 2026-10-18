<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  School,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Check,
  Upload
} from 'lucide-vue-next'
import { TingkatTingkat, SemesterTipe } from '@core/types'
import {
  WizardProfileData,
  validateProfileStep,
  buildProjectFromWizard
} from '@core/wizard-builder'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useNotifyStore } from '../../stores/notifyStore'
import { useProjectFile } from '../../composables/useProjectFile'
import { bacaGambarSebagaiDataUrl } from '../../utils/image'
import BaseModal from '../ui/BaseModal.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'completed'): void
}>()

const scheduleStore = useScheduleStore()
const notify = useNotifyStore()
const files = useProjectFile()

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
  kop_base64: '',
  ttd_base64: ''
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      currentStep.value = 1
      validationErrors.value = []
    }
  }
)

const polaHari = ref<5 | 6>(5)
const presetJenjang = ref<TingkatTingkat>('SMP')

// Sinkronkan presetJenjang saat jenjang di step 1 berubah
function onJenjangChange(): void {
  presetJenjang.value = profile.value.jenjang
}

async function handleImageUpload(field: 'kop_base64' | 'ttd_base64', event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    profile.value[field] = await bacaGambarSebagaiDataUrl(file, {
      maksDimensi: field === 'kop_base64' ? 1200 : 400
    })
  } catch (err) {
    notify.error('Gambar tidak dapat dipakai', err instanceof Error ? err.message : undefined)
  } finally {
    target.value = ''
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
  // Wizard membuat proyek baru; pekerjaan yang sedang terbuka tidak boleh hilang diam-diam.
  if (!scheduleStore.isPristine) {
    if (scheduleStore.dirty) {
      if (!(await files.confirmLeaveDirty('membuat proyek baru'))) return
    } else {
      const ok = await notify.confirm({
        title: 'Ganti proyek yang sedang terbuka?',
        message: 'Wizard membuat proyek kosong baru dan menutup jadwal yang sedang dikerjakan.',
        confirmLabel: 'Buat proyek baru',
        danger: true
      })
      if (!ok) return
    }
  }
  const newProject = buildProjectFromWizard(
    profile.value,
    polaHari.value,
    presetJenjang.value
  )
  scheduleStore.loadProjectData(newProject, null)
  emit('completed')
  emit('update:modelValue', false)
}

function closeModal(): void {
  emit('update:modelValue', false)
}

const steps = [
  { id: 1, title: 'Profil Sekolah', icon: School },
  { id: 2, title: 'Pola Hari', icon: Calendar },
  { id: 3, title: 'Struktur Jam', icon: Clock },
  { id: 4, title: 'Konfirmasi', icon: CheckCircle2 }
]
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    size="xl"
    title="Setup proyek jadwal baru"
    description="Atur profil, pola hari, dan alokasi waktu KBM."
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="-mx-6 -my-5 flex min-h-[26rem] flex-col">
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
      <div class="flex-1 p-6 text-slate-800 dark:text-slate-200">
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

        <!-- Step 1: Profil Sekolah -->
        <div v-if="currentStep === 1" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Sekolah / Madrasah *</label>
              <input
                v-model="profile.nama_sekolah"
                type="text"
                placeholder="Contoh: SMP Negeri 1 Merdeka atau MTs Nurul Huda"
                class="field"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jenjang Pendidikan *</label>
              <select
                v-model="profile.jenjang"
                @change="onJenjangChange"
                class="field"
              >
                <option value="SD">SD / MI (Sekolah Dasar / Madrasah Ibtidaiyah)</option>
                <option value="SMP">SMP / MTs (Sekolah Menengah Pertama)</option>
                <option value="SMA">SMA / MA (Sekolah Menengah Atas)</option>
                <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tahun Pelajaran *</label>
              <input
                v-model="profile.tahun_pelajaran"
                type="text"
                placeholder="2026/2027"
                class="field"
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
                class="field"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Kepala Sekolah</label>
              <input
                v-model="profile.kepala_sekolah_nama"
                type="text"
                placeholder="Nama lengkap beserta gelar"
                class="field"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">NIP Kepala Sekolah</label>
              <input
                v-model="profile.kepala_sekolah_nip"
                type="text"
                placeholder="19xxxxxxxxxxxxxx (opsional / jika ada)"
                class="field"
              />
            </div>

            <!-- Upload Logo/Kop & TTD Opsional -->
            <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Kop / Logo Sekolah (Opsional)</label>
              <input
                type="file"
                accept="image/png, image/jpeg"
                @change="(e) => handleImageUpload('kop_base64', e)"
                class="text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-slate-200 file:px-2.5 file:py-1 file:text-xs file:text-slate-700 hover:file:bg-slate-300 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700"
              />
              <span v-if="profile.kop_base64" class="block text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Logo terpilih</span>
            </div>

            <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Scan Tanda Tangan (Opsional)</label>
              <input
                type="file"
                accept="image/png, image/jpeg"
                @change="(e) => handleImageUpload('ttd_base64', e)"
                class="text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-slate-200 file:px-2.5 file:py-1 file:text-xs file:text-slate-700 hover:file:bg-slate-300 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700"
              />
              <span v-if="profile.ttd_base64" class="block text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Tanda tangan terpilih</span>
            </div>
          </div>
        </div>

        <!-- Step 2: Pola Hari Belajar -->
        <div v-if="currentStep === 2" class="space-y-4">
          <div class="text-sm text-slate-600 dark:text-slate-300 mb-2">
            Pilih sistem hari belajar mingguan yang berlaku di sekolah Anda:
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Pilihan 5 Hari -->
            <div
              role="radio" tabindex="0" :aria-checked="polaHari === 5" @keydown.enter.prevent="polaHari = 5" @keydown.space.prevent="polaHari = 5" @click="polaHari = 5"
              :class="[
                'cursor-pointer rounded-2xl border p-5 transition-all',
                polaHari === 5
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-md shadow-emerald-500/10 dark:bg-emerald-500/10 dark:shadow-emerald-500/10'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
              ]"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-base font-semibold text-slate-900 dark:text-slate-100">5 Hari Kerja</span>
                <span
                  :class="[
                    'h-5 w-5 rounded-full border flex items-center justify-center text-xs',
                    polaHari === 5
                      ? 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold'
                      : 'border-slate-300 dark:border-slate-700'
                  ]"
                >
                  <Check v-if="polaHari === 5" class="h-3 w-3" />
                </span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Senin sampai dengan Jumat. Cocok untuk sekolah pelaksana Kurikulum Merdeka atau instansi negeri 5 hari kerja.
              </p>
              <div class="flex flex-wrap gap-1.5">
                <span class="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">Senin</span>
                <span class="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">Selasa</span>
                <span class="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">Rabu</span>
                <span class="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">Kamis</span>
                <span class="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">Jumat</span>
              </div>
            </div>

            <!-- Pilihan 6 Hari -->
            <div
              role="radio" tabindex="0" :aria-checked="polaHari === 6" @keydown.enter.prevent="polaHari = 6" @keydown.space.prevent="polaHari = 6" @click="polaHari = 6"
              :class="[
                'cursor-pointer rounded-2xl border p-5 transition-all',
                polaHari === 6
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-md shadow-emerald-500/10 dark:bg-emerald-500/10 dark:shadow-emerald-500/10'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
              ]"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-base font-semibold text-slate-900 dark:text-slate-100">6 Hari Kerja</span>
                <span
                  :class="[
                    'h-5 w-5 rounded-full border flex items-center justify-center text-xs',
                    polaHari === 6
                      ? 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold'
                      : 'border-slate-300 dark:border-slate-700'
                  ]"
                >
                  <Check v-if="polaHari === 6" class="h-3 w-3" />
                </span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Senin sampai dengan Sabtu. Pilihan standar madrasah (MI/MTs/MA) dan sekolah swasta atau boarding school.
              </p>
              <div class="flex flex-wrap gap-1.5">
                <span class="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">Senin</span>
                <span class="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">Selasa</span>
                <span class="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">Rabu</span>
                <span class="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">Kamis</span>
                <span class="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">Jumat</span>
                <span class="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">Sabtu</span>
              </div>
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
                { id: 'SMK', title: 'SMK', durasi: '45 Menit / JP', jam: '07:00 - 16:00', desc: 'Maks 10-11 JP per hari disesuaikan blok praktikum bengkel' }
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
          <p class="text-xs text-slate-500 dark:text-slate-400 italic mt-2">
            * Catatan: Anda tetap dapat mengubah slot waktu, durasi, dan nama jam secara manual kapan saja di tab Pengaturan Waktu.
          </p>
        </div>

        <!-- Step 4: Konfirmasi -->
        <div v-if="currentStep === 4" class="space-y-4">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3 dark:border-slate-800 dark:bg-slate-950/70">
            <h3 class="text-sm font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
              Ringkasan Konfigurasi Jadwal
            </h3>

            <div class="grid grid-cols-2 gap-y-2 text-xs">
              <div class="text-slate-500 dark:text-slate-400">Nama Sekolah:</div>
              <div class="font-medium text-slate-900 dark:text-slate-100">{{ profile.nama_sekolah }}</div>

              <div class="text-slate-500 dark:text-slate-400">Jenjang & Preset:</div>
              <div class="font-medium text-slate-900 dark:text-slate-100">{{ profile.jenjang }} (Preset {{ presetJenjang }})</div>

              <div class="text-slate-500 dark:text-slate-400">Tahun Pelajaran:</div>
              <div class="font-medium text-slate-900 dark:text-slate-100">{{ profile.tahun_pelajaran }}, Semester {{ profile.semester }}</div>

              <div class="text-slate-500 dark:text-slate-400">Pola Hari:</div>
              <div class="font-medium text-slate-900 dark:text-slate-100">{{ polaHari }} Hari Kerja</div>

              <div class="text-slate-500 dark:text-slate-400">Kepala Sekolah:</div>
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

    </div>

    <template #footer>
      <div class="flex w-full items-center justify-between">
        <div>
          <button v-if="currentStep > 1" type="button" class="btn btn-secondary" @click="prevStep">
            <ChevronLeft class="h-4 w-4" />
            Sebelumnya
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="btn btn-ghost" @click="closeModal">Batal</button>
          <button v-if="currentStep < 4" type="button" class="btn btn-primary" @click="nextStep">
            Lanjut
            <ChevronRight class="h-4 w-4" />
          </button>
          <button v-else type="button" class="btn btn-primary" @click="finishWizard">
            <CheckCircle2 class="h-4 w-4" />
            Buat proyek jadwal
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>
