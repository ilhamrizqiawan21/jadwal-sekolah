<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  School,
  Clock,
  Sparkles,
  Check,
  Calendar,
  Upload,
  Trash2,
  FileText,
  Eye,
  FolderOpen,
  Save,
  FileDown
} from 'lucide-vue-next'
import { useScheduleStore } from '../../stores/scheduleStore'
import { TingkatTingkat, SemesterTipe } from '@core/types'

const emit = defineEmits<{
  (e: 'open-wizard'): void
}>()

const store = useScheduleStore()

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

const isSaved = ref<boolean>(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerUpload(): void {
  fileInputRef.value?.click()
}

function handleLogoUpload(event: Event): void {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        // Resize otomatis via canvas agar ukuran base64 hemat memori (maks 300x300 px)
        const img = new Image()
        img.onload = () => {
          const maxDim = 300
          let w = img.width
          let h = img.height

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w)
              w = maxDim
            } else {
              w = Math.round((w * maxDim) / h)
              h = maxDim
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h)
            meta.value.logo_base64 = canvas.toDataURL('image/png')
          } else {
            meta.value.logo_base64 = result
          }
        }
        img.src = result
      }
    }
    reader.readAsDataURL(file)
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
  isSaved.value = true
  setTimeout(() => {
    isSaved.value = false
  }, 2500)
}

// ----------------------------------------------------------------- Manajemen Berkas Proyek
const fileStatusMessage = ref<string | null>(null)
function showFileMsg(msg: string): void {
  fileStatusMessage.value = msg
  setTimeout(() => {
    fileStatusMessage.value = null
  }, 3500)
}

async function handleOpenFile(): Promise<void> {
  try {
    if (window.api) {
      const res = await window.api.openFileDialog()
      if (res && res.data) {
        store.loadProjectData(res.data, res.filePath)
        showFileMsg('✓ Berkas jadwal berhasil dimuat')
      }
    } else {
      alert('Fitur buka berkas aktif pada mode aplikasi desktop')
    }
  } catch (err: any) {
    alert(`Gagal membuka berkas: ${err.message}`)
  }
}

async function handleSaveFile(): Promise<void> {
  try {
    if (window.api) {
      if (store.filePath) {
        await window.api.saveProject(store.filePath, store.proyek)
        store.dirty = false
        showFileMsg('✓ Seluruh perubahan berhasil disimpan')
      } else {
        await handleSaveAsFile()
      }
    } else {
      alert('Fitur simpan aktif pada mode desktop')
    }
  } catch (err: any) {
    alert(`Gagal menyimpan berkas: ${err.message}`)
  }
}

async function handleSaveAsFile(): Promise<void> {
  try {
    if (window.api) {
      const safeSchoolName = (store.proyek.meta.nama_sekolah || 'jadwal-sekolah')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
      const defaultName = `${safeSchoolName}.jadwal`
      const savedPath = await window.api.saveFileDialog(defaultName, store.proyek)
      if (savedPath) {
        store.filePath = savedPath
        store.dirty = false
        showFileMsg('✓ Berkas berhasil disimpan ke: ' + savedPath)
      }
    }
  } catch (err: any) {
    alert(`Gagal menyimpan berkas: ${err.message}`)
  }
}
</script>

