<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  Calendar,
  Users,
  Layers,
  GraduationCap,
  Settings,
  FileSpreadsheet,
  Printer,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'
import { useScheduleStore } from './stores/scheduleStore'
import { useUiStore, ActiveTab } from './stores/uiStore'
import { getDefaultAppIcon, formatWindowTitle } from './utils/app-icon'

// Komponen
import SchoolSetupWizard from './components/wizard/SchoolSetupWizard.vue'
import ScheduleGridView from './components/grid/ScheduleGridView.vue'
import IssueSidebar from './components/sidebar/IssueSidebar.vue'
import GuruTab from './components/master/GuruTab.vue'
import KelasTab from './components/master/KelasTab.vue'
import BebanTab from './components/master/BebanTab.vue'
import PengaturanTab from './components/master/PengaturanTab.vue'
import ExportPreviewModal from './components/export/ExportPreviewModal.vue'
import BreadcrumbHeader from './components/common/BreadcrumbHeader.vue'

const store = useScheduleStore()
const uiStore = useUiStore()

// Gunakan khusus logo_base64 (persegi 1:1) dan bukan kop surat lebar horizontal
const schoolLogoUrl = computed(() => {
  const raw = store.proyek.meta.logo_base64?.trim() || ''
  if (!raw) return ''
  return raw.startsWith('data:image/') ? raw : `data:image/jpeg;base64,${raw}`
})

const defaultAppIcon = computed(() => getDefaultAppIcon())
const activeLogoUrl = computed(() => schoolLogoUrl.value || defaultAppIcon.value)

// 1. Sinkronisasi Ikon Jendela & Favicon saat Logo Berubah (Payload Gambar)
watch(
  activeLogoUrl,
  (newLogo) => {
    const windowTitle = formatWindowTitle(store.proyek.meta.nama_sekolah)
    if (typeof document !== 'undefined') {
      const favicon = document.getElementById('app-dynamic-favicon') as HTMLLinkElement | null
      if (favicon && newLogo) {
        favicon.href = newLogo
      }
    }
    if (window.api?.updateWindowIcon && newLogo) {
      window.api.updateWindowIcon(newLogo, windowTitle).catch(() => {})
    }
  },
  { immediate: true }
)

// 2. Sinkronisasi Judul Jendela saat Nama Sekolah Diedit (Tanpa Resend Payload Gambar)
watch(
  () => store.proyek.meta.nama_sekolah,
  (newName) => {
    const windowTitle = formatWindowTitle(newName)
    if (typeof document !== 'undefined') {
      document.title = windowTitle
    }
    if (window.api?.updateWindowIcon) {
      window.api.updateWindowIcon(null, windowTitle).catch(() => {})
    }
  }
)


const isExporting = ref<boolean>(false)
const exportStatusMessage = ref<string | null>(null)
const isExportPreviewOpen = ref<boolean>(false)
const previewInitialTab = ref<'jadwal' | 'beban'>('jadwal')

function openExportPreview(tab: 'jadwal' | 'beban' = 'jadwal'): void {
  previewInitialTab.value = tab
  isExportPreviewOpen.value = true
}

const navItems: { id: ActiveTab; label: string; icon: any }[] = [
  { id: 'jadwal', label: 'Jadwal KBM', icon: Calendar },
  { id: 'beban', label: 'Beban Mengajar', icon: Layers },
  { id: 'guru', label: 'Guru & Izin', icon: Users },
  { id: 'kelas', label: 'Data Kelas', icon: GraduationCap },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings }
]

function showNotification(msg: string): void {
  exportStatusMessage.value = msg
  setTimeout(() => {
    exportStatusMessage.value = null
  }, 3000)
}

// ----------------------------------------------------------------- Berkas & Penyimpanan
async function handleOpenFile(): Promise<void> {
  try {
    if (window.api?.openFileDialog) {
      const res = await window.api.openFileDialog()
      if (res && res.data) {
        store.loadProjectData(res.data, res.filePath)
        showNotification('✓ Berkas berhasil dimuat')
      }
    } else {
      showNotification('Fitur berkas aktif pada mode aplikasi desktop Electron')
    }
  } catch (err: any) {
    alert(`Gagal membuka berkas: ${err.message}`)
  }
}

