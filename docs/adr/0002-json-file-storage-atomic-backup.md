# ADR-0002: Strategi Penyimpanan — Dokumen Mandiri JSON `.jadwal` dengan Atomic Save & Rotating Backup

**Date**: 2026-10-18
**Status**: accepted
**Deciders**: Tim pengembang proyek Jadwal Sekolah

## Context

Operator sekolah terbiasa bekerja dengan model berkas (seperti `.docx` atau `.xlsx`), di mana satu berkas mewakili satu jadwal semester (misal `jadwal-ganjil-2026.jadwal`). Berkas ini sering dikirim via flashdisk atau email ke rekan kerja atau pengawas.

## Decision

Menggunakan berkas tunggal berformat JSON (`.jadwal`) yang memuat seluruh metadata, kelas, guru, penugasan, matriks jadwal, serta gambar kop dan tanda tangan (Base64). Penulisan menerapkan atomic file write (tulis ke `.tmp` lalu replace atomik) dan rotating backup (hingga 30 snapshot bertanggal di subfolder `cadangan/`).

## Alternatives Considered

### Alternative 1: Database SQLite
- **Pros**: Lebih bertenaga untuk query kompleks.
- **Cons**: Sulit dibuka dan dibagikan secara mandiri oleh operator awam tanpa aplikasi pendamping.
- **Why not**: Bertentangan dengan kebiasaan operator sekolah memindahkan satu berkas jadwal secara mandiri (flashdisk/email), dan menambah kerumitan distribusi tanpa manfaat yang dibutuhkan pada skala data ini.

## Consequences

### Positive
- Pengguna bebas memindahkan file jadwal antar laptop.
- Riwayat pencadangan mencegah kehilangan data akibat salah ketik.
- Berkas mudah dibaca dan diverifikasi (format JSON terbuka).

### Negative
- Tidak ada mekanisme query relasional bawaan; validasi integritas referensial harus diimplementasikan manual di core engine.

### Risks
- Pertumbuhan ukuran berkas akibat aset Base64 (kop/tanda tangan) perlu dipantau agar tidak membebani waktu baca/tulis pada sekolah dengan banyak kelas.
