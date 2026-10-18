# TODO — Roadmap Implementasi
## Proyek: Jadwal Sekolah (Native Windows Desktop)

Dokumen ini adalah daftar kerja sistematis untuk eksekutor kode (Gemini). Urutan fase **wajib diikuti** — setiap fase bergantung pada fase sebelumnya (core engine harus selesai & lulus tes sebelum UI dibangun, sesuai `docs/adr/0003-isolated-core-domain-engine.md` dan `AI_RULES.md` §3).

Referensi wajib dibaca sebelum mulai: `AI_RULES.md`, `docs/PRD.md`, `docs/DESIGN.md`, `docs/ERD.md`, `docs/adr/`.

---

## Fase 0 — Scaffolding Proyek

- [x] Inisialisasi repo git (`git init`, `.gitignore` untuk `node_modules/`, `dist/`, `release/`, `cadangan/`).
- [x] Setup proyek Electron + Vite + Vue 3 + TypeScript (gunakan template resmi `electron-vite`, jangan bangun konfigurasi bundler dari nol).
- [x] Setup Tailwind CSS sesuai palet warna semantik di `docs/DESIGN.md` §3.1 (primary emerald/teal, error rose-600, warning amber-500, info indigo-500, surface slate/zinc).
- [x] Setup Vitest untuk `tests/` (target: unit test core engine).
- [x] Buat struktur folder persis sesuai `docs/DESIGN.md` §2 (`src/main`, `src/preload`, `src/core`, `src/renderer`).
- [x] Set `contextIsolation: true`, `nodeIntegration: false` pada `BrowserWindow` (ADR-0001, `AI_RULES.md` §2.2).
- [x] **Acceptance**: `npm run build` sukses membuat bundle Electron Main, Preload, dan Renderer.

---

## Fase 1 — Core Domain Engine (`src/core/`) — TDD Wajib

> Aturan keras: setiap item di fase ini dimulai dengan menulis test gagal (RED) dulu di `tests/`, baru implementasi (GREEN), baru refactor. Lihat `AI_RULES.md` §3 dan skill `tdd-workflow`.

- [x] `src/core/types.ts` — definisikan interface sesuai `docs/ERD.md` §1 & §3 (Metadata, HariKBM, SlotJam, Guru, GuruTidakBisa, Kelas, Penugasan, BebanKelas, JadwalCell, `HasilPemeriksaan`).
- [x] `src/core/cell-parser.ts` — parser sintaks kode sel (contoh `4A/6`, `13|23`, split JP). Test kasus: 1 kode tunggal, kode ganda team-teaching, split JP per-setengah-slot, kode tidak dikenal.
- [x] `src/core/checker.ts` — mesin deteksi bentrok:
  - [x] Guru sama di >1 kelas pada hari+slot yang sama → `ERROR`.
  - [x] Kode team teaching: bentrok hanya jika jumlah kelas unik melebihi jumlah guru pemegang kode.
  - [x] Penempatan kode pada slot yang ada di `tidak_bisa` guru → `ERROR` tingkat kritis.
  - [x] Kode tidak dikenal (tidak ada di `penugasan`) → `ERROR`.
- [x] `src/core/load-calculator.ts` — kalkulasi beban JP terpasang vs `target_jp` di `BebanKelas`: selisih lebih → `ERROR`, selisih kurang → `INFO`.
- [x] `src/core/default-presets.ts` — preset SD (35 menit), SMP (40 menit), SMA/SMK (45 menit), untuk 5 hari & 6 hari (lihat `docs/DESIGN.md` §3.4 dan `docs/PRD.md` §3.1).
- [x] **Guard rail**: tidak ada import `vue`, `pinia`, atau `electron` di `src/core/**` — diuji secara otomatis di `tests/guard-rail.test.ts`.
- [x] **Acceptance NFR**: benchmark `checker.ts` pada dataset sintetis 6 hari × 10 jam × 40 kelas lulus uji performa sesuai standar Dual-Tier NF
R (ADR-0007).
- [x] Jalankan coverage Vitest, target ≥ 80% untuk seluruh `src/core/` (Tercapai: **98.77%** statement coverage).