async function handleSaveFile(): Promise<void> {
  try {
    if (window.api?.saveProject) {
      if (store.filePath) {
        await window.api.saveProject(store.filePath, store.proyek)
        store.dirty = false
        showNotification('✓ Berhasil disimpan')
      } else {
        const savedPath = await window.api.saveFileDialog('jadwal-sekolah.jadwal', store.proyek)
        if (savedPath) {
          store.filePath = savedPath
          store.dirty = false
          showNotification('✓ Berhasil disimpan')
        }
      }
    } else {
      showNotification('Fitur simpan aktif pada mode desktop Electron')
    }
  } catch (err: any) {
    alert(`Gagal menyimpan berkas: ${err.message}`)
  }
}

async function handleExportExcel(): Promise<void> {
  try {
    if (window.api?.exportExcel) {
      const savePath = await window.api.saveFileDialog('jadwal-sekolah.xlsx')
      if (savePath) {
        isExporting.value = true
        await window.api.exportExcel(savePath, store.proyek)
        isExporting.value = false
        showNotification('✓ Ekspor Excel (.xlsx) selesai')
      }
    } else {
      showNotification('Ekspor Excel tersedia di desktop')
    }
  } catch (err: any) {
    isExporting.value = false
    alert(`Gagal ekspor Excel: ${err.message}`)
  }
}

async function handlePrintPdf(): Promise<void> {
  try {
    if (window.api?.printToPdf) {
      const savePath = await window.api.saveFileDialog('jadwal-sekolah.pdf')
      if (savePath) {
        isExporting.value = true
        await window.api.printToPdf(savePath, store.proyek)
        isExporting.value = false
        showNotification('✓ Berkas PDF berhasil dicetak')
      }
    } else {
      window.print()
    }
  } catch (err: any) {
    isExporting.value = false
    alert(`Gagal mencetak PDF: ${err.message}`)
  }
}

function handleGlobalKeyDown(e: KeyboardEvent): void {
  // Ctrl+S / Cmd+S untuk simpan berkas
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault()
    handleSaveFile()
    return
  }

  // Ctrl+B / Cmd+B untuk toggle sidebar kiri
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
    e.preventDefault()
    uiStore.toggleLeftSidebar()
    return
  }

  // Ctrl+I / Cmd+I untuk toggle panel masalah kanan (hindari Ctrl+Shift+I yang merupakan DevTools)
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'i') {
    e.preventDefault()
    uiStore.toggleRightSidebar()
    return
  }
}

let lastWindowWidth = typeof window !== 'undefined' ? window.innerWidth : 1360

function handleWindowResize(): void {
  const currentWidth = window.innerWidth
  // Jika jendela diperkecil melintasi batas 1024px, ciutkan sidebar kiri otomatis
  if (currentWidth < 1024 && lastWindowWidth >= 1024 && !uiStore.isLeftSidebarCollapsed) {
    uiStore.setLeftSidebarCollapsed(true)
  }
  // Jika jendela diperkecil melintasi batas 1100px, ciutkan panel masalah kanan otomatis
  if (currentWidth < 1100 && lastWindowWidth >= 1100 && uiStore.isRightSidebarOpen) {
    uiStore.setRightSidebarOpen(false)
  }
  lastWindowWidth = currentWidth
}

