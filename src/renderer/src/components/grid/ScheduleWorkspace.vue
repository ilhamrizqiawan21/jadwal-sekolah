<script setup lang="ts">
import { computed } from 'vue'
import { useWindowSize } from '@vueuse/core'
import ScheduleGridView from './ScheduleGridView.vue'
import IssueSidebar from '../sidebar/IssueSidebar.vue'
import { useUiStore } from '../../stores/uiStore'

defineOptions({ name: 'ScheduleWorkspace' })

const ui = useUiStore()
const { width } = useWindowSize()
const overlay = computed(() => width.value < 1100)
</script>

<template>
  <div class="relative flex h-full w-full overflow-hidden">
    <div class="min-w-0 flex-1 overflow-hidden">
      <ScheduleGridView />
    </div>
    <Transition name="page">
      <IssueSidebar
        v-if="ui.isRightSidebarOpen"
        :class="overlay ? 'absolute inset-y-0 right-0 z-30 shadow-float' : 'shrink-0'"
      />
    </Transition>
  </div>
</template>
