# ADR-0009: Pengerasan Proses Utama, Cadangan Bertingkat, dan Pemulihan

**Date**: 2026-10-18
**Status**: accepted
**Deciders**: Tim pengembang proyek Jadwal Sekolah

## Context

Versi sebelumnya mengizinkan renderer mengirim jalur berkas apa pun ke proses utama untuk dibaca atau ditulis, menjalankan jendela tanpa `sandbox`, memuat berkas tanpa validasi bentuk, dan membuat cadangan hanya sebagai efek samping penyimpanan tanpa antarmuka untuk memulihkannya. Data sekolah nyata juga tertanam di kode sumber sebagai proyek awal.

## Decision

1. Semua jalur berkas berasal dari dialog sistem dan dicatat di daftar izin proses utama (`file-access.ts`). Izin ekspor berlaku sekali pakai dan terikat ekstensi.
2. Jendela utama berjalan dengan `sandbox: true`; navigasi dan jendela baru ditolak, izin perangkat ditolak, dan setiap pemanggilan IPC memeriksa asal pengirim.
3. Berkas yang dimuat atau diterima lewat IPC divalidasi oleh `project-validator.ts` (fungsi murni di core).
4. Cadangan dibagi dua jenis: otomatis (maksimal 30, dipangkas bergilir) dan manual (tidak ikut rotasi, maksimal 100). Simpan otomatis hanya membuat cadangan otomatis bila cadangan terakhir lebih tua dari 10 menit, supaya rotasi tidak habis dalam setengah jam.
5. Pemulihan mengganti isi proyek lewat riwayat Undo dan lebih dulu menyimpan kondisi saat ini sebagai cadangan manual.
6. Proyek yang belum pernah disimpan ditulis ke draf pemulihan di folder data aplikasi setiap 60 detik dan ditawarkan kembali saat aplikasi dibuka.

## Alternatives Considered

### Alternative 1: Cadangan hanya di folder data aplikasi
- **Pros**: Tidak mengotori folder pengguna.
- **Cons**: Cadangan hilang saat berkas dipindahkan ke komputer lain, padahal alur kerja operator berbasis flashdisk.
- **Why not**: Cadangan di samping berkas ikut berpindah bersama berkasnya.

### Alternative 2: Simpan otomatis tanpa batas ke berkas aktif dengan cadangan setiap kali
- **Pros**: Sederhana.
- **Cons**: 30 cadangan terpakai habis dalam 30 menit sehingga versi lama hilang.
- **Why not**: Pembatasan sekali per 10 menit menjaga jangkauan riwayat sekitar lima jam kerja.

## Consequences

### Positive
- Renderer yang disusupi tidak dapat membaca atau menimpa berkas lain di komputer.
- Pengguna dapat memulihkan versi lama tanpa menyentuh sistem berkas.

### Negative
- Alur ekspor kini dua langkah (pilih lokasi lalu tulis berkas).

### Risks
- Cadangan memuat logo dan tanda tangan; folder `cadangan/` ikut tersalin bila folder proyek dibagikan.
