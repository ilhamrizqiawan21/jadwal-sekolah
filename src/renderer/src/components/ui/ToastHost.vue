<script setup lang="ts">
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-vue-next'
import { useNotifyStore, ToastKind } from '../../stores/notifyStore'

const notify = useNotifyStore()

const style: Record<ToastKind, { icon: unknown; tone: string }> = {
  success: { icon: CheckCircle2, tone: 'text-brand-600 dark:text-brand-400' },
  error: { icon: AlertCircle, tone: 'text-conflict-600 dark:text-conflict-400' },
  info: { icon: Info, tone: 'text-sky-600 dark:text-sky-400' },
  warn: { icon: AlertTriangle, tone: 'text-amber-600 dark:text-amber-400' }
}
</script>

<template>
  <!-- Tidak menerima fokus keyboard agar tidak mengganggu pengetikan di sel jadwal -->
  <div
    class="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    aria-live="polite"
    aria-atomic="false"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in notify.toasts"
        :key="t.id"
        :role="t.kind === 'error' ? 'alert' : 'status'"
        class="pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-float backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
      >
        <component :is="style[t.kind].icon" :class="['mt-0.5 h-4 w-4 shrink-0', style[t.kind].tone]" />
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold text-slate-900 dark:text-slate-100">{{ t.message }}</p>
          <p v-if="t.detail" class="mt-0.5 break-words text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {{ t.detail }}
          </p>
        </div>
        <button
          class="-mr-1 -mt-1 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          tabindex="-1"
          aria-label="Tutup notifikasi"
          @click="notify.dismiss(t.id)"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
