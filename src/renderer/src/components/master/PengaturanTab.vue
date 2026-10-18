<script setup lang="ts">
import { ref, watch } from 'vue'
import { School, Clock, Sparkles, Check, Calendar, Upload, Trash2, Eye } from 'lucide-vue-next'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useUiStore } from '../../stores/uiStore'
import { useNotifyStore } from '../../stores/notifyStore'
import { TingkatTingkat, SemesterTipe } from '@core/types'
import { bacaGambarSebagaiDataUrl } from '../../utils/image'

const store = useScheduleStore()
const ui = useUiStore()
const notify = useNotifyStore()

const meta = ref({
  nama_sekolah: store.proyek.meta.nama_sekolah || '',
  jenjang: store.proyek.meta.jenjang || 'SMP',
  semester: store.proyek.meta.semester || 'GANJIL',
  tahun_pelajaran: store.proyek.meta.tahun_pelajaran || '',
  alamat_sekolah: store.proyek.meta.alamat_sekolah || '',
  notaris: store.proyek.meta.notaris || '',
  kota_tanggal: store.proyek.meta.kota_tanggal || '',
  pejabat_jabatan: store.proyek.meta.pejabat_ttd?.jabatan || 'Kepala Sekolah',
  kepala_sekolah_nama: store.proyek.meta.pejabat_ttd?.nama || '',
  kepala_sekolah_nip: store.proyek.meta.pejabat_ttd?.nip || '',
  logo_base64: store.proyek.meta.logo_base64 || store.proyek.meta.kop_base64 || ''
})

// Sinkronisasi jika store berubah dari luar
watch(
  () => store.proyek.meta,
  (newMeta) => {
    meta.value = {
      nama_sekolah: newMeta.nama_sekolah || '',
      jenjang: newMeta.jenjang || 'SMP',
      semester: newMeta.semester || 'GANJIL',
      tahun_pelajaran: newMeta.tahun_pelajaran || '',
      alamat_sekolah: newMeta.alamat_sekolah || '',
      notaris: newMeta.notaris || '',
      kota_tanggal: newMeta.kota_tanggal || '',
      pejabat_jabatan: newMeta.pejabat_ttd?.jabatan || 'Kepala Sekolah',
      kepala_sekolah_nama: newMeta.pejabat_ttd?.nama || '',
      kepala_sekolah_nip: newMeta.pejabat_ttd?.nip || '',
      logo_base64: newMeta.logo_base64 || newMeta.kop_base64 || ''
    }
  },
  { deep: true }
)

const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerUpload(): void {
  fileInputRef.value?.click()
}

async function handleLogoUpload(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    meta.value.logo_base64 = await bacaGambarSebagaiDataUrl(file, { maksDimensi: 300 })
  } catch (err) {
    notify.error('Logo tidak dapat dipakai', err instanceof Error ? err.message : undefined)
  } finally {
    target.value = ''
  }
}