---

## Fase 2 — Electron Main Process & Persistence

- [x] `src/main/storage.ts` — atomic write (tulis `.tmp` → rename/replace) untuk berkas `.jadwal` (ADR-0002).
- [x] Rotating backup ke folder `cadangan/`, maksimal 30 snapshot (ADR-0002, `AI_RULES.md` §2.3).
- [x] Auto-save setiap 60 detik tanpa blocking UI thread (`docs/PRD.md` §3.4).
- [x] Validasi skema berkas dengan `format_version` (lihat contoh payload di `docs/ERD.md` §3) — tolak/migrasikan berkas versi lama dengan pesan jelas, jangan silent fail.
- [x] `src/main/ipc-handlers.ts` — handler dialog buka/simpan berkas, print-to-PDF, export Excel.
- [x] `src/preload/index.ts` — expose API ke renderer hanya lewat `secureBridge.api` tipe kuat (strictly-typed IPC, ADR-0001).
- [x] **Acceptance**: simulasikan kegagalan proses saat menulis → berkas asli tidak korup, `.tmp` dibersihkan saat startup berikutnya (teruji di `tests/storage.test.ts`).

---

## Fase 3 — Renderer: State & Undo/Redo

- [x] `src/renderer/stores/scheduleStore.ts` (Pinia) — state jadwal, master data, wiring ke `src/core/*`.
- [x] Snapshot-Based State History untuk Undo/Redo (menggantikan GoF Command Pattern sesuai ADR-0006), 50 langkah (`docs/PRD.md` §3.4), cakupan: perubahan sel grid **dan** perubahan master data.
- [x] `src/renderer/stores/uiStore.ts` — state UI (sel aktif, tema light/dark, filter pencarian).
- [x] **Acceptance**: unit test store untuk urutan undo→redo→undo menghasilkan state identik dengan snapshot sebelumnya (teruji di `tests/store.test.ts`).

---

## Fase 4 — UI: Wizard Onboarding Sekolah

- [x] `src/renderer/components/wizard/SchoolSetupWizard.vue` — 4 langkah sesuai `docs/PRD.md` §3.1 & `docs/DESIGN.md` §3.4:
  1. Profil sekolah (nama, jenjang, tahun ajaran, semester, kota, kepala sekolah, NIP, upload kop/ttd).
  2. Pola hari (5 hari / 6 hari).
  3. Struktur jam (preset SD/SMP/SMA/SMK atau kustom penuh).
  4. Ringkasan & konfirmasi.
- [x] Validasi tiap langkah sebelum lanjut (tidak boleh skip dengan field wajib kosong).
- [x] **Acceptance**: hasil wizard menghasilkan objek `Metadata` + `struktur_waktu` valid sesuai skema `docs/ERD.md` §3, siap dikonsumsi `scheduleStore`.

---

## Fase 5 — UI: Master Data

- [x] `src/renderer/components/master/` — tab Guru (+ matriks ketersediaan klik visual hari×jam), Kelas (dengan reorder naik/turun), Beban/Penugasan (matriks distribusi JP per kelas, dukungan team teaching).
- [x] Validasi real-time: kode penugasan harus unik per guru kecuali team teaching yang disengaja.
- [x] **Acceptance**: mengubah data guru/kelas/penugasan langsung memicu re-evaluasi `checker.ts` pada grid tanpa reload.

---

## Fase 6 — UI: Kisi Jadwal Interaktif (fitur inti)

