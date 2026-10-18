<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import { useNotifyStore } from '../../stores/notifyStore'

const notify = useNotifyStore()
const state = computed(() => notify.confirmState)
const open = computed({
  get: () => state.value !== null,
  set: (v: boolean) => {
    if (!v) notify.answer('cancel')
  }
})
</script>

<template>
  <BaseModal
    v-model="open"
    :title="state?.title ?? ''"
    size="sm"
    role="alertdialog"
  >
    <div class="flex gap-3">
      <div
        v-if="state?.danger"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-conflict-100 text-conflict-600 dark:bg-conflict-500/15 dark:text-conflict-400"
      >
        <AlertTriangle class="h-4 w-4" />
      </div>
      <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{{ state?.message }}</p>
    </div>

    <template #footer>
      <button class="btn btn-ghost" @click="notify.answer('cancel')">
        {{ state?.cancelLabel ?? 'Batal' }}
      </button>
      <button v-if="state?.altLabel" class="btn btn-secondary" @click="notify.answer('alt')">
        {{ state.altLabel }}
      </button>
      <button
        data-autofocus
        :class="['btn', state?.danger ? 'btn-danger' : 'btn-primary']"
        @click="notify.answer('confirm')"
      >
        {{ state?.confirmLabel ?? 'Ya, Lanjutkan' }}
      </button>
    </template>
  </BaseModal>
</template>
