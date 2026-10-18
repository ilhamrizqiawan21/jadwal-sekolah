<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, type Component } from 'vue'
import { useWindowSize } from '@vueuse/core'
import {
  CalendarDays,
  Users,
  Layers,
  GraduationCap,
  Settings,
  Printer,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  FolderOpen,
  Save,
  Menu,
  X,
  DatabaseBackup,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-vue-next'
import { useScheduleStore } from './stores/scheduleStore'
import { useUiStore, ActiveTab } from './stores/uiStore'
import { useProjectFile } from './composables/useProjectFile'

import SchoolSetupWizard from './components/wizard/SchoolSetupWizard.vue'
import ScheduleWorkspace from './components/grid/ScheduleWorkspace.vue'
import GuruTab from './components/master/GuruTab.vue'
import KelasTab from './components/master/KelasTab.vue'
import BebanTab from './components/master/BebanTab.vue'
import PengaturanTab from './components/master/PengaturanTab.vue'
import BackupTab from './components/backup/BackupTab.vue'
import WelcomeScreen from './components/welcome/WelcomeScreen.vue'
import ExportPreviewModal from './components/export/ExportPreviewModal.vue'
import AppBreadcrumb, { type Crumb } from './components/ui/AppBreadcrumb.vue'
import ToastHost from './components/ui/ToastHost.vue'
import ConfirmDialog from './components/ui/ConfirmDialog.vue'

const store = useScheduleStore()
const ui = useUiStore()
const files = useProjectFile()
const { width } = useWindowSize()

const isExportPreviewOpen = ref(false)
const previewInitialTab = ref<'jadwal' | 'beban'>('jadwal')

const isMobile = computed(() => width.value < 768)
const isCompact = computed(() => width.value < 1100)
const showRail = computed(() => !isMobile.value && ui.isLeftSidebarCollapsed)

interface NavItem {
  id: ActiveTab
  label: string
  icon: Component
  group: string
}

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Jadwal',
    items: [{ id: 'jadwal', label: 'Jadwal KBM', icon: CalendarDays, group: 'Jadwal' }]
  },
  {
    label: 'Data Master',
    items: [
      { id: 'beban', label: 'Beban Mengajar', icon: Layers, group: 'Data Master' },
      { id: 'guru', label: 'Guru dan Izin', icon: Users, group: 'Data Master' },
      { id: 'kelas', label: 'Data Kelas', icon: GraduationCap, group: 'Data Master' }
    ]
  },
  {
    label: 'Berkas',
    items: [
      { id: 'cadangan', label: 'Cadangan', icon: DatabaseBackup, group: 'Berkas' },
      { id: 'pengaturan', label: 'Pengaturan', icon: Settings, group: 'Berkas' }
    ]
  }
]
const allNav = navGroups.flatMap((g) => g.items)

const currentNav = computed(() => allNav.find((n) => n.id === ui.activeTab) ?? allNav[0])

const crumbs = computed<Crumb[]>(() => {
  const nav = currentNav.value
  const list: Crumb[] = [
    {
      label: store.proyek.meta.nama_sekolah || 'Jadwal Sekolah',
      onClick: () => ui.setActiveTab('jadwal')
    }
  ]
  if (store.isPristine) return list
  const group = navGroups.find((g) => g.label === nav.group)
  list.push({ label: nav.group, onClick: () => group && ui.setActiveTab(group.items[0].id) })
  list.push({ label: nav.label })
  if (nav.id === 'jadwal' && ui.selectedHariFilter !== 'all') {
    list[list.length - 1].onClick = () => ui.setSelectedHariFilter('all')
    list.push({ label: ui.selectedHariFilter })
  }
  return list
})

const views: Record<ActiveTab, Component> = {
  jadwal: ScheduleWorkspace,
  beban: BebanTab,
  guru: GuruTab,
  kelas: KelasTab,
  cadangan: BackupTab,
  pengaturan: PengaturanTab
}
const activeView = computed(() => views[ui.activeTab])

const saveState = computed(() => {
  if (files.isSaving.value) return 'saving'
  if (files.saveError.value) return 'error'
  if (store.dirty) return 'dirty'
  return 'clean'
})

watch(saveState, (s) => ui.setAutoSaveStatus(s))

// Judul jendela mengikuti nama berkas dan status simpan
watch(
  () => [store.filePath, store.dirty] as const,
  ([path, dirty]) => {
    const nama = path ? path.split(/[\\/]/).pop() : 'Proyek baru'
    document.title = `${dirty ? '* ' : ''}${nama} - Jadwal Sekolah`
  },
  { immediate: true }
)

const jamTersimpan = computed(() =>
  files.lastSavedAt.value
    ? files.lastSavedAt.value.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null
)

