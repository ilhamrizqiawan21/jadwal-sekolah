import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'dark' | 'light'
export type ActiveTab = 'jadwal' | 'beban' | 'guru' | 'kelas' | 'cadangan' | 'pengaturan'
export type SidebarTab = 'issues' | 'codes'
export type AutoSaveStatus = 'clean' | 'dirty' | 'saving' | 'error'

export interface SelectedCell {
  hari: string
  slotId: string
  kelasId: string
}

function bacaPref(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
  } catch {
    return null
  }
}

function tulisPref(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
  } catch {
    // penyimpanan lokal tidak tersedia; preferensi tidak dipertahankan
  }
}

function getInitialTheme(): ThemeMode {
  const saved = bacaPref('js_theme')
  if (saved === 'dark' || saved === 'light') return saved
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
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
  const isMobileNavOpen = ref<boolean>(false)
  const autoSaveEnabled = ref<boolean>(bacaPref('js_autosave') !== 'off')

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
    tulisPref('js_theme', mode)
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', mode === 'dark')
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
    isMobileNavOpen.value = false
  }

  function setMobileNavOpen(open: boolean): void {
    isMobileNavOpen.value = open
  }

  function setAutoSaveEnabled(enabled: boolean): void {
    autoSaveEnabled.value = enabled
    tulisPref('js_autosave', enabled ? 'on' : 'off')
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
    isMobileNavOpen,
    autoSaveEnabled,
    setMobileNavOpen,
    setAutoSaveEnabled,
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
    toggleGridDensity
  }
})
