# ADR-0008: Autocomplete Saran Kode Inline di Sel (Pengganti Mode Input Terpisah)

**Date**: 2026-10-18
**Status**: accepted
**Deciders**: Pemilik produk & tim pengembang proyek Jadwal Sekolah

## Context

Riset praktik lapangan (lihat ringkasan di percakapan desain, diturunkan dari studi penyusunan jadwal manual di sekolah Indonesia) menunjukkan operator kurikulum pada umumnya sudah terbiasa mengetik kode/singkatan langsung ke grid mirip Excel. Metode ketik-kode yang sudah ada di `ScheduleGridView.vue` cocok untuk operator yang sudah hafal kode, tapi operator baru atau yang baru separuh hafal kode harus pindah fokus ke `IssueSidebar.vue` (tab kode) untuk mencari dan double-click kode yang benar - ini memutus alur kerja di dalam sel.

Sempat dipertimbangkan membuat "mode input" terpisah yang bisa dipilih operator (ketik vs klik) agar menyesuaikan gaya masing-masing. Opsi ini ditolak karena pada praktiknya operator mencampur kedua gaya dalam satu sesi kerja tergantung kode mana yang mereka ingat saat itu - mengunci mereka ke satu mode mengurangi fleksibilitas, bukan menambah.

## Decision

Menambahkan **autocomplete saran kode inline** di dalam sel saat mode edit aktif, bukan mode terpisah yang harus dipilih:
- Saat operator mengetik, tampilkan dropdown kecil di bawah sel berisi kandidat kode yang cocok (match pada kode, nama guru, atau mapel).
- Navigasi dropdown: `ArrowUp`/`ArrowDown` untuk pindah highlight, `Enter`/`Tab` untuk menerima saran, `Escape` untuk menutup dropdown saja (tanpa membatalkan mode edit sel).
- Operator yang sudah hafal kode penuh tetap bisa mengetik lalu `Enter` seperti sebelumnya - dropdown tidak modal/blocking dan tidak mengubah alur kerja yang sudah ada.

## Alternatives Considered

### Alternative 1: Mode picker terpisah (operator memilih "gaya input" di Pengaturan)
- **Pros**: Implementasi UI per mode lebih sederhana secara individual.
- **Cons**: Menambah state persisten yang harus disinkronkan; tidak mencerminkan pola nyata operator yang mencampur ketik dan klik dalam satu sesi; mengunci operator ke satu gaya pada satu waktu.
- **Why not**: Mengurangi fleksibilitas yang sudah ada (kedua jalur - ketik dan klik dari sidebar - sudah bisa dipakai bersamaan tanpa mode).

### Alternative 2: Pertahankan sidebar kode sebagai satu-satunya jalur bantu (status quo)
- **Pros**: Tidak ada pekerjaan tambahan.
- **Cons**: Memutus fokus kerja (operator harus memindahkan mata/mouse ke panel samping); lambat untuk kasus "ingat sebagian kode" yang umum terjadi.
- **Why not**: Tidak menjembatani kasus paling umum: operator ingat sebagian kode/nama guru tapi tidak 100% persis.

### Alternative 3: Autocomplete modal/blocking (dropdown wajib dipilih sebelum lanjut)
- **Pros**: Mencegah salah ketik kode secara paksa.
- **Cons**: Melanggar prinsip "notifikasi/bantuan tidak boleh mencuri fokus ketikan" (`CONTRIBUTING.md` §4.2).
- **Why not**: Bertentangan langsung dengan prinsip UX keyboard-first proyek ini.

## Consequences

### Positive
- Mempercepat entri untuk kode yang samar-samar diingat tanpa memutus alur kerja di dalam sel.
- Tidak menambah beban kognitif untuk operator mahir - dropdown diam/tidak muncul jika tidak relevan.
- Konsisten dengan prinsip keyboard-first dan "bantuan tidak boleh mencuri fokus" di `CONTRIBUTING.md`.

### Negative
- Menambah kompleksitas state lokal di `ScheduleGridView.vue` (daftar saran, index highlight, posisi dropdown).

### Risks
- Filter kandidat saran harus tetap memenuhi Tier 1 NFR (< 5ms) sesuai `docs/adr/0007-nfr-performance-dual-tier-validation.md` - jangan menghitung ulang seluruh `knownCodes` dari nol di luar computed yang sudah ada.
- Logika ekstraksi "token yang sedang diketik" harus konsisten dengan pemisah yang sudah didukung `cell-parser.ts` (`/`, `,`, `+`, `;` untuk multi-kode, `|` untuk split JP), supaya autocomplete tidak menimpa kode lain yang sudah diketik di sel yang sama.