function openExportPreview(tab: 'jadwal' | 'beban' = 'jadwal'): void {
  previewInitialTab.value = tab
  isExportPreviewOpen.value = true
}

function handleGlobalKeyDown(e: KeyboardEvent): void {
  const mod = e.ctrlKey || e.metaKey
  if (!mod) return
  const key = e.key.toLowerCase()

  if (key === 's') {
    e.preventDefault()
    void (e.shiftKey ? files.saveProjectAs() : files.saveProject())
  } else if (key === 'o' && !e.shiftKey) {
    e.preventDefault()
    void files.openProject()
  } else if (key === 'e' && !e.shiftKey) {
    e.preventDefault()
    openExportPreview()
  } else if (key === 'b' && !e.shiftKey) {
    e.preventDefault()
    isMobile.value ? ui.setMobileNavOpen(!ui.isMobileNavOpen) : ui.toggleLeftSidebar()
  } else if (key === 'i' && !e.shiftKey && ui.activeTab === 'jadwal') {
    e.preventDefault()
    ui.toggleRightSidebar()
  }
}

// Menyesuaikan tata letak otomatis hanya saat jendela melintasi batas, bukan setiap piksel.
watch(
  isCompact,
  (compact) => {
    if (compact) {
      ui.setLeftSidebarCollapsed(true)
      ui.setRightSidebarOpen(false)
    }
  },
  { immediate: true }
)
watch(isMobile, (m) => {
  if (!m) ui.setMobileNavOpen(false)
})

onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKeyDown)
  files.startAutosave()
  await files.openPending()
  await files.offerRecovery()
  await files.refreshRecent()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown)
  files.stopAutosave()
})
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <!-- Latar gelap untuk laci navigasi pada layar sempit -->
    <Transition name="modal">
      <div
        v-if="isMobile && ui.isMobileNavOpen"
        class="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm"
        @click="ui.setMobileNavOpen(false)"
      />
    </Transition>

    <!-- Navigasi -->
    <aside
      :class="[
        'z-40 flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-200 ease-out dark:border-slate-800 dark:bg-slate-900',
        isMobile
          ? ['fixed inset-y-0 left-0 w-64', ui.isMobileNavOpen ? 'translate-x-0 shadow-float' : '-translate-x-full']
          : showRail
            ? 'w-[68px]'
            : 'w-64'
      ]"
      :aria-hidden="isMobile && !ui.isMobileNavOpen"
      aria-label="Menu utama"
    >
      <div class="flex h-14 shrink-0 items-center gap-2.5 border-b border-slate-200 px-3.5 dark:border-slate-800">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 text-white shadow-sm"
        >
          <CalendarDays class="h-[18px] w-[18px]" />
        </div>
        <div v-if="!showRail" class="min-w-0 flex-1">
          <div class="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100" :title="store.proyek.meta.nama_sekolah">
            {{ store.proyek.meta.nama_sekolah || 'Jadwal Sekolah' }}
          </div>
          <div class="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {{ store.proyek.meta.tahun_pelajaran || 'Tahun pelajaran' }} &middot; Sem. {{ store.proyek.meta.semester }}
          </div>
        </div>
        <button v-if="isMobile" class="btn-icon shrink-0" aria-label="Tutup menu" @click="ui.setMobileNavOpen(false)">
          <X class="h-4 w-4" />
        </button>
      </div>

      <nav class="flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-2.5">
        <div v-for="group in navGroups" :key="group.label">
          <div
            v-if="!showRail"
            class="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500"
          >
            {{ group.label }}
          </div>
          <div v-else class="mx-auto mb-2 h-px w-6 bg-slate-200 first:hidden dark:bg-slate-800" />
          <div class="space-y-0.5">
            <button
              v-for="item in group.items"
              :key="item.id"
              :class="[
                'group relative flex w-full items-center rounded-xl text-[13px] font-medium transition-colors',
                showRail ? 'mx-auto h-11 w-11 justify-center' : 'gap-3 px-3 py-2.5',
                ui.activeTab === item.id
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
              ]"
              :title="showRail ? item.label : undefined"
              :aria-current="ui.activeTab === item.id ? 'page' : undefined"
              @click="ui.setActiveTab(item.id)"
            >
              <span
                v-if="ui.activeTab === item.id && !showRail"
                class="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand-600 dark:bg-brand-400"
              />
              <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" />
              <span v-if="!showRail" class="truncate">{{ item.label }}</span>
            </button>
          </div>
        </div>

        <div>
          <div
            v-if="!showRail"
            class="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500"
          >
            Keluaran
          </div>
          <div v-else class="mx-auto mb-2 h-px w-6 bg-slate-200 dark:bg-slate-800" />
          <button
            :class="[
              'flex w-full items-center rounded-xl text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100',
              showRail ? 'mx-auto h-11 w-11 justify-center' : 'gap-3 px-3 py-2.5'
            ]"
            :title="showRail ? 'Cetak dan Ekspor (Ctrl+E)' : undefined"
            @click="openExportPreview('jadwal')"
          >
            <Printer class="h-[18px] w-[18px] shrink-0" />
            <span v-if="!showRail" class="flex-1 truncate text-left">Cetak dan Ekspor</span>
            <span v-if="!showRail" class="kbd">Ctrl E</span>
          </button>
        </div>
      </nav>

      <div class="shrink-0 space-y-1 border-t border-slate-200 p-2.5 dark:border-slate-800">
        <button
          :class="[
            'flex w-full items-center rounded-xl text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100',
            showRail ? 'mx-auto h-11 w-11 justify-center' : 'gap-3 px-3 py-2.5'
          ]"
          :title="ui.theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'"
          @click="ui.toggleTheme"
        >
          <Sun v-if="ui.theme === 'dark'" class="h-[18px] w-[18px] shrink-0" />
          <Moon v-else class="h-[18px] w-[18px] shrink-0" />
          <span v-if="!showRail" class="truncate">{{ ui.theme === 'dark' ? 'Mode terang' : 'Mode gelap' }}</span>
        </button>
        <button
          v-if="!isMobile"
          :class="[
            'flex w-full items-center rounded-xl text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100',
            showRail ? 'mx-auto h-11 w-11 justify-center' : 'gap-3 px-3 py-2.5'
          ]"
          :title="showRail ? 'Lebarkan menu (Ctrl+B)' : 'Ciutkan menu (Ctrl+B)'"
          @click="ui.toggleLeftSidebar"
        >
          <PanelLeftOpen v-if="showRail" class="h-[18px] w-[18px] shrink-0" />
          <PanelLeftClose v-else class="h-[18px] w-[18px] shrink-0" />
          <span v-if="!showRail" class="truncate">Ciutkan menu</span>
        </button>
      </div>
    </aside>

    <!-- Area kerja -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/80 px-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-4"
      >
        <button v-if="isMobile" class="btn-icon shrink-0" aria-label="Buka menu" @click="ui.setMobileNavOpen(true)">
          <Menu class="h-5 w-5" />
        </button>

        <AppBreadcrumb :items="crumbs" class="min-w-0 flex-1" />

        <button
          :class="[
            'chip shrink-0 cursor-pointer transition',
            saveState === 'error'
              ? 'bg-conflict-50 text-conflict-700 hover:bg-conflict-100 dark:bg-conflict-500/15 dark:text-conflict-300'
              : saveState === 'dirty'
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          ]"
          :title="files.saveError.value ?? (store.filePath ? 'Klik untuk menyimpan sekarang (Ctrl+S)' : 'Belum disimpan ke berkas')"
          @click="files.saveProject()"
        >
          <Loader2 v-if="saveState === 'saving'" class="h-3 w-3 animate-spin" />
          <AlertCircle v-else-if="saveState === 'error'" class="h-3 w-3" />
          <span v-else-if="saveState === 'dirty'" class="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <Check v-else class="h-3 w-3" />
          <span v-if="!isMobile">
            {{
              saveState === 'saving'
                ? 'Menyimpan...'
                : saveState === 'error'
                  ? 'Gagal menyimpan'
                  : saveState === 'dirty'
                    ? 'Belum disimpan'
                    : jamTersimpan
                      ? `Tersimpan ${jamTersimpan}`
                      : store.filePath
                        ? 'Tersimpan'
                        : 'Proyek baru'
            }}
          </span>
        </button>

        <div class="hidden h-5 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

        <button class="btn btn-secondary hidden sm:inline-flex" title="Buka berkas (Ctrl+O)" @click="files.openProject()">
          <FolderOpen class="h-3.5 w-3.5" />
          <span class="hidden lg:inline">Buka</span>
        </button>
        <button class="btn btn-primary" title="Simpan (Ctrl+S)" @click="files.saveProject()">
          <Save class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">Simpan</span>
        </button>
      </header>

      <main class="relative min-h-0 flex-1 overflow-hidden">
        <WelcomeScreen v-if="store.isPristine && !ui.isWizardOpen" />

        <Transition v-else name="page" mode="out-in">
          <KeepAlive include="ScheduleWorkspace">
            <component :is="activeView" :key="ui.activeTab" />
          </KeepAlive>
        </Transition>
      </main>
    </div>

    <SchoolSetupWizard v-model="ui.isWizardOpen" @completed="ui.setActiveTab('jadwal')" />

    <ExportPreviewModal
      v-model="isExportPreviewOpen"
      :initial-tab="previewInitialTab"
      @export-pdf="files.exportFile('pdf')"
      @export-excel="files.exportFile('xlsx')"
    />

    <ConfirmDialog />
    <ToastHost />
  </div>
</template>
