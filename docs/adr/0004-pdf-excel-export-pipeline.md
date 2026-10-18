# ADR-0004: Pipeline Ekspor Cetak PDF dan Excel

**Date**: 2026-10-18
**Status**: accepted
**Deciders**: Tim pengembang proyek Jadwal Sekolah

## Context

Sekolah memerlukan hasil fisik berupa lembar beban mengajar guru (lampiran SK Pembagian Tugas) dan matriks jadwal pelajaran resmi yang ditandatangani kepala sekolah. Pada versi lama, layout halaman jadwal dipatok 14 kelas dan 5 hari dengan koordinat piksel ReportLab yang kaku, sehingga rentan teks terpotong saat jumlah kelas/hari berbeda.

## Decision

1. **PDF**: Menggunakan template HTML/CSS cetak presisi tinggi yang di-render langsung oleh Chromium Print to PDF bawaan Electron, dengan layout CSS Flex/Grid proporsional yang otomatis membagi lebar kolom kelas dan hari (mendukung 5 atau 6 hari, dan 3 hingga 36 kelas).
2. **Excel**: Menggunakan pustaka `exceljs` di lingkungan Node.js untuk menghasilkan `.xlsx` dengan border, merge cell, dan pewarnaan sesuai tampilan layar.

## Alternatives Considered

### Alternative 1: Koordinat piksel tetap (pendekatan ReportLab versi lama)
- **Pros**: Kontrol piksel presisi pada kasus tunggal yang sudah dikenal (14 kelas, 5 hari).
- **Cons**: Kaku terhadap variasi jumlah kelas/hari; menyebabkan teks terpotong pada konfigurasi sekolah yang berbeda.
- **Why not**: Bertentangan dengan tujuan produk yang harus fleksibel untuk jenjang dan jumlah kelas apa pun (SD–SMK, 5 atau 6 hari).

## Consequences

### Positive
- Hasil cetak PDF dan Excel selalu konsisten dengan apa yang dilihat di layar (WYSIWYG).
- Tidak ada lagi teks terpotong akibat jumlah kelas yang berbeda.

### Negative
- Bergantung pada mesin Chromium bawaan Electron untuk rendering PDF, menambah kerumitan jika suatu saat perlu ekspor di luar proses Electron (misal CLI/headless).

### Risks
- Perlu pengujian layout pada kasus ekstrem (jumlah kelas minimum/maksimum, 6 hari) untuk memastikan proporsi kolom tetap terbaca di kertas ukuran standar (A4/F4).