onMounted(() => {
  uiStore.initTheme()
  window.addEventListener('keydown', handleGlobalKeyDown)
  window.addEventListener('resize', handleWindowResize)
  handleWindowResize()

  // Jika proyek baru pertama kali dan kelas masih kosong, tawarkan wizard
  if (store.proyek.master.kelas.length === 0 && store.proyek.meta.nama_sekolah === 'Sekolah Baru') {
    uiStore.setWizardOpen(true)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown)
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<template>
  <div class="flex h-screen w-screen bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100 overflow-hidden select-none">
    <!-- Left Navigation Sidebar -->
    <aside
      :class="[
        'relative flex flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-all duration-200 ease-in-out shrink-0 z-20',
        uiStore.isLeftSidebarCollapsed ? 'w-16' : 'w-64'
      ]"
    >
      <!-- Header Sidebar: Expanded Mode (Logo Sekolah + Info + Tombol Toggle Tunggal di Bawahnya) -->
      <div
        v-if="!uiStore.isLeftSidebarCollapsed"
        class="border-b border-slate-200 dark:border-slate-800 p-3 space-y-2.5 shrink-0 transition-all"
      >
        <div class="flex items-center space-x-2.5 min-w-0">
          <!-- Logo Sekolah Responsif (Membesar saat Terbuka) -->
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <img
              :src="activeLogoUrl"
              :alt="schoolLogoUrl ? 'Logo Sekolah' : 'Logo Jadwal Sekolah'"
              class="h-full w-full object-contain p-1"
            />
          </div>

          <!-- Info Nama & Periode Sekolah -->
          <div class="min-w-0 flex-1 truncate">
            <div class="flex items-center space-x-1.5">
              <span class="truncate text-xs font-bold text-slate-900 dark:text-slate-100" :title="store.proyek.meta.nama_sekolah">
                {{ store.proyek.meta.nama_sekolah || 'Jadwal Sekolah' }}
              </span>
              <span
                v-if="store.dirty"
                class="h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse"
                title="Ada perubahan belum disimpan"
              />
            </div>
            <p class="truncate text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {{ store.proyek.meta.tahun_pelajaran || '2026/2027' }} • Sem. {{ store.proyek.meta.semester || 'GANJIL' }}
            </p>
          </div>
        </div>

        <!-- Tombol Toggle Minimalis Tunggal di Bawah Logo (Expanded Mode) -->
        <div class="flex items-center justify-center pt-0.5">
          <button
            @click="uiStore.toggleLeftSidebar"
            class="group flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 hover:bg-emerald-50 dark:bg-slate-900/80 dark:hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-800 transition-all shadow-2xs hover:scale-105"
            title="Ciutkan Sidebar (Ctrl+B)"
          >
            <PanelLeftClose class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          </button>
        </div>
      </div>

      <!-- Header Sidebar: Collapsed Mode (Logo Sekolah Responsif + Tombol Toggle Minimalis di Bawahnya) -->
      <div
        v-else
        class="border-b border-slate-200 dark:border-slate-800 p-2.5 flex flex-col items-center space-y-2 shrink-0 transition-all"
      >
        <!-- Logo Sekolah Responsif (Mengecil saat Tertutup) -->
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs transition-all duration-200"
          :title="store.proyek.meta.nama_sekolah || 'Jadwal Sekolah'"
        >
          <img
            :src="activeLogoUrl"
            :alt="schoolLogoUrl ? 'Logo Sekolah' : 'Logo Jadwal Sekolah'"
            class="h-full w-full object-contain p-0.5"
          />
        </div>

        <!-- Tombol Toggle Minimalis Tunggal di Bawah Logo (Collapsed Mode) -->
        <button
          @click="uiStore.toggleLeftSidebar"
          class="group flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 hover:bg-emerald-50 dark:bg-slate-900/80 dark:hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-800 transition-all shadow-2xs hover:scale-105"
          title="Buka Sidebar (Ctrl+B)"
        >
          <PanelLeftOpen class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>


      <!-- Scrollable Sidebar Body (Navigasi & Aksi) -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
        <!-- Section: Menu Utama -->
        <div>
          <div
            v-if="!uiStore.isLeftSidebarCollapsed"
            class="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            Menu Utama
          </div>
          <nav class="space-y-1">
            <button
              v-for="item in navItems"
              :key="item.id"
              @click="uiStore.setActiveTab(item.id)"
              :class="[
                'flex items-center rounded-xl font-medium text-xs transition-all relative',
                uiStore.isLeftSidebarCollapsed
                  ? 'h-10 w-10 mx-auto justify-center'
                  : 'w-full py-2.5 px-3 space-x-3',
                uiStore.activeTab === item.id
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 shadow-xs font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
              ]"
              :title="item.label"
            >
              <div
                v-if="!uiStore.isLeftSidebarCollapsed && uiStore.activeTab === item.id"
                class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-600 dark:bg-emerald-400"
              />
              <component :is="item.icon" class="h-4 w-4 shrink-0" />
              <span v-if="!uiStore.isLeftSidebarCollapsed" class="truncate">{{ item.label }}</span>
            </button>
          </nav>
        </div>

        <!-- Divider Halus Antar Seksi saat Collapsed -->
        <div v-if="uiStore.isLeftSidebarCollapsed" class="w-8 h-px bg-slate-200 dark:bg-slate-800 mx-auto" />

        <!-- Section: Cetak & Ekspor -->
        <div>
          <div
            v-if="!uiStore.isLeftSidebarCollapsed"
            class="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            Cetak & Ekspor
          </div>
          <div class="space-y-1">
            <!-- Cetak & Ekspor Tunggal (Buka Pratinjau A4 Terlebih Dahulu) -->
            <button
              @click="openExportPreview('jadwal')"
              :class="[
                'flex items-center rounded-xl font-medium text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-colors',
                uiStore.isLeftSidebarCollapsed
                  ? 'h-10 w-10 mx-auto justify-center'
                  : 'w-full py-2.5 px-3 space-x-3'
              ]"
              title="Pratinjau Lembar Cetak Dokumen A4 & Ekspor"
            >
              <Printer class="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
              <span v-if="!uiStore.isLeftSidebarCollapsed" class="truncate font-medium">Cetak & Ekspor</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer Sidebar: Switch Tema & Info Status -->
      <div class="border-t border-slate-200 dark:border-slate-800 p-2 space-y-1.5 shrink-0">
        <!-- Tombol Switch Tema -->
        <button
          @click="uiStore.toggleTheme"
          :class="[
            'flex items-center rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-colors',
            uiStore.isLeftSidebarCollapsed
              ? 'h-10 w-10 mx-auto justify-center'
              : 'w-full py-2 px-3 justify-between'
          ]"
          :title="uiStore.theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'"
        >
          <div class="flex items-center space-x-2.5">
            <Sun v-if="uiStore.theme === 'dark'" class="h-4 w-4 shrink-0 text-amber-400" />
            <Moon v-else class="h-4 w-4 shrink-0 text-indigo-500" />
            <span v-if="!uiStore.isLeftSidebarCollapsed" class="truncate">
              {{ uiStore.theme === 'dark' ? 'Mode Gelap' : 'Mode Terang' }}
            </span>
          </div>
          <span
            v-if="!uiStore.isLeftSidebarCollapsed"
            class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
          >
            {{ uiStore.theme }}
          </span>
        </button>

        <!-- Informasi Berkas Ringkas (Expanded Only) -->
        <div v-if="!uiStore.isLeftSidebarCollapsed" class="px-2 pt-0.5 text-[10px] text-slate-400 dark:text-slate-500 truncate flex items-center space-x-1.5">
          <span class="truncate" :title="store.filePath || 'Belum disimpan'">
            📁 {{ store.filePath ? store.filePath.split(/[\\/]/).pop() : 'Belum tersimpan di disk' }}
          </span>
        </div>
      </div>
    </aside>

    <!-- Area Konten Utama (Right Workspace) -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Breadcrumb Navigasi & Notifikasi Terpadu -->
      <BreadcrumbHeader
        :notification-message="exportStatusMessage"
        @save="handleSaveFile"
        @clear-notification="exportStatusMessage = null"
      />

      <!-- Workspace Konten Tab dengan Motion Transisi Halus -->
      <main class="flex flex-1 overflow-hidden relative">
        <Transition name="tab-motion" mode="out-in">
          <!-- Tab 1: Kisi Jadwal & Panel Masalah -->
          <div v-if="uiStore.activeTab === 'jadwal'" key="jadwal" class="flex h-full w-full overflow-hidden">
            <div class="flex-1 overflow-hidden">
              <ScheduleGridView />
            </div>
            <IssueSidebar v-if="uiStore.isRightSidebarOpen" />
          </div>

          <!-- Tab 2: Beban Mengajar -->
          <div v-else-if="uiStore.activeTab === 'beban'" key="beban" class="h-full w-full overflow-hidden">
            <BebanTab />
          </div>

          <!-- Tab 3: Guru & Jam Berhalangan -->
          <div v-else-if="uiStore.activeTab === 'guru'" key="guru" class="h-full w-full overflow-hidden">
            <GuruTab />
          </div>

          <!-- Tab 4: Kelas & Rombel -->
          <div v-else-if="uiStore.activeTab === 'kelas'" key="kelas" class="h-full w-full overflow-hidden">
            <KelasTab />
          </div>

          <!-- Tab 5: Pengaturan -->
          <div v-else-if="uiStore.activeTab === 'pengaturan'" key="pengaturan" class="h-full w-full overflow-hidden">
            <PengaturanTab @open-wizard="uiStore.setWizardOpen(true)" />
          </div>
        </Transition>
      </main>
    </div>

    <!-- Modal Wizard Onboarding Setup Sekolah Baru -->
    <SchoolSetupWizard
      v-model="uiStore.isWizardOpen"
      @completed="uiStore.setActiveTab('jadwal')"
    />

    <!-- Modal Pratinjau Dokumen Cetak Resmi Sebelum Simpan File -->
    <ExportPreviewModal
      v-model="isExportPreviewOpen"
      :initial-tab="previewInitialTab"
      @export-pdf="handlePrintPdf"
      @export-excel="handleExportExcel"
    />
  </div>
</template>

<style scoped>
/* Motion Transisi Halus Antar Menu Tab */
.tab-motion-enter-active,
.tab-motion-leave-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-motion-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.997);
}

.tab-motion-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.997);
}
</style>

