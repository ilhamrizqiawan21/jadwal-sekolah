import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'dark' | 'light'
export type ActiveTab = 'jadwal' | 'beban' | 'guru' | 'kelas' | 'sesi' | 'pengaturan'
export type SidebarTab = 'issues' | 'codes'
export type AutoSaveStatus = 'clean' | 'dirty' | 'saving' | 'error'

export interface SelectedCell {
  hari: string
  slotId: string
  kelasId: string
}

export type DialogVariant = 'info' | 'warning' | 'danger'

export interface AppDialogState {
  isOpen: boolean
  mode: 'alert' | 'confirm'
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  variant: DialogVariant
}

export interface ConfirmDialogOptions {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: DialogVariant
}

function getInitialTheme(): ThemeMode {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('js_theme')
    if (saved === 'dark' || saved === 'light') return saved
  }
  return 'dark'
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<ThemeMode>(getInitialTheme())
  const activeTab = ref<ActiveTab>('jadwal')
  const selectedCell = ref<SelectedCell | null>(null)
  const highlightedGuruId = ref<string | null>(null)
  const searchQuery = ref<string>('')
  const sidebarTab = ref<SidebarTab>('issues')
  const isWizardOpen = ref<boolean>(false)
  const autoSaveStatus = ref<AutoSaveStatus>('clean')
  const isLeftSidebarCollapsed = ref<boolean>(false)
  const isRightSidebarOpen = ref<boolean>(true)
  const selectedHariFilter = ref<string>('all')
  const gridDensity = ref<'compact' | 'large'>('compact')
  const dialog = ref<AppDialogState>({
    isOpen: false,
    mode: 'alert',
    title: '',
    message: '',
    confirmLabel: 'Ya, Lanjutkan',
    cancelLabel: 'Batal',
    variant: 'info'
  })
  let dialogResolver: ((result: boolean) => void) | null = null

  function resolveDialog(result: boolean): void {
    dialog.value.isOpen = false
    const resolver = dialogResolver
    dialogResolver = null
    resolver?.(result)
  }

  function showAlert(
    message: string,
    title = 'Informasi',
    variant: DialogVariant = 'warning'
  ): Promise<boolean> {
    if (dialogResolver) dialogResolver(false)
    dialog.value = {
      isOpen: true,
      mode: 'alert',
      title,
      message,
      confirmLabel: 'Mengerti',
      cancelLabel: 'Tutup',
      variant
    }
    return new Promise<boolean>((resolve) => {
      dialogResolver = resolve
    })
  }

  function showConfirm(
    message: string,
    options: ConfirmDialogOptions = {}
  ): Promise<boolean> {
    if (dialogResolver) dialogResolver(false)
    dialog.value = {
      isOpen: true,
      mode: 'confirm',
      title: options.title || 'Konfirmasi',
      message,
      confirmLabel: options.confirmLabel || 'Ya, Lanjutkan',
      cancelLabel: options.cancelLabel || 'Batal',
      variant: options.variant || 'warning'
    }
    return new Promise<boolean>((resolve) => {
      dialogResolver = resolve
    })
  }

  function toggleLeftSidebar(): void {
    isLeftSidebarCollapsed.value = !isLeftSidebarCollapsed.value
  }

  function setLeftSidebarCollapsed(collapsed: boolean): void {
    isLeftSidebarCollapsed.value = collapsed
  }

  function toggleRightSidebar(): void {
    isRightSidebarOpen.value = !isRightSidebarOpen.value
  }

  function setRightSidebarOpen(open: boolean): void {
    isRightSidebarOpen.value = open
  }

  function setSelectedHariFilter(hari: string): void {
    selectedHariFilter.value = hari
  }

  function setGridDensity(density: 'compact' | 'large'): void {
    gridDensity.value = density
  }

  function toggleGridDensity(): void {
    gridDensity.value = gridDensity.value === 'compact' ? 'large' : 'compact'
  }

  function setTheme(mode: ThemeMode): void {
    theme.value = mode
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('js_theme', mode)
    }
    if (typeof document !== 'undefined') {
      if (mode === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  function initTheme(): void {
    setTheme(theme.value)
  }

  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function setActiveTab(tab: ActiveTab): void {
    activeTab.value = tab
  }

  function setSelectedCell(cell: SelectedCell | null): void {
    selectedCell.value = cell
  }

  function setHighlightedGuru(guruId: string | null): void {
    highlightedGuruId.value = guruId
  }

  function setSearchQuery(q: string): void {
    searchQuery.value = q
  }

  function setSidebarTab(tab: SidebarTab): void {
    sidebarTab.value = tab
  }

  function setWizardOpen(open: boolean): void {
    isWizardOpen.value = open
  }

  function setAutoSaveStatus(status: AutoSaveStatus): void {
    autoSaveStatus.value = status
  }

  return {
    theme,
    activeTab,
    selectedCell,
    highlightedGuruId,
    searchQuery,
    sidebarTab,
    isWizardOpen,
    autoSaveStatus,
    isLeftSidebarCollapsed,
    isRightSidebarOpen,
    selectedHariFilter,
    gridDensity,
    dialog,
    setTheme,
    initTheme,
    toggleTheme,
    setActiveTab,
    setSelectedCell,
    setHighlightedGuru,
    setSearchQuery,
    setSidebarTab,
    setWizardOpen,
    setAutoSaveStatus,
    toggleLeftSidebar,
    setLeftSidebarCollapsed,
    toggleRightSidebar,
    setRightSidebarOpen,
    setSelectedHariFilter,
    setGridDensity,
    toggleGridDensity,
    showAlert,
    showConfirm,
    resolveDialog
  }
})
