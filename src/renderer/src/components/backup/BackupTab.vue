<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import {
  History,
  DatabaseBackup,
  FolderOpen,
  FileUp,
  RotateCcw,
  Trash2,
  Save,
  Bookmark,
  ShieldCheck,
  Loader2
} from 'lucide-vue-next'
import { useScheduleStore } from '../../stores/scheduleStore'
import { useUiStore } from '../../stores/uiStore'
import { useProjectFile } from '../../composables/useProjectFile'

const store = useScheduleStore()
const ui = useUiStore()
const files = useProjectFile()

const hasFile = computed(() => Boolean(store.filePath))
const fileName = computed(() => store.filePath?.split(/[\\/]/).pop() ?? '')

onMounted(() => void files.refreshBackups())
watch(() => store.filePath, () => void files.refreshBackups())

const tanggal = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
const relatif = new Intl.RelativeTimeFormat('id', { numeric: 'auto' })

function waktuRelatif(iso: string): string {
  const selisihMenit = Math.round((new Date(iso).getTime() - Date.now()) / 60000)
  const abs = Math.abs(selisihMenit)
  if (abs < 60) return relatif.format(selisihMenit, 'minute')
  if (abs < 60 * 24) return relatif.format(Math.round(selisihMenit / 60), 'hour')
  return relatif.format(Math.round(selisihMenit / (60 * 24)), 'day')
}

function ukuran(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const jumlahOtomatis = computed(() => files.backups.value.filter((b) => !b.manual).length)
const jumlahManual = computed(() => files.backups.value.filter((b) => b.manual).length)
</script>

<template>
  <div class="h-full w-full overflow-y-auto">
    <div class="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <header class="animate-rise">
        <h1 class="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">Cadangan dan Pemulihan</h1>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Setiap kali Anda menyimpan, versi sebelumnya disalin ke folder <span class="kbd">cadangan</span> di samping
          berkas jadwal. Simpan otomatis membuat cadangan paling sering sekali per 10 menit.
        </p>
      </header>

      <!-- Status -->
      <section class="card animate-rise p-5" style="animation-delay: 40ms">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex min-w-0 items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
            >
              <ShieldCheck class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {{ hasFile ? fileName : 'Proyek belum disimpan ke berkas' }}
              </div>
              <div class="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400" :title="store.filePath ?? ''">
                {{
                  hasFile
                    ? store.filePath
                    : 'Simpan dulu agar cadangan bergilir bisa dibuat. Sementara itu, draf pemulihan ditulis tiap menit.'
                }}
              </div>
            </div>
          </div>

          <label class="flex cursor-pointer items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            <span class="font-medium">Simpan otomatis tiap 60 detik</span>
            <span class="relative inline-flex">
              <input
                type="checkbox"
                class="peer sr-only"
                :checked="ui.autoSaveEnabled"
                @change="ui.setAutoSaveEnabled(($event.target as HTMLInputElement).checked)"
              />
              <span
                class="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/20 dark:bg-slate-700"
              />
              <span
                class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"
              />
            </span>
          </label>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <button class="btn btn-primary" @click="files.createSnapshotNow()">
            <Bookmark class="h-3.5 w-3.5" />
            Buat cadangan sekarang
          </button>
          <button class="btn btn-secondary" @click="files.restoreFromFile()">
            <FileUp class="h-3.5 w-3.5" />
            Pulihkan dari berkas...
          </button>
          <button class="btn btn-secondary" :disabled="!hasFile" @click="files.revealBackupFolder()">
            <FolderOpen class="h-3.5 w-3.5" />
            Buka folder cadangan
          </button>
          <button class="btn btn-secondary" @click="files.saveProjectAs()">
            <Save class="h-3.5 w-3.5" />
            Simpan salinan baru...
          </button>
        </div>
      </section>

      <!-- Daftar -->
      <section class="card animate-rise overflow-hidden" style="animation-delay: 90ms">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <History class="h-4 w-4 text-slate-400" />
            <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Riwayat cadangan</h2>
          </div>
          <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Loader2 v-if="files.backupsLoading.value" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ jumlahOtomatis }} otomatis</span>
            <span aria-hidden="true">·</span>
            <span>{{ jumlahManual }} manual</span>
          </div>
        </div>

        <div v-if="!hasFile || files.backups.value.length === 0" class="flex flex-col items-center px-6 py-14 text-center">
          <DatabaseBackup class="h-9 w-9 text-slate-300 dark:text-slate-600" />
          <p class="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">Belum ada cadangan</p>
          <p class="mt-1 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {{
              hasFile
                ? 'Cadangan pertama muncul setelah Anda menyimpan untuk kedua kalinya, atau saat menekan Buat cadangan sekarang.'
                : 'Simpan proyek ke berkas terlebih dahulu.'
            }}
          </p>
        </div>

        <div v-else class="max-h-[28rem] overflow-y-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th class="px-5 py-3">Waktu</th>
                <th class="px-3 py-3">Jenis</th>
                <th class="px-3 py-3 text-right">Ukuran</th>
                <th class="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in files.backups.value" :key="b.name">
                <td class="px-5 py-3">
                  <div class="font-medium text-slate-900 dark:text-slate-100">{{ tanggal.format(new Date(b.createdAt)) }}</div>
                  <div class="text-[11px] text-slate-500 dark:text-slate-400">{{ waktuRelatif(b.createdAt) }}</div>
                </td>
                <td class="px-3 py-3">
                  <span
                    :class="[
                      'chip',
                      b.manual
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    ]"
                  >
                    {{ b.manual ? 'Manual' : 'Otomatis' }}
                  </span>
                </td>
                <td class="px-3 py-3 text-right font-mono text-slate-500 dark:text-slate-400">{{ ukuran(b.size) }}</td>
                <td class="px-5 py-3">
                  <div class="flex justify-end gap-1">
                    <button class="btn btn-secondary !px-3 !py-1.5" @click="files.restoreBackup(b)">
                      <RotateCcw class="h-3.5 w-3.5" />
                      Pulihkan
                    </button>
                    <button
                      class="btn-icon hover:!bg-conflict-50 hover:!text-conflict-600 dark:hover:!bg-conflict-500/15"
                      aria-label="Hapus cadangan"
                      title="Hapus cadangan"
                      @click="files.deleteBackup(b)"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
