# ADR-0005: Model Struktur Waktu Fleksibel (Dynamic TimeSlots)

**Date**: 2026-10-18
**Status**: accepted
**Deciders**: Tim pengembang proyek Jadwal Sekolah

## Context

Versi lama membatasi bahwa 1 baris KBM selalu bernilai 2 JP (`B1`, `B2`, `B3`, dst.). Padahal di banyak jenjang sekolah (khususnya SMA/SMK atau kurikulum merdeka), terdapat mapel dengan alokasi 1 JP, 3 JP, atau 4 JP (misal praktikum bengkel kejuruan).

## Decision

Mengganti sistem baris kaku dengan Model Slot Dinamis: setiap slot memiliki array `jp: number[]` (contoh: `[1]`, `[1, 2]`, `[3, 4, 5]`); pengguna dapat mengatur durasi dasar JP (35, 40, atau 45 menit); tipe baris membedakan secara eksplisit antara KBM, Istirahat/Jeda, Upacara, Ibadah, dan Jam Tutup per hari.

## Alternatives Considered

### Alternative 1: Mempertahankan baris kaku 2 JP per slot (perilaku versi lama)
- **Pros**: Lebih sederhana untuk diimplementasikan, sudah terbukti bekerja di `jadwal-mts`.
- **Cons**: Tidak dapat mengakomodasi mapel dengan alokasi 1, 3, atau 4 JP tanpa rekayasa tambahan.
- **Why not**: Bertentangan dengan tujuan produk untuk bersifat global/fleksibel lintas jenjang SD–SMK dan kurikulum merdeka.

## Consequences

### Positive
- Mendukung kebutuhan kurikulum nasional apa pun dari jenjang SD hingga SMK.
- Satu model data mencakup variasi durasi JP (35/40/45 menit) dan jumlah hari (5/6 hari).

### Negative
- Kompleksitas pemodelan data dan UI meningkat dibanding model baris kaku (perlu menangani slot dengan jumlah JP bervariasi di komponen grid).

### Risks
- Logika kalkulasi beban (`LoadEngine`) dan parser sel (`cell-parser.ts`) harus diuji menyeluruh untuk setiap kombinasi jumlah JP per slot agar tidak salah hitung kuota.
