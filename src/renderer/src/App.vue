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
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon
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

onMounted(() => {
  uiStore.initTheme()
  // Jika proyek baru pertama kali dan kelas masih kosong, tawarkan wizard
  if (store.proyek.master.kelas.length === 0 && store.proyek.meta.nama_sekolah === 'Sekolah Baru') {
    uiStore.setWizardOpen(true)
  }
})
</script>

<template>
  <div class="flex h-screen w-screen flex-col bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100 overflow-hidden select-none">
    <!-- Header / Navbar Aplikasi Modern -->
    <header class="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 px-4 shadow-sm dark:shadow-none">
      <!-- Identitas & Menu Berkas -->
      <div class="flex items-center space-x-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-900/40">
          JS
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
              {{ store.proyek.meta.nama_sekolah || 'Jadwal Sekolah' }}
            </h1>
            <span
              v-if="store.dirty"
              class="h-2 w-2 rounded-full bg-amber-400"
              title="Ada perubahan belum disimpan"
            />
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">
            Tahun Pelajaran {{ store.proyek.meta.tahun_pelajaran }} — Semester {{ store.proyek.meta.semester }}
            <span v-if="store.filePath" class="text-slate-400 dark:text-slate-500">({{ store.filePath }})</span>
          </p>
        </div>
      </div>

      <!-- Navigasi Tabs Utama -->
      <nav class="flex space-x-1 rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
        <button
          @click="uiStore.setActiveTab('jadwal')"
          :class="[
            'flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            uiStore.activeTab === 'jadwal'
              ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          ]"
        >
          <Calendar class="h-4 w-4" />
          <span>Jadwal</span>
        </button>

        <button
          @click="uiStore.setActiveTab('beban')"
          :class="[
            'flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            uiStore.activeTab === 'beban'
              ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          ]"
        >
          <Layers class="h-4 w-4" />
          <span>Beban Mengajar</span>
        </button>

        <button
          @click="uiStore.setActiveTab('guru')"
          :class="[
            'flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            uiStore.activeTab === 'guru'
              ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          ]"
        >
          <Users class="h-4 w-4" />
          <span>Guru & Izin</span>
        </button>

        <button
          @click="uiStore.setActiveTab('kelas')"
          :class="[
            'flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            uiStore.activeTab === 'kelas'
              ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          ]"
        >
          <GraduationCap class="h-4 w-4" />
          <span>Kelas</span>
        </button>

        <button
          @click="uiStore.setActiveTab('pengaturan')"
          :class="[
            'flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            uiStore.activeTab === 'pengaturan'
              ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          ]"
        >
          <Settings class="h-4 w-4" />
          <span>Pengaturan</span>
        </button>
      </nav>

      <!-- Aksi Berkas & Notifikasi -->
      <div class="flex items-center space-x-2">
        <button
          @click="uiStore.setWizardOpen(true)"
          class="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Setup Proyek Baru"
        >
          <Sparkles class="h-3.5 w-3.5 text-emerald-500" />
          <span>Setup</span>
        </button>

        <button
          @click="handleOpenFile"
          class="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Buka Berkas Jadwal (.jadwal)"
        >
          <FolderOpen class="h-3.5 w-3.5" />
          <span>Buka</span>
        </button>

        <button
          @click="handleSaveFile"
          :class="[
            'flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all shadow-md',
            store.dirty
              ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/40'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          ]"
          title="Simpan Jadwal (Ctrl+S)"
        >
          <Save class="h-3.5 w-3.5" />
          <span>Simpan</span>
        </button>

        <div class="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        <button
          @click="handleExportExcel"
          class="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Ekspor format Microsoft Excel (.xlsx)"
        >
          <FileSpreadsheet class="h-3.5 w-3.5 text-emerald-500" />
          <span>Excel</span>
        </button>

        <button
          @click="handlePrintPdf"
          class="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Cetak Dokumen Resmi PDF"
        >
          <Printer class="h-3.5 w-3.5 text-indigo-500" />
          <span>Cetak PDF</span>
        </button>

        <!-- Tombol Switch Tema Dark / Light -->
        <button
          @click="uiStore.toggleTheme"
          class="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          :title="uiStore.theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'"
        >
          <Sun v-if="uiStore.theme === 'dark'" class="h-4 w-4 text-amber-400" />
          <Moon v-else class="h-4 w-4 text-indigo-500" />
        </button>
      </div>
    </header>

    <!-- Notifikasi Baris Aksi -->
    <div
      v-if="exportStatusMessage"
      class="bg-emerald-600 px-4 py-1 text-center text-xs font-semibold text-white animate-in slide-in-from-top duration-150"
    >
      {{ exportStatusMessage }}
    </div>

    <!-- Main Workspace Workspace -->
    <main class="flex flex-1 overflow-hidden">
      <!-- Tab 1: Kisi Jadwal & Panel Samping Masalah -->
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

    <!-- Modal Wizard Onboarding Setup Sekolah Baru -->
    <SchoolSetupWizard
      v-model="uiStore.isWizardOpen"
      @completed="uiStore.setActiveTab('jadwal')"
    />
  </div>
</template>
