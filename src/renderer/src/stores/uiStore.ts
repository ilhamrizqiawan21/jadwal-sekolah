import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'dark' | 'light'
export type ActiveTab = 'jadwal' | 'beban' | 'guru' | 'kelas' | 'pengaturan'
export type SidebarTab = 'issues' | 'codes'
export type AutoSaveStatus = 'clean' | 'dirty' | 'saving' | 'error'

export interface SelectedCell {
  hari: string
  slotId: string
  kelasId: string
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<ThemeMode>('dark')
  const activeTab = ref<ActiveTab>('jadwal')
  const selectedCell = ref<SelectedCell | null>(null)
  const highlightedGuruId = ref<string | null>(null)
  const searchQuery = ref<string>('')
  const sidebarTab = ref<SidebarTab>('issues')
  const isWizardOpen = ref<boolean>(false)
  const autoSaveStatus = ref<AutoSaveStatus>('clean')

  function setTheme(mode: ThemeMode): void {
    theme.value = mode
    if (typeof document !== 'undefined') {
      if (mode === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
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
    setTheme,
    toggleTheme,
    setActiveTab,
    setSelectedCell,
    setHighlightedGuru,
    setSearchQuery,
    setSidebarTab,
    setWizardOpen,
    setAutoSaveStatus
  }
})
