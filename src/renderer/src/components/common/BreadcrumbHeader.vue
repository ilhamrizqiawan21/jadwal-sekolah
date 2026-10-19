<script setup lang="ts">
import { computed } from 'vue'
import {
  Home,
  ChevronRight,
  Calendar,
  Layers,
  Users,
  GraduationCap,
  Settings,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Info,
  X
} from 'lucide-vue-next'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useUiStore, ActiveTab } from '../../stores/uiStore'

const props = defineProps<{
  notificationMessage?: string | null
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'clear-notification'): void
}>()

const store = useScheduleStore()
const uiStore = useUiStore()

interface BreadcrumbConfig {
  kategori: string
  label: string
  icon: any
}

const tabConfigs: Record<ActiveTab, BreadcrumbConfig> = {
  jadwal: {
    kategori: 'Jadwal Utama',
    label: 'Kisi Jadwal Pelajaran',
    icon: Calendar
  },
  beban: {
    kategori: 'Master Data',
    label: 'Beban Mengajar & Penugasan',
    icon: Layers
  },
  guru: {
    kategori: 'Master Data',
    label: 'Guru & Ketersediaan Jam',
    icon: Users
  },
  kelas: {
    kategori: 'Master Data',
    label: 'Rombongan Belajar (Kelas)',
    icon: GraduationCap
  },
  pengaturan: {
    kategori: 'Konfigurasi',
    label: 'Pengaturan & Format Dokumen',
    icon: Settings
  }
}

const currentConfig = computed(() => {
  return tabConfigs[uiStore.activeTab] || tabConfigs.jadwal
})

const errorCount = computed(() => {
  return store.hasilPemeriksaan.masalah.filter((m) => m.tingkat === 'error').length
})

const fileName = computed(() => {
  if (!store.filePath) return 'Proyek Baru (Belum Disimpan)'
  return store.filePath.split(/[\\/]/).pop() || store.filePath
})
</script>

<template>
  <header
    class="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 text-xs backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950/90 z-10"
  >
    <!-- Sisi Kiri: Breadcrumb Navigasi Hierarkis dengan Motion Fade -->
    <nav class="flex items-center space-x-1.5 overflow-hidden text-slate-500 dark:text-slate-400">
      <!-- Root: Nama Aplikasi / Sekolah -->
      <button
        @click="uiStore.setActiveTab('jadwal')"
        class="flex items-center space-x-1.5 rounded-md px-1.5 py-1 font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors dark:hover:bg-slate-900 dark:hover:text-slate-200"
        title="Kembali ke Kisi Jadwal"
      >
        <Home class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span class="font-semibold text-slate-800 dark:text-slate-200 max-w-[130px] sm:max-w-[180px] truncate">
          {{ store.proyek.meta.nama_sekolah || 'Jadwal Sekolah' }}
        </span>
      </button>

      <ChevronRight class="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 shrink-0" />

      <!-- Kategori Menu -->
      <span class="text-slate-400 dark:text-slate-500 hidden sm:inline text-[11px] font-medium">
        {{ currentConfig.kategori }}
      </span>

      <ChevronRight class="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 shrink-0 hidden sm:inline" />

      <!-- Halaman Menu Aktif dengan Animasi Transisi Halus -->
      <Transition name="breadcrumb-shift" mode="out-in">
        <div
          :key="uiStore.activeTab"
          class="flex items-center space-x-1.5 rounded-md bg-slate-100/80 px-2 py-0.5 text-slate-900 font-semibold dark:bg-slate-800/80 dark:text-emerald-300"
        >
          <component :is="currentConfig.icon" class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span class="truncate">{{ currentConfig.label }}</span>
        </div>
      </Transition>
    </nav>

    <!-- Sisi Kanan: Breadcrumb Notifikasi & Status Indikator Terintegrasi -->
    <div class="flex items-center space-x-2 shrink-0">
      <!-- 1. Notifikasi Pesan Aksi Sementara (Flash Toast Notification) -->
      <Transition name="notif-pop">
        <div
          v-if="notificationMessage"
          class="flex items-center space-x-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-300"
        >
          <Info class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          <span class="max-w-[240px] truncate">{{ notificationMessage }}</span>
          <button
            @click="emit('clear-notification')"
            class="ml-1 rounded p-0.5 text-emerald-600 hover:bg-emerald-200/60 dark:text-emerald-400 dark:hover:bg-emerald-900"
            title="Tutup Notifikasi"
          >
            <X class="h-3 w-3" />
          </button>
        </div>
      </Transition>

      <!-- 2. Status Bentrok Jadwal -->
      <button
        @click="uiStore.toggleRightSidebar"
        :class="[
          'flex items-center space-x-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition-all',
          errorCount > 0
            ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50'
            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-800'
        ]"
        :title="errorCount > 0 ? `${errorCount} bentrok ditemukan. Klik untuk buka panel rincian masalah` : 'Jadwal bebas bentrok guru'"
      >
        <AlertTriangle v-if="errorCount > 0" class="h-3.5 w-3.5 text-rose-500 animate-bounce" />
        <CheckCircle2 v-else class="h-3.5 w-3.5 text-emerald-500" />
        <span class="hidden md:inline font-mono">
          {{ errorCount > 0 ? `${errorCount} Bentrok` : 'Bebas Bentrok' }}
        </span>
      </button>

      <!-- 3. Status Penyimpanan Berkas (Dirty Flag & Quick Save) -->
      <button
        @click="emit('save')"
        :class="[
          'flex items-center space-x-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all shadow-xs',
          store.dirty
            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/60 font-semibold'
            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-800'
        ]"
        :title="store.dirty ? 'Ada perubahan belum disimpan. Klik untuk Simpan (Ctrl+S)' : 'Semua perubahan telah tersimpan'"
      >
        <span
          v-if="store.dirty"
          class="h-2 w-2 rounded-full bg-amber-500 animate-ping"
        />
        <Save class="h-3.5 w-3.5" :class="store.dirty ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'" />
        <span class="hidden sm:inline">
          {{ store.dirty ? 'Simpan' : 'Tersimpan' }}
        </span>
      </button>

      <!-- 4. Nama Berkas Jadwal (Compact Pill) -->
      <div
        class="hidden lg:flex items-center space-x-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 max-w-[160px] truncate"
        :title="store.filePath || 'Belum disimpan ke berkas fisik'"
      >
        <FileText class="h-3 w-3 text-slate-400 shrink-0" />
        <span class="truncate font-mono">{{ fileName }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Motion Transisi Breadcrumb Halus */
.breadcrumb-shift-enter-active,
.breadcrumb-shift-leave-active {
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.breadcrumb-shift-enter-from {
  opacity: 0;
  transform: translateX(-4px);
}
.breadcrumb-shift-leave-to {
  opacity: 0;
  transform: translateX(4px);
}

/* Motion Transisi Pop-in Notifikasi */
.notif-pop-enter-active,
.notif-pop-leave-active {
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.notif-pop-enter-from,
.notif-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.95);
}
</style>

