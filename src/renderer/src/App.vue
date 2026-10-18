<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Calendar,
  Users,
  Layers,
  GraduationCap,
  Settings,
  FolderOpen,
  Save,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Database,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-vue-next'
import { useScheduleStore } from './stores/scheduleStore'
import { useUiStore, ActiveTab } from './stores/uiStore'

// Komponen
import SchoolSetupWizard from './components/wizard/SchoolSetupWizard.vue'
import ScheduleGridView from './components/grid/ScheduleGridView.vue'
import IssueSidebar from './components/sidebar/IssueSidebar.vue'
import GuruTab from './components/master/GuruTab.vue'
import KelasTab from './components/master/KelasTab.vue'
import BebanTab from './components/master/BebanTab.vue'
import PengaturanTab from './components/master/PengaturanTab.vue'

const store = useScheduleStore()
const uiStore = useUiStore()

const isExporting = ref<boolean>(false)
const exportStatusMessage = ref<string | null>(null)

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
        await window.api.printToPdf(savePath)
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

function handleLoadDummyData(): void {
  if (
    confirm(
      'Muat data contoh lengkap sekolah (14 kelas, 29 guru, penugasan, dan jadwal terisi)? Perubahan saat ini akan digantikan.'
    )
  ) {
    store.loadDummyProject()
    showNotification('✓ Data contoh lengkap berhasil dimuat')
  }
}

onMounted(() => {
  uiStore.initTheme()
  // Jika proyek baru pertama kali dan kelas masih kosong, tawarkan wizard
  if (store.proyek.master.kelas.length === 0 && store.proyek.meta.nama_sekolah === 'Sekolah Baru') {
    uiStore.setWizardOpen(true)
  }
})
</script>