- [x] `src/renderer/components/grid/ScheduleGridView.vue` — Native DOM Table dengan sticky header (kelas) & sticky kolom kiri (hari/jam) (menggantikan table virtualization sesuai ADR-0006).
- [x] Navigasi keyboard penuh: Panah, `Enter`, `Tab`, `Delete`/`Backspace`, `Ctrl+Z`/`Ctrl+Y`, `Ctrl+C`/`Ctrl+V` (`docs/DESIGN.md` §3.2).
- [x] Validasi bentrok instan saat mengetik, render ulang hanya sel terdampak (bukan seluruh grid) agar memenuhi NFR < 15ms (`docs/PRD.md` §4.1).
- [x] Visualisasi: sel normal (warna pastel penugasan), sel bentrok (outline merah + badge jumlah bentrok), sorot guru aktif (warna aksen kuning/emas).
- [x] Toast notifikasi bentrok: muncul otomatis, hilang sendiri, **tidak** mencuri fokus keyboard dari sel yang sedang diketik.
- [x] `src/renderer/components/sidebar/IssueSidebar.vue` — akordion 🔴 Harus Diperbaiki / 🟡 Peringatan / 🔵 Belum Lengkap, dengan tombol "Lompat ke Sel".
- [x] Tab kode guru di sidebar: search instan, kolom Sisa JP per kelas aktif, double-click untuk menempatkan kode ke sel terpilih.
- [x] **Acceptance**: skenario manual — ketik kode bentrok → sel merah muncul < 1 frame terasa, toast muncul, sidebar ter-update, klik "Lompat ke Sel" dari sidebar lain memindahkan fokus grid dengan benar.

---

## Fase 7 — Ekspor PDF & Excel

- [x] `src/main/pdf-template.ts` & `src/main/ipc-handlers.ts` — generate PDF via Chromium Print to PDF menggunakan template HTML cetak resmi A4 Landscape terpisah (kop surat dinas, garis ganda, logo base64 tersanitasi, matriks jadwal, dan lampiran beban mengajar guru siap tanda tangan) tanpa menangkap UI viewport aplikasi.
- [x] Ekspor `.xlsx` via `exceljs` (`src/main/excel-exporter.ts`), 2 sheet (Beban Mengajar & Matriks Jadwal), border tipis, auto-lebar kolom, resolusi team teaching, split-JP, kop surat resmi berlogo, dan blok pengesahan tanda tangan (ADR-0004).
- [x] `src/renderer/src/components/export/ExportPreviewModal.vue` — modal pratinjau interaktif (*sheet preview*) sebelum menyimpan berkas: menampilkan lembar kertas A4 cetak nyata, tab matriks jadwal vs beban mengajar, zoom in/out/reset, serta tombol pemicu simpan PDF dan ekspor Excel.
- [x] **Acceptance**: uji kasus ekstrem — 3 kelas/5 hari, 36 kelas/6 hari — pastikan tidak ada teks terpotong di PDF maupun Excel, dan pratinjau tampil proporsional sebelum berkas disimpan.

---

## Fase 8 — Packaging & NFR Final

- [x] Konfigurasi `electron-builder.json5` untuk installer `.exe` + versi portable (`docs/PRD.md` §4.2).
- [x] Ukur startup time end-to-end, target < 2 detik di Windows 10/11 standar (`docs/PRD.md` §4.1).
- [x] Verifikasi dukungan resolusi 1366×768 hingga 4K + fitur Zoom/Fit to Window (`docs/PRD.md` §4.4).
- [x] Pastikan tidak ada koneksi ke server/API eksternal (grep kode untuk `fetch`/`axios`/URL hardcoded) — aplikasi harus 100% offline.

---

## Fase 9 — Autocomplete Saran Kode Inline saat Mengetik (UX Enhancement)

> Rujukan keputusan & alasan: `docs/adr/0008-inline-autocomplete-cell-suggestions.md`. Ini **bukan** mode input terpisah yang dipilih operator — ini bantuan opsional yang tampil otomatis di atas jalur ketik-kode yang sudah ada, tanpa mengubah perilaku lama untuk operator yang sudah hafal kode.

