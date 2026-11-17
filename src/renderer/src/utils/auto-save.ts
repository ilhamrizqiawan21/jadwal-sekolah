export type AutoSaveState = 'clean' | 'dirty' | 'saving' | 'error'

export interface AutoSaveOptions {
  intervalMs?: number
  shouldSave: () => boolean
  save: () => Promise<void>
  onStateChange?: (state: AutoSaveState) => void
}

export interface AutoSaveController {
  start: () => void
  stop: () => void
  trigger: () => Promise<boolean>
}

export function createAutoSaveController(options: AutoSaveOptions): AutoSaveController {
  const intervalMs = options.intervalMs ?? 60_000
  let timer: ReturnType<typeof setInterval> | null = null
  let saving = false

  const trigger = async (): Promise<boolean> => {
    if (saving || !options.shouldSave()) return false

    saving = true
    options.onStateChange?.('saving')
    try {
      await options.save()
      options.onStateChange?.('clean')
      return true
    } catch {
      options.onStateChange?.('error')
      return false
    } finally {
      saving = false
    }
  }

  return {
    start: () => {
      if (timer) return
      timer = setInterval(() => {
        void trigger()
      }, intervalMs)
    },
    stop: () => {
      if (timer) clearInterval(timer)
      timer = null
    },
    trigger
  }
}
