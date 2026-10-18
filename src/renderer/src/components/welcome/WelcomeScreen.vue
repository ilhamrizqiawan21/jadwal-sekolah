<script setup lang="ts">
import { FileText, CalendarDays, FolderOpen, FlaskConical, Wand2, WifiOff, ShieldCheck, History } from 'lucide-vue-next'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useUiStore } from '../../stores/uiStore'
import { useProjectFile } from '../../composables/useProjectFile'

const store = useScheduleStore()
const ui = useUiStore()
const files = useProjectFile()

function loadSample(): void {
  store.loadSampleProject()
  ui.setActiveTab('jadwal')
}

const highlights = [
  { icon: WifiOff, title: 'Sepenuhnya offline', text: 'Data tersimpan di komputer Anda, tanpa akun dan tanpa internet.' },
  { icon: History, title: 'Cadangan otomatis', text: 'Setiap simpan menyisakan versi sebelumnya yang bisa dipulihkan.' },
  { icon: ShieldCheck, title: 'Deteksi bentrok instan', text: 'Guru ganda, jam berhalangan, dan kelebihan JP langsung ditandai.' }
]
</script>

<template>
  <div class="h-full w-full overflow-y-auto">
    <div class="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-10">
      <div class="animate-rise">
        <div
          class="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500 text-white shadow-soft"
        >
          <CalendarDays class="h-7 w-7" />
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
          Susun jadwal pelajaran tanpa bentrok
        </h1>
        <p class="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Mulai dari nol dengan panduan singkat, lanjutkan berkas yang sudah ada, atau lihat cara kerja aplikasi
          dengan data contoh.
        </p>
      </div>

      <div class="mt-8 grid gap-3 sm:grid-cols-3">
        <button
          class="card group animate-rise p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-500/60"
          style="animation-delay: 40ms"
          @click="ui.setWizardOpen(true)"
        >
          <Wand2 class="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <div class="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Mulai sekolah baru</div>
          <p class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Isi profil, pilih pola hari dan struktur jam dalam empat langkah.
          </p>
        </button>

        <button
          class="card group animate-rise p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-500/60"
          style="animation-delay: 90ms"
          @click="files.openProject()"
        >
          <FolderOpen class="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <div class="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Buka berkas jadwal</div>
          <p class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Lanjutkan berkas .jadwal yang pernah Anda simpan.
          </p>
        </button>

        <button
          class="card group animate-rise p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-500/60"
          style="animation-delay: 140ms"
          @click="loadSample"
        >
          <FlaskConical class="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <div class="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Coba data contoh</div>
          <p class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Jadwal fiktif enam kelas untuk mencoba semua fitur.
          </p>
        </button>
      </div>

      <section v-if="files.recent.value.length > 0" class="mt-8 animate-rise" style="animation-delay: 180ms">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Terakhir dibuka</h2>
          <button class="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" @click="files.clearRecent()">
            Bersihkan daftar
          </button>
        </div>
        <ul class="card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
          <li v-for="r in files.recent.value" :key="r.filePath">
            <button class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50" @click="files.openRecent(r.filePath)">
              <FileText class="h-4 w-4 shrink-0 text-slate-400" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{{ r.name }}</span>
                <span class="block truncate text-[11px] text-slate-500 dark:text-slate-400">{{ r.filePath }}</span>
              </span>
            </button>
          </li>
        </ul>
      </section>

      <ul class="mt-10 grid gap-5 sm:grid-cols-3">
        <li v-for="h in highlights" :key="h.title" class="flex gap-3">
          <component :is="h.icon" class="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <div class="text-xs font-semibold text-slate-700 dark:text-slate-200">{{ h.title }}</div>
            <p class="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{{ h.text }}</p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