- [x] Tambah state lokal di `src/renderer/src/components/grid/ScheduleGridView.vue`: `suggestionList`, `activeSuggestionIndex`, `showSuggestions` (+ `suggestionPos` untuk posisi dropdown ter-teleport).
- [x] Fungsi ekstraksi token — diimplementasikan sebagai `ambilTokenAktif(text, posisiKursor)` di `src/core/cell-parser.ts` (bukan di dalam komponen Vue), supaya murni dan bisa diuji unit test langsung sesuai prinsip isolasi core (ADR-0003). Memotong berdasarkan pemisah multi-kode (`/`, `,`, `+`, `;`) **dan** pemisah split-JP (`|`) sekaligus, konsisten dengan `parseCell`/`parseCellJP`.
- [x] Fungsi `computeSuggestions(token)` di `ScheduleGridView.vue` — filter dari `store.proyek.master.penugasan` + `namaGuruMap` (computed baru): prefix match kode, atau substring match nama guru/mapel. Prefix-kode-match diurutkan di atas, maksimal 8 hasil.
- [x] Dropdown saran di-render lewat `<Teleport to="body">` dengan posisi `fixed` dihitung dari `getBoundingClientRect()` input aktif — dipilih ketimbang `absolute` biasa karena grid punya scroll container (`overflow-auto`) yang akan memotong dropdown jika sel diedit di baris bawah. Tiap baris: `KODE — Nama Guru · Mapel · Sisa JP`.
- [x] `onInputKeyDown` diperluas: `ArrowDown`/`ArrowUp` navigasi saran, `Enter`/`Tab` menerima saran (ganti token via `applySuggestion`, lalu commit + pindah sel seperti biasa), `Escape` menutup dropdown saja (tidak memanggil `cancelEdit()`). State saran direset di `startEditing`/`commitEdit`/`cancelEdit`.
- [x] Dropdown tidak tampil jika token kosong atau exact-match tunggal dengan kandidat identik.
- [x] Unit test ekstraksi token ditambahkan ke `tests/cell-parser.test.ts` (termasuk kasus multi-kode, split JP, teks campuran, dan preservasi token sekeliling saat penggantian) — seluruh 48 test proyek lulus, `npm run typecheck` dan `npm run build` bersih.
- [x] Verifikasi interaktif/manual (terverifikasi via browser/Playwright runtime): mengetik kode penuh lalu `Enter` tanpa menyentuh dropdown tetap identik seperti sebelum fitur ini ada (mis. `2` atau `26A` di sel `B1` rombel `7A` langsung ter-commit tanpa terdistorsi).
- [x] Verifikasi interaktif/manual (terverifikasi via browser/Playwright runtime): mengetik sebagian nama guru/mapel (mis. `24A/ASTRI` memunculkan `26A` & `26B`, `13|PJOK` memunculkan `27`) menggantikan hanya token yang sedang diketik (`24A/26A`, `13|27`) tanpa mengganggu kode lain di sel yang sama. Navigasi `ArrowDown`/`ArrowUp` dan pembatalan dropdown lewat `Escape` berfungsi presisi.

> Keterbatasan diketahui: dropdown saran tidak ikut ter-update jika kursor dipindah dengan `ArrowLeft`/`ArrowRight` tanpa mengetik (hanya recompute saat event `input`). Dampaknya kecil (saran jadi agak basi sampai keystroke berikutnya), tidak diperbaiki sekarang untuk menghindari over-engineering di luar cakupan ADR-0008.

---

## Catatan Proses (wajib dipatuhi tiap fase)

1. Setiap fase baru → mulai dari test gagal dulu (lihat skill `tdd-workflow` / `superpowers:test-driven-development`), bukan langsung tulis implementasi.
2. Jangan ubah/hapus test agar "lulus" kecuali spesifikasi bisnis memang berubah dan disetujui pengguna (`AI_RULES.md` §3.3).
3. Jika suatu fase memerlukan keputusan arsitektural baru yang belum tercatat → buat ADR baru di `docs/adr/` (pakai `docs/adr/template.md`) sebelum lanjut implementasi, jangan diputuskan diam-diam di tengah kode.
4. Centang item hanya setelah kode **dan** test terkait lulus — bukan setelah kode ditulis.
