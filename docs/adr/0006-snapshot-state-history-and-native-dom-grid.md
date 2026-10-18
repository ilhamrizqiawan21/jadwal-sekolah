# ADR-0006: Snapshot-Based State History dan Native DOM Grid

**Date**: 2026-10-18
**Status**: accepted
**Deciders**: Tim pengembang proyek Jadwal Sekolah

## Context

Pada spesifikasi arsitektur awal (`docs/PRD.md` dan `docs/DESIGN.md`), direncanakan penerapan:
1. **GoF Command Pattern** (`execute()`, `undo()`, `redo()`) untuk mengelola riwayat undo/redo hingga 50 langkah.
2. **Table Virtualization** (virtual scrolling) pada komponen `ScheduleGridView.vue` untuk merender kisi jadwal.

Namun, saat implementasi berjalan pada platform Electron Desktop modern:
- Dataset jadwal sekolah memiliki batas skalar yang terbatas: maksimal 30–40 kelas × 5–6 hari × 8–10 jam per hari (~2.400 sel total). Ukuran serialisasi JSON satu berkas proyek hanya berkisar antara 80 KB hingga 250 KB.
- Penggunaan Command Pattern untuk mutasi kompleks (seperti pengurutan ulang kelas, perubahan struktur jam KBM, penambahan guru massal, atau batch clear) memerlukan pembuatan puluhan kelas Command khusus dan sangat rentan desinkronisasi koordinat jika mutasi parsial gagal.
- Table Virtualization pada kisi sel spreadsheet interaktif menimbulkan glitch serius: hilangnya kontinuitas fokus keyboard (`Arrow keys`, `Tab`, `Enter`), pemotongan posisi scroll saat resizing/zooming, serta flicker pada header dan kolom kiri yang sticky.
- Sebaliknya, Chromium Engine modern (v132) mampu me-render 2.400 elemen sel native DOM dengan kecepatan 60 FPS stabil tanpa penurunan frame rate jika menggunakan CSS layout murni (`position: sticky`).

## Decision

1. **Mengadopsi Snapshot-Based State History**:
   Mengganti GoF Command Pattern dengan stack serializable state snapshot (deep-clone via `structuredClone` / JSON serialization) pada Pinia store (`scheduleStore.ts`). Stack dibatasi hingga 50 snapshot riwayat terakhir.
2. **Mengadopsi Native DOM Table dengan CSS Sticky Header & Column**:
   Mengganti library virtual scrolling dengan tabel HTML/CSS native yang memanfaatkan `position: sticky` untuk baris header kelas dan kolom penunjuk hari/jam.

## Alternatives Considered

### Alternative 1: GoF Command Pattern dengan Delta Patching
- **Pros**: Menghemat alokasi memori per langkah kecil (hanya menyimpan koordinat sel lama dan baru).
- **Cons**: Sangat kompleks untuk mutasi non-sel (perubahan struktur waktu, hapus guru berelasi, reorder kelas); rentan bug state desynchronization jika salah satu mutasi reverse gagal.
- **Why not**: Alokasi memori untuk 50 snapshot penuh proyek berukuran 120 KB hanya memakan ~6 MB RAM. Pada mesin modern dengan RAM 4 GB–16 GB, penghematan beberapa kilobyte tidak sebanding dengan risiko inkonsistensi data. Snapshot menjamin 100% konsistensi state saat undo/redo.

### Alternative 2: Library Table Virtualization (misal `vue-virtual-scroller` atau custom virtualizer)
- **Pros**: Mengurangi jumlah DOM node aktif di memori browser.
- **Cons**: Mengacaukan sistem fokus keyboard saat pengguna berpindah sel ke area di luar viewport; header dan kolom samping rentan melayang tidak sinkron (scroll lag); menyulitkan fitur select/copy-paste banyak sel.
- **Why not**: Skala maksimal 40 kelas (2.400 sel) terbukti berjalan lancar pada 60 FPS native DOM Chromium tanpa virtualizer.

## Consequences

### Positive
- **Integritas State Terjamin**: Undo dan Redo mengembalikan state aplikasi ke bentuk yang persis sama tanpa kemungkinan terjadinya silent state corruption.
- **Pengalaman Pengguna (UX) Superior**: Navigasi keyboard penuh tanpa gangguan fokus loncat atau sel berkedip saat scrolling.
- **Arsitektur Lebih Sederhana**: Mengurangi ratusan baris boilerplate class command dan integrasi library virtualizer eksternal yang rapuh.

### Negative
- Konsumsi memori bertambah sekitar 5–7 MB untuk menyimpan riwayat 50 langkah (sangat wajar untuk aplikasi desktop).

### Risks
- Jika aplikasi digunakan untuk skenario non-sekolah yang memiliki lebih dari 200 kelas (>15.000 sel DOM) secara bersamaan, teknik virtualisasi mungkin perlu ditinjau ulang. Namun hal tersebut berada di luar cakupan jenjang pendidikan sekolah/madrasah.