function removeLogo(): void {
  meta.value.logo_base64 = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function saveSettings(): void {
  store.updateMetadata({
    nama_sekolah: meta.value.nama_sekolah.trim(),
    jenjang: meta.value.jenjang as TingkatTingkat,
    semester: meta.value.semester as SemesterTipe,
    tahun_pelajaran: meta.value.tahun_pelajaran.trim(),
    alamat_sekolah: meta.value.alamat_sekolah.trim(),
    notaris: meta.value.notaris.trim(),
    kota_tanggal: meta.value.kota_tanggal.trim(),
    logo_base64: meta.value.logo_base64,
    kop_base64: meta.value.logo_base64, // Kompatibilitas mundur
    pejabat_ttd: {
      jabatan: meta.value.pejabat_jabatan.trim() || 'Kepala Sekolah',
      nama: meta.value.kepala_sekolah_nama.trim(),
      nip: meta.value.kepala_sekolah_nip.trim()
    }
  })
  notify.success('Pengaturan sekolah diperbarui')
}

</script>

<template>
  <div class="mx-auto flex h-full w-full max-w-6xl flex-col overflow-y-auto p-4 sm:p-6">
    <header class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">Pengaturan Sekolah</h1>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Identitas, kop surat, tahun ajaran, dan pengesahan yang tampil pada hasil cetak PDF dan Excel.
        </p>
      </div>
      <button class="btn btn-secondary" @click="ui.setWizardOpen(true)">
        <Sparkles class="h-4 w-4 text-brand-600 dark:text-brand-400" />
        Jalankan wizard ulang
      </button>
    </header>

    <!-- Live Preview Kop Surat Resmi -->
    <div
      class="card p-5 mb-4"
    >
      <div class="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3 dark:border-slate-800/80">
        <div class="flex items-center space-x-2">
          <Eye class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Pratinjau Kop Surat Resmi (Tampilan Atas Lembar Ekspor)
          </h3>
        </div>
        <span class="text-[11px] text-slate-400 italic">Otomatis terpasang di lembar PDF & Excel</span>
      </div>

      <!-- Kertas Kop Surat -->
      <div
        class="rounded-lg border border-slate-300 bg-white p-4 text-slate-900 shadow-inner dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
      >
        <div class="flex items-center justify-between gap-4">
          <!-- Logo Sekolah -->
          <div class="flex-shrink-0 w-20 h-20 flex items-center justify-center border border-dashed border-slate-300 rounded bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <img
              v-if="meta.logo_base64"
              :src="meta.logo_base64.startsWith('data:') ? meta.logo_base64 : `data:image/jpeg;base64,${meta.logo_base64}`"
              alt="Logo Sekolah"
              class="max-h-18 max-w-18 object-contain"
            />
            <div v-else class="text-center text-[10px] text-slate-400 p-1">
              Logo Sekolah
            </div>
          </div>

          <!-- Teks Kop -->
          <div class="flex-1 text-center">
            <p v-if="meta.notaris" class="text-xs font-serif uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-0.5">
              {{ meta.notaris }}
            </p>
            <h1 class="text-lg font-bold font-serif uppercase tracking-wider text-slate-900 dark:text-slate-50 leading-tight">
              {{ meta.nama_sekolah || 'NAMA SEKOLAH BELUM DIISI' }}
            </h1>
            <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {{ meta.alamat_sekolah || 'Alamat lengkap sekolah, nomor telepon, dan email resmi' }}
            </p>
          </div>

          <!-- Spacer Seimbang Sisi Kanan -->
          <div class="w-20 hidden md:block"></div>
        </div>

        <!-- Garis Ganda Kop Surat Resmi -->
        <div class="mt-3 pt-1 border-t-2 border-b border-black dark:border-slate-200"></div>

        <!-- Subjudul Dokumen Contoh -->
        <div class="mt-2 text-center">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            JADWAL PELAJARAN SEMESTER {{ meta.semester }}
          </p>
          <p class="text-[11px] text-slate-600 dark:text-slate-400">
            TAHUN PELAJARAN {{ meta.tahun_pelajaran || '2026/2027' }}
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Kolom Kiri: Form Pengaturan Lengkap -->
      <div
        class="card p-6 space-y-4"
      >
        <div class="flex items-center space-x-2 border-b border-slate-200 pb-3 dark:border-slate-800/80">
          <School class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">Identitas Sekolah & Kop Dokumen</h3>
        </div>

        <!-- Upload Logo Sekolah -->
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Logo Sekolah (Format PNG / JPG)
          </label>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/png, image/jpeg"
            class="hidden"
            @change="handleLogoUpload"
          />
          <div class="flex items-center space-x-3">
            <div
              class="h-14 w-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden dark:border-slate-700 dark:bg-slate-900"
            >
              <img
                v-if="meta.logo_base64"
                :src="meta.logo_base64.startsWith('data:') ? meta.logo_base64 : `data:image/jpeg;base64,${meta.logo_base64}`"
                alt="Logo"
                class="h-full w-full object-contain p-1"
              />
              <School v-else class="h-6 w-6 text-slate-400" />
            </div>

            <div class="flex items-center space-x-2">
              <button
                type="button"
                @click="triggerUpload"
                class="btn btn-secondary"
              >
                <Upload class="h-3.5 w-3.5 text-slate-500" />
                <span>{{ meta.logo_base64 ? 'Ganti Logo' : 'Unggah Logo' }}</span>
              </button>

              <button
                v-if="meta.logo_base64"
                type="button"
                @click="removeLogo"
                class="flex items-center space-x-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <Trash2 class="h-3.5 w-3.5" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">
            Logo akan ditempatkan di sebelah kiri kop surat pada dokumen resmi.
          </p>
        </div>

        <!-- Nama Sekolah -->
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Resmi Sekolah / Madrasah</label>
          <input
            v-model="meta.nama_sekolah"
            type="text"
            placeholder="Contoh: SMP NEGERI 1 MERDEKA"
            class="field"
          />
        </div>

        <!-- Alamat Sekolah -->
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Alamat Lengkap & Kontak Sekolah</label>
          <input
            v-model="meta.alamat_sekolah"
            type="text"
            placeholder="Contoh: Jl. Pendidikan No. 1, Kota Contoh - Telp. (021) 000000"
            class="field"
          />
        </div>

        <!-- Notaris / Legalitas (Opsional) -->
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Badan Penyelenggara / SK Kemenkumham / Akta Notaris <span class="text-slate-400 font-normal">(Opsional)</span>
          </label>
          <input
            v-model="meta.notaris"
            type="text"
            placeholder="Contoh: YAYASAN PENDIDIKAN ISLAM - SK KEMENKUMHAM NO. AHU-00123.AH.01.04"
            class="field"
          />
        </div>

        <!-- Jenjang & Tahun Pelajaran -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jenjang Pendidikan</label>
            <select
              v-model="meta.jenjang"
              class="field"
            >
              <option value="SD">SD / MI</option>
              <option value="SMP">SMP / MTs</option>
              <option value="SMA">SMA / MA</option>
              <option value="SMK">SMK</option>
              <option value="LAINNYA">Lainnya</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tahun Pelajaran</label>
            <input
              v-model="meta.tahun_pelajaran"
              type="text"
              placeholder="Contoh: 2026/2027"
              class="field"
            />
          </div>
        </div>

        <!-- Semester & Kota Tanggal -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Semester</label>
            <select
              v-model="meta.semester"
              class="field"
            >
              <option value="GANJIL">Ganjil</option>
              <option value="GENAP">Genap</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Kota & Titimangsa</label>
            <input
              v-model="meta.kota_tanggal"
              type="text"
              placeholder="Contoh: Kota Contoh, 13 Juli 2026"
              class="field"
            />
          </div>
        </div>

        <!-- Pejabat Pengesahan -->
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jabatan Penandatangan</label>
          <input
            v-model="meta.pejabat_jabatan"
            type="text"
            placeholder="Contoh: Kepala Sekolah / Kepala Madrasah / Plt. Kepala Sekolah"
            class="field"
          />
        </div>

        <!-- Kepala Sekolah & NIP -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Pejabat / Kepala Sekolah</label>
            <input
              v-model="meta.kepala_sekolah_nama"
              type="text"
              placeholder="Nama lengkap & gelar"
              class="field"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">NIP Pejabat</label>
            <input
              v-model="meta.kepala_sekolah_nip"
              type="text"
              placeholder="NIP atau '-' jika non-PNS"
              class="field"
            />
          </div>
        </div>

        <div class="pt-2 flex items-center space-x-3">
          <button
            @click="saveSettings"
            class="btn btn-primary"
          >
            <Check class="h-3.5 w-3.5" />
            <span>Simpan Seluruh Pengaturan</span>
          </button>
        </div>
      </div>

      <!-- Kolom Kanan: Ringkasan Struktur Waktu Saat Ini -->
      <div
        class="card p-6 space-y-4"
      >
        <div class="flex items-center space-x-2 border-b border-slate-200 pb-3 dark:border-slate-800/80">
          <Clock class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">Struktur Waktu KBM Aktif</h3>
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <span class="text-slate-500 dark:text-slate-400">Pola Hari:</span>
            <div class="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
              {{ store.proyek.struktur_waktu.pola_hari }} Hari Kerja
            </div>
          </div>

          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <span class="text-slate-500 dark:text-slate-400">Durasi per Jam (JP):</span>
            <div class="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
              {{ store.proyek.struktur_waktu.durasi_jp_menit }} Menit
            </div>
          </div>
        </div>

        <!-- Daftar Hari Aktif dan Jumlah Slot -->
        <div>
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">Daftar Hari KBM Aktif:</span>
          <div class="space-y-2">
            <div
              v-for="(day, hariName) in store.proyek.struktur_waktu.hari"
              :key="hariName"
              :class="[
                'flex items-center justify-between rounded-lg border p-2.5 text-xs',
                day.aktif
                  ? 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200'
                  : 'border-slate-200/50 bg-slate-100/50 text-slate-400 opacity-60 dark:border-slate-800/40 dark:bg-slate-950/40 dark:text-slate-500'
              ]"
            >
              <div class="flex items-center space-x-2">
                <Calendar class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span class="font-semibold">{{ hariName }}</span>
              </div>
              <div class="text-right">
                <span v-if="day.aktif" class="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-medium">
                  {{ day.slots.filter((s) => s.tipe === 'kbm').reduce((sum, s) => sum + (s.jp && s.jp.length > 0 ? s.jp.length : 2), 0) }} JP
                  ({{ day.slots.filter((s) => s.tipe === 'kbm').length }} Blok, {{ day.slots.filter((s) => s.tipe === 'jeda').length }} Istirahat)
                </span>
                <span v-else class="text-slate-400 dark:text-slate-500 text-[11px]">Libur</span>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
