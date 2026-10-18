<script setup lang="ts">
import { ref } from 'vue'
import {
  School,
  Clock,
  Sparkles,
  Check,
  RotateCcw,
  Calendar
} from 'lucide-vue-next'
import { useScheduleStore } from '../../stores/scheduleStore'
import { TingkatTingkat, SemesterTipe } from '@core/types'

const emit = defineEmits<{
  (e: 'open-wizard'): void
}>()

const store = useScheduleStore()

const meta = ref({
  nama_sekolah: store.proyek.meta.nama_sekolah,
  jenjang: store.proyek.meta.jenjang,
  semester: store.proyek.meta.semester,
  tahun_pelajaran: store.proyek.meta.tahun_pelajaran,
  kota_tanggal: store.proyek.meta.kota_tanggal,
  kepala_sekolah_nama: store.proyek.meta.pejabat_ttd.nama,
  kepala_sekolah_nip: store.proyek.meta.pejabat_ttd.nip
})

const isSaved = ref<boolean>(false)

function saveSettings(): void {
  store.updateMetadata({
    nama_sekolah: meta.value.nama_sekolah.trim(),
    jenjang: meta.value.jenjang as TingkatTingkat,
    semester: meta.value.semester as SemesterTipe,
    tahun_pelajaran: meta.value.tahun_pelajaran.trim(),
    kota_tanggal: meta.value.kota_tanggal.trim(),
    pejabat_ttd: {
      jabatan: 'Kepala Sekolah',
      nama: meta.value.kepala_sekolah_nama.trim(),
      nip: meta.value.kepala_sekolah_nip.trim()
    }
  })
  isSaved.value = true
  setTimeout(() => {
    isSaved.value = false
  }, 2500)
}
</script>

<template>
  <div class="flex h-full w-full flex-col p-4 overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm mb-4 dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg">
      <div>
        <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">Pengaturan Sekolah & Struktur Waktu</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Ubah informasi kop dokumen resmi, kurikulum, dan struktur alokasi waktu KBM.
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

    <div class="grid grid-cols-2 gap-4">
      <!-- Kolom Kiri: Profil & Kop Dokumen -->
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg space-y-4">
        <div class="flex items-center space-x-2 border-b border-slate-200 pb-3 dark:border-slate-800/80">
          <School class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">Identitas Sekolah & Pengesahan</h3>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Sekolah</label>
          <input
            v-model="meta.nama_sekolah"
            type="text"
            class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jenjang</label>
            <select
              v-model="meta.jenjang"
              class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="SD">SD / MI</option>
              <option value="SMP">SMP / MTs</option>
              <option value="SMA">SMA / MA</option>
              <option value="SMK">SMK</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tahun Pelajaran</label>
            <input
              v-model="meta.tahun_pelajaran"
              type="text"
              class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

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
              class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Kepala Sekolah</label>
          <input
            v-model="meta.kepala_sekolah_nama"
            type="text"
            class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">NIP Kepala Sekolah</label>
          <input
            v-model="meta.kepala_sekolah_nip"
            type="text"
            class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div class="pt-2 flex items-center space-x-3">
          <button
            @click="saveSettings"
            class="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-900/20"
          >
            <Check class="h-3.5 w-3.5" />
            <span>Simpan Pengaturan</span>
          </button>
          <span v-if="isSaved" class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Tersimpan!</span>
        </div>
      </div>

      <!-- Kolom Kanan: Ringkasan Struktur Waktu Saat Ini -->
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-lg space-y-4">
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
                  {{ day.slots.filter((s) => s.tipe === 'kbm').length }} Jam Pelajaran
                  ({{ day.slots.filter((s) => s.tipe === 'istirahat').length }} Istirahat)
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
