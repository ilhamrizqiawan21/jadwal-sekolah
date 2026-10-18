<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

export interface Crumb {
  label: string
  onClick?: () => void
}

defineProps<{ items: Crumb[] }>()
</script>

<template>
  <nav aria-label="Navigasi lokasi" class="min-w-0">
    <ol class="flex min-w-0 items-center gap-1 text-xs">
      <template v-for="(item, i) in items" :key="i">
        <li v-if="i > 0" aria-hidden="true" class="shrink-0 text-slate-300 dark:text-slate-600">
          <ChevronRight class="h-3.5 w-3.5" />
        </li>
        <li class="min-w-0" :class="i === items.length - 1 ? '' : 'shrink-0 max-w-[10rem]'">
          <button
            v-if="item.onClick && i < items.length - 1"
            class="block max-w-full truncate rounded-md px-1.5 py-1 font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            @click="item.onClick"
          >
            {{ item.label }}
          </button>
          <span
            v-else
            class="block truncate px-1.5 py-1"
            :class="
              i === items.length - 1
                ? 'font-semibold text-slate-900 dark:text-slate-100'
                : 'font-medium text-slate-500 dark:text-slate-400'
            "
            :aria-current="i === items.length - 1 ? 'page' : undefined"
          >
            {{ item.label }}
          </span>
        </li>
      </template>
    </ol>
  </nav>
</template>
