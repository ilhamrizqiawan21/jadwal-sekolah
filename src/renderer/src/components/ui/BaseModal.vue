<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    persistent?: boolean
    role?: 'dialog' | 'alertdialog'
  }>(),
  { size: 'md', persistent: false, role: 'dialog' }
)

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const panel = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null
const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`

const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }

function close(): void {
  emit('update:modelValue', false)
}

function focusables(): HTMLElement[] {
  if (!panel.value) return []
  return Array.from(
    panel.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  )
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && !props.persistent) {
    e.stopPropagation()
    close()
    return
  }
  if (e.key === 'Tab') {
    const items = focusables()
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null
      await nextTick()
      const target =
        panel.value?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? panel.value
      target?.focus()
    } else {
      previouslyFocused?.focus?.()
      previouslyFocused = null
    }
  }
)

onBeforeUnmount(() => previouslyFocused?.focus?.())
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
        @mousedown.self="!persistent && close()"
        @keydown="onKeydown"
      >
        <div
          ref="panel"
          :role="role"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          :class="[
            'modal-panel flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-float outline-none dark:border-slate-800 dark:bg-slate-900',
            widths[size]
          ]"
        >
          <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div class="min-w-0">
              <h2 :id="titleId" class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ title }}</h2>
              <p v-if="description" class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ description }}</p>
            </div>
            <button v-if="!persistent" class="btn-icon -mr-2 -mt-1 shrink-0" aria-label="Tutup" @click="close">
              <X class="h-4 w-4" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-950/40"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
