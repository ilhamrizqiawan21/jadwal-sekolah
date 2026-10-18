<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  X,
  FileSpreadsheet,
  Printer,
  Calendar,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText
} from 'lucide-vue-next'
import { useScheduleStore } from '../../stores/scheduleStore'
import { cellTextJP } from '@core/cell-parser'

const props = defineProps<{
  modelValue: boolean
  initialTab?: 'jadwal' | 'beban'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'export-pdf'): void
  (e: 'export-excel'): void
}>()

const store = useScheduleStore()

const activeDocTab = ref<'jadwal' | 'beban'>('jadwal')
const zoomLevel = ref<number>(100)

// Logo & Kop Surat & TTD
const logoUrl = computed(() => {
  const raw = store.proyek.meta.logo_base64 || ''
  if (!raw) return ''
  return raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`
})

const kopBannerUrl = computed(() => {
  if (store.proyek.meta.logo_base64) return ''
  const raw = store.proyek.meta.kop_base64 || ''
  if (!raw) return ''
  return raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`
})

const ttdUrl = computed(() => {
  const raw = store.proyek.meta.ttd_base64 || ''
  if (!raw) return ''
  return raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`
})

const formattedNip = computed(() => {
  const raw = store.proyek.meta.pejabat_ttd?.nip || ''
  if (!raw || raw === '-') return '-'
  return raw.startsWith('NIP') ? raw : `NIP. ${raw}`
})

const guruMap = computed(() => new Map(store.proyek.master.guru.map((g) => [g.id, g.nama])))
const kelasList = computed(() => store.proyek.master.kelas)

function closeModal(): void {
  emit('update:modelValue', false)
}

function handleZoomIn(): void {
  if (zoomLevel.value < 140) zoomLevel.value += 10
}

function handleZoomOut(): void {
  if (zoomLevel.value > 60) zoomLevel.value -= 10
}

function resetZoom(): void {
  zoomLevel.value = 100
}

function triggerExportPdf(): void {
  emit('export-pdf')
}

function triggerExportExcel(): void {
  emit('export-excel')
}

// Format teks label non-KBM (misal: "I S T I R A H A T")
function formatNonKbmLabel(label: string): string {
  if (!label) return '—'
  return `— ${label.toUpperCase().split('').join(' ')} —`
}

// Format rentang jam menjadi satu baris bersih (misal: "07.20 - 08.40")
function formatSlotWaktu(waktuList: string[]): string {
  if (!waktuList || waktuList.length === 0) return '—'
  if (waktuList.length === 1) return waktuList[0].replace('-', ' - ')
  const first = waktuList[0].split('-')[0].trim()
  const last =
    waktuList[waktuList.length - 1].split('-')[1]?.trim() ||
    waktuList[waktuList.length - 1].split('-')[0].trim()
  return `${first} - ${last}`
}

// Analisis sel KBM untuk mendeteksi split-JP (2 jam dibagi 2 mapel berbeda atau salah satu JP kosong)
function getCellDisplay(cell: any): { isSplit: boolean; a: string; b: string; single: string } {
  if (!cell || !Array.isArray(cell) || cell.length === 0) {
    return { isSplit: false, a: '', b: '', single: '' }
  }
  const a = Array.isArray(cell[0]) ? cell[0].join('/') : ''
  const b = cell.length > 1 ? (Array.isArray(cell[1]) ? cell[1].join('/') : '') : a
  const isSplit = cell.length > 1 && a !== b
  if (isSplit) {
    return { isSplit: true, a, b, single: '' }
  }
  return { isSplit: false, a, b, single: a || b }
}

</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
  >
    <!-- Header Toolbar Modal -->
    <header
      class="flex h-14 shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900 px-6 text-white shadow-lg"
    >
      <!-- Judul & Badge Kertas -->
      <div class="flex items-center space-x-3">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
        >
          <Printer class="h-4 w-4" />
        </div>
        <div>
          <h2 class="text-sm font-semibold tracking-wide text-slate-100 flex items-center space-x-2">
            <span>Pratinjau Lembar Cetak Dokumen</span>
            <span class="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-slate-700">
              Kertas: A4 Standar
            </span>
          </h2>
          <p class="text-[11px] text-slate-400">
            Periksa format kop sekolah, garis pemisah, dan tanda tangan sebelum menyimpan
          </p>
        </div>
      </div>

      <!-- Tab Switcher Dokumen -->
      <div class="flex items-center space-x-1 rounded-xl bg-slate-800 p-1 border border-slate-700">
        <button
          @click="activeDocTab = 'jadwal'"
          :class="[
            'flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            activeDocTab === 'jadwal'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          ]"
        >
          <Calendar class="h-3.5 w-3.5" />
          <span>1. Matriks Jadwal Pelajaran</span>
        </button>

        <button
          @click="activeDocTab = 'beban'"
          :class="[
            'flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            activeDocTab === 'beban'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          ]"
        >
          <Layers class="h-3.5 w-3.5" />
          <span>2. Lampiran Beban Mengajar</span>
        </button>
      </div>

      <!-- Tombol Aksi Ekspor & Zoom -->
      <div class="flex items-center space-x-3">
        <!-- Zoom Controls -->
        <div class="flex items-center space-x-1 border-r border-slate-700 pr-3 text-slate-400">
          <button
            @click="handleZoomOut"
            class="rounded-lg p-1.5 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Perkecil"
          >
            <ZoomOut class="h-3.5 w-3.5" />
          </button>
          <span class="text-xs font-mono w-10 text-center text-slate-300">{{ zoomLevel }}%</span>
          <button
            @click="handleZoomIn"
            class="rounded-lg p-1.5 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Perbesar"
          >
            <ZoomIn class="h-3.5 w-3.5" />
          </button>
          <button
            @click="resetZoom"
            class="rounded-lg p-1.5 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Reset Ukuran (100%)"
          >
            <RotateCcw class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- Tombol Simpan PDF -->
        <button
          @click="triggerExportPdf"
          class="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-900/40"
          title="Simpan sebagai berkas PDF resmi (A4)"
        >
          <Printer class="h-3.5 w-3.5" />
          <span>Simpan PDF (A4)</span>
        </button>

        <!-- Tombol Ekspor Excel -->
        <button
          @click="triggerExportExcel"
          class="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm shadow-emerald-900/40"
          title="Ekspor sebagai buku kerja Excel (.xlsx)"
        >
          <FileSpreadsheet class="h-3.5 w-3.5" />
          <span>Ekspor Excel (.xlsx)</span>
        </button>

        <!-- Tutup Modal -->
        <button
          @click="closeModal"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors ml-1"
          title="Tutup Pratinjau"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
    </header>

    <!-- Canvas Area Scrollable Pratinjau Lembar Kertas A4 (items-start mencegah clamp tinggi) -->
    <div class="flex-1 overflow-auto bg-slate-950 p-8 flex justify-center items-start">
      <!-- Lembar Kertas Dokumen A4 Landscape Proporsional (297mm rasio) -->
      <div
        :style="{
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'top center',
          marginBottom: zoomLevel > 100 ? `${(zoomLevel - 100) * 12}px` : '40px'
        }"
        class="w-[1120px] shrink-0 rounded-sm bg-white p-9 text-slate-900 shadow-2xl transition-transform duration-100 ease-out font-sans select-text border border-slate-300 my-4"
      >
        <!-- 1. KOP SURAT RESMI STANDAR DINAS -->
        <!-- Opsi A: Banner Kop Lengkap (jika ada gambar banner kop horizontal utuh) -->
        <div v-if="kopBannerUrl" class="w-full text-center pb-2 mb-2 border-b-2 border-slate-900">
          <img
            :src="kopBannerUrl"
            alt="Kop Surat Resmi"
            class="w-full max-h-32 object-contain mx-auto"
          />
        </div>

        <!-- Opsi B: Kop Surat Standar (Logo di kiri, Teks di tengah) -->
        <template v-else>
          <div class="flex items-center justify-between pb-1">
            <!-- Logo Sekolah (Sisi Kiri) -->
            <div v-if="logoUrl" class="w-20 h-20 shrink-0 flex items-center justify-center mr-4">
              <img
                :src="logoUrl"
                alt="Logo Sekolah"
                class="max-h-20 max-w-20 object-contain"
              />
            </div>

            <!-- Teks Kop Surat (Tengah) -->
            <div class="flex-1 text-center">
              <p
                v-if="store.proyek.meta.notaris"
                class="text-xs font-serif uppercase tracking-widest text-slate-700 font-semibold mb-0.5"
              >
                {{ store.proyek.meta.notaris }}
              </p>
              <h1 class="text-xl font-bold font-serif uppercase tracking-wider text-slate-950 leading-tight">
                {{ store.proyek.meta.nama_sekolah || 'NAMA RESMI SEKOLAH / MADRASAH' }}
              </h1>
              <p class="text-[11px] text-slate-600 mt-0.5 font-sans">
                {{ store.proyek.meta.alamat_sekolah || 'Alamat lengkap sekolah, nomor telepon, dan email resmi' }}
              </p>
            </div>

            <!-- Spacer Sisi Kanan Penyeimbang Logo -->
            <div v-if="logoUrl" class="w-20 shrink-0 ml-4"></div>
          </div>

          <!-- Garis Ganda Kop Surat Resmi -->
          <div class="border-t-2 border-b border-black h-1 my-3"></div>
        </template>

        <!-- ============================================================== -->
        <!-- KONTEN TAB 1: MATRIKS JADWAL PELAJARAN UTAMA -->
        <!-- ============================================================== -->
        <div v-if="activeDocTab === 'jadwal'">
          <!-- Judul Dokumen -->
          <div class="text-center mb-3">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-950">
              JADWAL PELAJARAN UTAMA
            </h3>
            <p class="text-xs text-slate-700 font-medium">
              SEMESTER {{ store.proyek.meta.semester }} — TAHUN PELAJARAN {{ store.proyek.meta.tahun_pelajaran || '-' }}
            </p>
          </div>

          <!-- Tabel Matriks Jadwal Pelajaran (Table-layout fixed agar rapi proporsional) -->
          <div class="border border-slate-900 overflow-hidden bg-white">
            <table class="w-full border-collapse text-[10px] table-fixed bg-white">
              <thead>
                <tr class="bg-teal-800 text-white font-bold">
                  <th class="border border-slate-600 px-1 py-1.5 text-center w-14">Hari</th>
                  <th class="border border-slate-600 px-1 py-1.5 text-center w-12">Jam Ke</th>
                  <th class="border border-slate-600 px-1 py-1.5 text-center w-24">Waktu</th>
                  <th
                    v-for="k in kelasList"
                    :key="k.id"
                    class="border border-slate-600 px-1 py-1.5 text-center truncate"
                  >
                    {{ k.nama }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white">
                <template
                  v-for="(hariKbm, hariName) in store.proyek.struktur_waktu.hari"
                  :key="hariName"
                >
                  <template v-if="hariKbm.aktif">
                    <tr
                      v-for="(slot, sIdx) in hariKbm.slots"
                      :key="slot.id"
                      :class="[
                        'bg-white h-7',
                        sIdx === hariKbm.slots.length - 1 ? 'border-b-2 border-slate-900' : 'border-b border-slate-300'
                      ]"
                    >
                      <!-- Kolom Hari (Rowspan melintasi semua slot) -->
                      <td
                        v-if="sIdx === 0"
                        :rowspan="hariKbm.slots.length"
                        class="border-r border-slate-400 bg-slate-50 font-bold text-center px-1 align-middle text-xs text-slate-900 uppercase"
                      >
                        {{ hariName }}
                      </td>

                      <!-- Kolom Jam Ke: Jika non-KBM (Upacara/Istirahat) tampilkan strip rapi -->
                      <td class="border-r border-slate-400 bg-white text-center font-bold px-1 py-0.5 text-slate-800 text-[10px] align-middle">
                        {{ slot.tipe === 'kbm' ? (slot.jp.length > 0 ? slot.jp.join('-') : slot.label) : '—' }}
                      </td>

                      <!-- Kolom Waktu: Format rentang jam rapi satu baris (07.20 - 08.40) -->
                      <td class="border-r border-slate-400 bg-white text-center text-[9px] px-1 py-0.5 text-slate-600 font-mono whitespace-nowrap align-middle">
                        {{ formatSlotWaktu(slot.waktu) }}
                      </td>

                      <!-- Jika NON-KBM (Istirahat / Upacara / Sholat): MERGE SELURUH KELAS -->
                      <td
                        v-if="slot.tipe !== 'kbm'"
                        :colspan="kelasList.length"
                        class="border-r border-slate-400 bg-slate-100 text-center py-1 font-bold tracking-widest text-[9.5px] text-slate-600 uppercase align-middle"
                      >
                        {{ formatNonKbmLabel(slot.label) }}
                      </td>

                      <!-- Jika KBM: Render Sel Tiap Rombel -->
                      <template v-else>
                        <td
                          v-for="k in kelasList"
                          :key="k.id"
                          class="border-r border-slate-400 bg-white text-center p-0 font-bold text-slate-900 h-7 align-middle"
                        >
                          <template v-if="store.proyek.jadwal[hariName]?.[slot.id]?.[k.id]">
                            <!-- Format Split-JP: Dua Sub-kolom Vertikal Penuh [ 1 │ 31 ] -->
                            <div
                              v-if="getCellDisplay(store.proyek.jadwal[hariName][slot.id][k.id]).isSplit"
                              class="flex h-7 w-full items-stretch divide-x divide-slate-400 text-[9px] leading-none"
                            >
                              <span class="flex-1 flex items-center justify-center px-0.5 truncate text-center font-bold text-slate-900">
                                {{ getCellDisplay(store.proyek.jadwal[hariName][slot.id][k.id]).a }}
                              </span>
                              <span class="flex-1 flex items-center justify-center px-0.5 truncate text-center font-bold text-slate-900">
                                {{ getCellDisplay(store.proyek.jadwal[hariName][slot.id][k.id]).b }}
                              </span>
                            </div>

                            <!-- Format Pelajaran Tunggal Penuh -->
                            <div v-else class="flex h-7 w-full items-center justify-center px-0.5 truncate text-center font-bold text-[9.5px]">
                              {{ getCellDisplay(store.proyek.jadwal[hariName][slot.id][k.id]).single }}
                            </div>
                          </template>
                        </td>
                      </template>
                    </tr>
                  </template>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ============================================================== -->
        <!-- KONTEN TAB 2: DAFTAR BEBAN MENGAJAR GURU -->
        <!-- ============================================================== -->
        <div v-else-if="activeDocTab === 'beban'">
          <!-- Judul Dokumen -->
          <div class="text-center mb-3">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-950">
              DAFTAR PEMBAGIAN TUGAS DAN BEBAN MENGAJAR GURU
            </h3>
            <p class="text-xs text-slate-700 font-medium">
              TAHUN PELAJARAN {{ store.proyek.meta.tahun_pelajaran || '-' }} — SEMESTER {{ store.proyek.meta.semester }}
            </p>
          </div>

          <!-- Tabel Beban Mengajar -->
          <div class="border border-slate-900 overflow-hidden bg-white">
            <table class="w-full border-collapse text-[10px] bg-white">
              <thead>
                <tr class="bg-teal-800 text-white font-bold">
                  <th class="border border-slate-600 px-1 py-1.5 text-center w-8">No</th>
                  <th class="border border-slate-600 px-2 py-1.5 text-left">Nama Guru & Gelar</th>
                  <th class="border border-slate-600 px-1 py-1.5 text-center w-12">Kode</th>
                  <th class="border border-slate-600 px-2 py-1.5 text-left">Mata Pelajaran</th>
                  <th
                    v-for="k in kelasList"
                    :key="k.id"
                    class="border border-slate-600 px-1 py-1.5 text-center w-9"
                  >
                    {{ k.nama }}
                  </th>
                  <th class="border border-slate-600 px-2 py-1.5 text-center w-14 font-extrabold">Total JP</th>
                </tr>
              </thead>
              <tbody class="bg-white">
                <tr
                  v-for="(p, pIdx) in store.proyek.master.penugasan"
                  :key="p.id"
                  class="border-b border-slate-300 hover:bg-slate-50 transition-colors bg-white"
                >
                  <td class="border-r border-slate-400 bg-white text-center px-1 py-1">{{ pIdx + 1 }}</td>
                  <td class="border-r border-slate-400 bg-white px-2 py-1 font-semibold text-slate-900">
                    {{
                      p.guru_ids && p.guru_ids.length > 0
                        ? p.guru_ids.map((id) => guruMap.get(id) || '?').join(' & ')
                        : guruMap.get(p.guru_id) || '?'
                    }}
                  </td>
                  <td class="border-r border-slate-400 bg-white text-center font-bold text-teal-800">{{ p.kode }}</td>
                  <td class="border-r border-slate-400 bg-white px-2 py-1 text-slate-700">{{ p.mapel }}</td>
                  <td
                    v-for="k in kelasList"
                    :key="k.id"
                    class="border-r border-slate-400 bg-white text-center px-1 py-1 font-medium"
                  >
                    {{ p.beban[k.id] || '' }}
                  </td>
                  <td class="border-r border-slate-400 bg-white text-center font-bold text-slate-950">
                    {{ Object.values(p.beban).reduce((sum, v) => sum + (v || 0), 0) || '' }}
                  </td>
                </tr>

                <!-- Baris Total JP Footer -->
                <tr class="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-950">
                  <td colspan="4" class="border-r border-slate-400 px-3 py-1.5 text-center font-bold uppercase">
                    TOTAL ALOKASI JAM PER KELAS
                  </td>
                  <td
                    v-for="k in kelasList"
                    :key="k.id"
                    class="border-r border-slate-400 text-center px-1 py-1.5 font-bold text-teal-900"
                  >
                    {{ store.proyek.master.penugasan.reduce((acc, p) => acc + (p.beban[k.id] || 0), 0) || '' }}
                  </td>
                  <td class="border-r border-slate-400 text-center font-extrabold text-teal-900">
                    {{
                      store.proyek.master.penugasan.reduce((acc, p) => {
                        return acc + Object.values(p.beban).reduce((s, v) => s + (v || 0), 0)
                      }, 0)
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. LEMBAR TANDA TANGAN PENGESAHAN RESMI (Rata Kanan) -->
        <div class="mt-8 flex justify-end">
          <div class="w-64 text-center text-xs">
            <p class="text-slate-700 mb-0.5">
              {{ store.proyek.meta.kota_tanggal || 'Ditetapkan pada tanggal: ....................' }}
            </p>
            <p class="font-semibold text-slate-900 mb-2">
              {{ store.proyek.meta.pejabat_ttd?.jabatan || 'Kepala Sekolah' }},
            </p>

            <!-- Spasi TTD Fisik atau Gambar -->
            <div class="h-14 flex items-center justify-center">
              <img
                v-if="ttdUrl"
                :src="ttdUrl"
                alt="Tanda Tangan"
                class="max-h-14 max-w-[130px] object-contain"
              />
            </div>

            <!-- Nama Pejabat & NIP -->
            <p class="font-bold underline text-slate-950 mt-1">
              {{ store.proyek.meta.pejabat_ttd?.nama || '........................................' }}
            </p>
            <p class="text-[11px] text-slate-600">
              {{ formattedNip }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
