<script setup lang="ts">
import { watch, nextTick, ref } from 'vue'
import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-vue-next'
import { useUiStore } from '../../stores/uiStore'

const uiStore = useUiStore()
const confirmBtnRef = ref<HTMLButtonElement | null>(null)

watch(
  () => uiStore.dialog.isOpen,
  async (open) => {
    if (open) {
      await nextTick()
      confirmBtnRef.value?.focus()
    }
  }
)

function handleCancel(): void {
  uiStore.resolveDialog(false)
}

function handleConfirm(): void {
  uiStore.resolveDialog(true)
}
</script>

<template>
  <div
    v-if="uiStore.dialog.isOpen"
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="app-dialog-title"
    aria-describedby="app-dialog-desc"
    @keydown.esc.stop="handleCancel"
  >
    <div
      class="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/70">
        <div class="flex items-center gap-2.5">
          <div
            :class="[
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
              uiStore.dialog.variant === 'danger'
                ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-400'
                : uiStore.dialog.variant === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400'
                : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400'
            ]"
          >
            <ShieldAlert v-if="uiStore.dialog.variant === 'danger'" class="h-4.5 w-4.5" />
            <AlertTriangle v-else-if="uiStore.dialog.variant === 'warning'" class="h-4.5 w-4.5" />
            <Info v-else class="h-4.5 w-4.5" />
          </div>
          <h3 id="app-dialog-title" class="text-sm font-bold text-slate-900 dark:text-slate-100">
            {{ uiStore.dialog.title }}
          </h3>
        </div>
        <button
          type="button"
          @click="handleCancel"
          class="rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          aria-label="Tutup dialog"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="px-5 py-4">
        <p id="app-dialog-desc" class="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
          {{ uiStore.dialog.message }}
        </p>
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
        <button
          v-if="uiStore.dialog.mode === 'confirm'"
          type="button"
          @click="handleCancel"
          class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          {{ uiStore.dialog.cancelLabel }}
        </button>
        <button
          ref="confirmBtnRef"
          type="button"
          @click="handleConfirm"
          :class="[
            'rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors shadow-xs',
            uiStore.dialog.variant === 'danger'
              ? 'bg-rose-600 hover:bg-rose-500'
              : 'bg-emerald-600 hover:bg-emerald-500'
          ]"
        >
          {{ uiStore.dialog.confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
