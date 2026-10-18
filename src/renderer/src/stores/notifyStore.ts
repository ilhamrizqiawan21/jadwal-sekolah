import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastKind = 'success' | 'error' | 'info' | 'warn'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  detail?: string
}

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Pilihan ketiga, misalnya "Buang perubahan". Hasilnya 'alt'. */
  altLabel?: string
  danger?: boolean
}

export type ConfirmResult = 'confirm' | 'alt' | 'cancel'

interface ConfirmState extends ConfirmOptions {
  resolve: (r: ConfirmResult) => void
}

let nextId = 1

export const useNotifyStore = defineStore('notify', () => {
  const toasts = ref<ToastItem[]>([])
  const confirmState = ref<ConfirmState | null>(null)

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function push(kind: ToastKind, message: string, detail?: string, durationMs?: number): number {
    const id = nextId++
    toasts.value = [...toasts.value.slice(-3), { id, kind, message, detail }]
    const ttl = durationMs ?? (kind === 'error' ? 7000 : 3200)
    if (ttl > 0) setTimeout(() => dismiss(id), ttl)
    return id
  }

  const success = (m: string, d?: string): number => push('success', m, d)
  const info = (m: string, d?: string): number => push('info', m, d)
  const warn = (m: string, d?: string): number => push('warn', m, d, 5000)
  const error = (m: string, d?: string): number => push('error', m, d)

  function ask(options: ConfirmOptions): Promise<ConfirmResult> {
    // Hanya satu dialog pada satu waktu; yang lama dianggap dibatalkan.
    confirmState.value?.resolve('cancel')
    return new Promise((resolve) => {
      confirmState.value = { ...options, resolve }
    })
  }

  async function confirm(options: ConfirmOptions): Promise<boolean> {
    return (await ask(options)) === 'confirm'
  }

  function answer(result: ConfirmResult): void {
    const state = confirmState.value
    confirmState.value = null
    state?.resolve(result)
  }

  return { toasts, confirmState, dismiss, success, info, warn, error, ask, confirm, answer }
})

export function pesanGalat(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  // Electron membungkus galat IPC dengan awalan teknis yang tidak berguna bagi pengguna.
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}