<template>
  <div class="flex h-full w-full flex-col p-4 overflow-y-auto">
    <!-- Header -->
    <div
      class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm mb-4 dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg"
    >
      <div>
        <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">
          Pengaturan Sekolah & Format Kop Surat
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Atur logo, nama sekolah, alamat, legalitas notaris, tahun ajaran, dan pengesahan untuk hasil cetak PDF & Excel resmi.
        </p>
      </div>

      <button
        @click="emit('open-wizard')"
        class="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:shadow-md"
      >
        <Sparkles class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <span>Jalankan Setup Wizard Ulang</span>
      </button>
    </div>

    <!-- Card: Manajemen Berkas & Penyimpanan Proyek -->
    <div
      class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm mb-4 dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg"
    >
      <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 dark:border-slate-800/80">
        <div class="flex items-center space-x-2">
          <FolderOpen class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Penyimpanan & Manajemen Berkas Proyek (.jadwal)
          </h3>
        </div>
        <div class="flex items-center space-x-2">
          <span
            :class="[
              'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium font-mono',
              store.dirty
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
            ]"
          >
            {{ store.dirty ? '● Ada perubahan belum disimpan' : '✓ Semua perubahan tersimpan' }}
          </span>
        </div>
      </div>

      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Info Path Berkas -->
        <div class="flex-1 space-y-1">
          <div class="text-xs text-slate-500 dark:text-slate-400">
            Lokasi Berkas Jadwal Aktif Saat Ini:
          </div>
          <div
            class="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 truncate"
            :title="store.filePath || 'Belum disimpan ke berkas fisik'"
          >
            {{ store.filePath || 'Belum disimpan ke berkas fisik (proyek baru)' }}
          </div>
          <p class="text-[11px] text-slate-400 dark:text-slate-500">
            Berkas .jadwal tersimpan 100% offline di komputer Anda dan dapat disalin atau dipindahkan antar perangkat.
          </p>
        </div>

        <!-- Tombol Aksi -->
        <div class="flex items-center space-x-2 shrink-0">
          <!-- Buka / Impor -->
          <button
            @click="handleOpenFile"
            class="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-sm"
            title="Buka atau impor berkas .jadwal dari penyimpanan komputer"
          >
            <FolderOpen class="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Buka / Impor Berkas</span>
          </button>

          <!-- Simpan -->
          <button
            @click="handleSaveFile"
            :class="[
              'flex items-center space-x-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-all shadow-sm',
              store.dirty
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                : 'bg-slate-700 hover:bg-slate-600'
            ]"
            title="Simpan seluruh jadwal ke berkas aktif (Ctrl+S)"
          >
            <Save class="h-4 w-4" />
            <span>{{ store.dirty ? 'Simpan Perubahan' : 'Simpan Berkas' }}</span>
          </button>

          <!-- Simpan Salinan Baru -->
          <button
            @click="handleSaveAsFile"
            class="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-sm"
            title="Simpan salinan berkas jadwal ke lokasi/nama lain"
          >
            <FileDown class="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Simpan Salinan Baru</span>
          </button>
        </div>
      </div>

      <!-- Pesan Notifikasi Berkas -->
      <div v-if="fileStatusMessage" class="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        {{ fileStatusMessage }}
      </div>
    </div>

    <!-- Live Preview Kop Surat Resmi -->
    <div
      class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm mb-4 dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg"
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
        class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg space-y-4"
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
                class="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
            placeholder="Contoh: SMP NEGERI 1 BATUJAJAR"
            class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <!-- Alamat Sekolah -->
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Alamat Lengkap & Kontak Sekolah</label>
          <input
            v-model="meta.alamat_sekolah"
            type="text"
            placeholder="Contoh: Jl. Raya Batujajar No. 123, Kab. Bandung Barat - Telp. (022) 123456"
            class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
            class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <!-- Jenjang & Tahun Pelajaran -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jenjang Pendidikan</label>
            <select
              v-model="meta.jenjang"
              class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
              class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <!-- Semester & Kota Tanggal -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Semester</label>
            <select
              v-model="meta.semester"
              class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
              placeholder="Contoh: Batujajar, 14 Juli 2026"
              class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
            class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
              class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">NIP Pejabat</label>
            <input
              v-model="meta.kepala_sekolah_nip"
              type="text"
              placeholder="NIP atau '-' jika non-PNS"
              class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div class="pt-2 flex items-center space-x-3">
          <button
            @click="saveSettings"
            class="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-900/20"
          >
            <Check class="h-3.5 w-3.5" />
            <span>Simpan Seluruh Pengaturan</span>
          </button>
          <span v-if="isSaved" class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
            ✓ Pengaturan berhasil disimpan ke berkas jadwal!
          </span>
        </div>
      </div>

      <!-- Kolom Kanan: Ringkasan Struktur Waktu Saat Ini -->
      <div
        class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg space-y-4"
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