<template>
  <div class="flex h-screen w-screen bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100 overflow-hidden select-none">
    <!-- Left Navigation Sidebar -->
    <aside
      :class="[
        'flex flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-all duration-300 ease-in-out shrink-0 z-20',
        uiStore.isLeftSidebarCollapsed ? 'w-16' : 'w-64'
      ]"
    >
      <!-- Header Sidebar: Logo, Brand & Collapse Toggle -->
      <div class="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-3.5">
        <div class="flex items-center space-x-2.5 overflow-hidden">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-md shadow-emerald-900/30">
            JS
          </div>
          <div v-if="!uiStore.isLeftSidebarCollapsed" class="min-w-0 flex-1 truncate">
            <div class="flex items-center space-x-1.5">
              <span class="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                {{ store.proyek.meta.nama_sekolah || 'Jadwal Sekolah' }}
              </span>
              <span
                v-if="store.dirty"
                class="h-2 w-2 shrink-0 rounded-full bg-amber-400"
                title="Ada perubahan belum disimpan"
              />
            </div>
            <p class="truncate text-[10px] text-slate-500 dark:text-slate-400">
              {{ store.proyek.meta.tahun_pelajaran }} • Sem. {{ store.proyek.meta.semester }}
            </p>
          </div>
        </div>

        <!-- Tombol Toggle Buka/Tutup Sidebar -->
        <button
          @click="uiStore.toggleLeftSidebar"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          :title="uiStore.isLeftSidebarCollapsed ? 'Buka Sidebar' : 'Tutup / Ciutkan Sidebar'"
        >
          <PanelLeftOpen v-if="uiStore.isLeftSidebarCollapsed" class="h-4 w-4" />
          <PanelLeftClose v-else class="h-4 w-4" />
        </button>
      </div>

      <!-- Scrollable Sidebar Body (Navigasi & Aksi) -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4">
        <!-- Section: Menu Utama -->
        <div>
          <div
            v-if="!uiStore.isLeftSidebarCollapsed"
            class="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            Menu Utama
          </div>
          <nav class="space-y-1">
            <button
              v-for="item in navItems"
              :key="item.id"
              @click="uiStore.setActiveTab(item.id)"
              :class="[
                'flex w-full items-center rounded-xl py-2 transition-all font-medium text-xs',
                uiStore.isLeftSidebarCollapsed ? 'justify-center px-0' : 'px-3 space-x-3',
                uiStore.activeTab === item.id
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
              ]"
              :title="item.label"
            >
              <component :is="item.icon" class="h-4 w-4 shrink-0" />
              <span v-if="!uiStore.isLeftSidebarCollapsed" class="truncate">{{ item.label }}</span>
            </button>
          </nav>
        </div>

        <!-- Section: Aksi Dokumen -->
        <div>
          <div
            v-if="!uiStore.isLeftSidebarCollapsed"
            class="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            Dokumen & Berkas
          </div>
          <div class="space-y-1">
            <!-- Buka Berkas -->
            <button
              @click="handleOpenFile"
              :class="[
                'flex w-full items-center rounded-xl py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-colors',
                uiStore.isLeftSidebarCollapsed ? 'justify-center px-0' : 'px-3 space-x-3'
              ]"
              title="Buka Berkas Jadwal (.jadwal)"
            >
              <FolderOpen class="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <span v-if="!uiStore.isLeftSidebarCollapsed" class="truncate">Buka Berkas</span>
            </button>

            <!-- Simpan -->
            <button
              @click="handleSaveFile"
              :class="[
                'flex w-full items-center rounded-xl py-2 text-xs font-medium transition-all',
                uiStore.isLeftSidebarCollapsed ? 'justify-center px-0' : 'px-3 space-x-3',
                store.dirty
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
              ]"
              :title="store.dirty ? 'Simpan Perubahan (Ctrl+S)' : 'Jadwal Sudah Tersimpan (Ctrl+S)'"
            >
              <Save class="h-4 w-4 shrink-0" />
              <span v-if="!uiStore.isLeftSidebarCollapsed" class="truncate">
                {{ store.dirty ? 'Simpan Perubahan' : 'Simpan' }}
              </span>
            </button>

            <!-- Ekspor Excel -->
            <button
              @click="handleExportExcel"
              :class="[
                'flex w-full items-center rounded-xl py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-colors',
                uiStore.isLeftSidebarCollapsed ? 'justify-center px-0' : 'px-3 space-x-3'
              ]"
              title="Ekspor Jadwal ke Excel (.xlsx)"
            >
              <FileSpreadsheet class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span v-if="!uiStore.isLeftSidebarCollapsed" class="truncate">Ekspor Excel</span>
            </button>

            <!-- Cetak PDF -->
            <button
              @click="handlePrintPdf"
              :class="[
                'flex w-full items-center rounded-xl py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-colors',
                uiStore.isLeftSidebarCollapsed ? 'justify-center px-0' : 'px-3 space-x-3'
              ]"
              title="Cetak Dokumen Resmi PDF"
            >
              <Printer class="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
              <span v-if="!uiStore.isLeftSidebarCollapsed" class="truncate">Cetak PDF</span>
            </button>

            <!-- Setup Wizard -->
            <button
              @click="uiStore.setWizardOpen(true)"
              :class="[
                'flex w-full items-center rounded-xl py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-colors',
                uiStore.isLeftSidebarCollapsed ? 'justify-center px-0' : 'px-3 space-x-3'
              ]"
              title="Setup Proyek Baru"
            >
              <Sparkles class="h-4 w-4 shrink-0 text-amber-500" />
              <span v-if="!uiStore.isLeftSidebarCollapsed" class="truncate">Setup Wizard</span>
            </button>

            <!-- Muat Data Contoh -->
            <button
              @click="handleLoadDummyData"
              :class="[
                'flex w-full items-center rounded-xl py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-colors',
                uiStore.isLeftSidebarCollapsed ? 'justify-center px-0' : 'px-3 space-x-3'
              ]"
              title="Muat Data Contoh Lengkap Sekolah (14 Kelas, 29 Guru, Jadwal Terisi)"
            >
              <Database class="h-4 w-4 shrink-0 text-emerald-500" />
              <span v-if="!uiStore.isLeftSidebarCollapsed" class="truncate">Data Contoh</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer Sidebar: Switch Tema & Info Status -->
      <div class="border-t border-slate-200 dark:border-slate-800 p-2.5 space-y-1">
        <!-- Tombol Switch Tema -->
        <button
          @click="uiStore.toggleTheme"
          :class="[
            'flex w-full items-center rounded-xl py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-colors',
            uiStore.isLeftSidebarCollapsed ? 'justify-center px-0' : 'px-3 space-x-3'
          ]"
          :title="uiStore.theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'"
        >
          <Sun v-if="uiStore.theme === 'dark'" class="h-4 w-4 shrink-0 text-amber-400" />
          <Moon v-else class="h-4 w-4 shrink-0 text-indigo-500" />
          <span v-if="!uiStore.isLeftSidebarCollapsed" class="truncate">
            {{ uiStore.theme === 'dark' ? 'Mode Gelap' : 'Mode Terang' }}
          </span>
        </button>

        <!-- Informasi Berkas Ringkas (Expanded Only) -->
        <div v-if="!uiStore.isLeftSidebarCollapsed" class="px-3 pt-1 text-[10px] text-slate-400 dark:text-slate-500 truncate">
          <span v-if="store.filePath" :title="store.filePath">📁 {{ store.filePath.split(/[\\/]/).pop() }}</span>
          <span v-else>📁 Belum tersimpan di disk</span>
        </div>
      </div>
    </aside>

    <!-- Area Konten Utama (Right Workspace) -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Notifikasi Status Aksi (Jika ada toast ekspor/simpan) -->
      <div
        v-if="exportStatusMessage"
        class="bg-emerald-600 px-4 py-1 text-center text-xs font-semibold text-white animate-in slide-in-from-top duration-150 shrink-0"
      >
        {{ exportStatusMessage }}
      </div>

      <!-- Workspace Konten Tab -->
      <main class="flex flex-1 overflow-hidden">
        <!-- Tab 1: Kisi Jadwal & Panel Masalah -->
        <div v-if="uiStore.activeTab === 'jadwal'" class="flex h-full w-full overflow-hidden">
          <div class="flex-1 overflow-hidden">
            <ScheduleGridView />
          </div>
          <IssueSidebar />
        </div>

        <!-- Tab 2: Beban Mengajar -->
        <div v-else-if="uiStore.activeTab === 'beban'" class="h-full w-full overflow-hidden">
          <BebanTab />
        </div>

        <!-- Tab 3: Guru & Jam Berhalangan -->
        <div v-else-if="uiStore.activeTab === 'guru'" class="h-full w-full overflow-hidden">
          <GuruTab />
        </div>

        <!-- Tab 4: Kelas & Rombel -->
        <div v-else-if="uiStore.activeTab === 'kelas'" class="h-full w-full overflow-hidden">
          <KelasTab />
        </div>

        <!-- Tab 5: Pengaturan -->
        <div v-else-if="uiStore.activeTab === 'pengaturan'" class="h-full w-full overflow-hidden">
          <PengaturanTab @open-wizard="uiStore.setWizardOpen(true)" />
        </div>
      </main>
    </div>

    <!-- Modal Wizard Onboarding Setup Sekolah Baru -->
    <SchoolSetupWizard
      v-model="uiStore.isWizardOpen"
      @completed="uiStore.setActiveTab('jadwal')"
    />
  </div>
</template>
