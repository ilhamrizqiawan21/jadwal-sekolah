# Jadwal Sekolah

Aplikasi desktop Windows untuk menyusun jadwal pelajaran sekolah. Semua data tersimpan di komputer, tanpa akun dan tanpa koneksi internet.

## Fitur

- Kisi jadwal dengan navigasi keyboard penuh, saran kode saat mengetik, dan pewarnaan sel per mata pelajaran.
- Deteksi bentrok seketika: guru ganda, jam berhalangan, kode tidak dikenal, dan selisih JP terhadap beban.
- Team teaching, split JP, dan struktur jam yang dapat diatur untuk SD, SMP, SMA/SMK, serta pola 5 atau 6 hari.
- Data master guru (termasuk ketersediaan jam), kelas, dan beban mengajar.
- Ekspor PDF resmi (A4 lanskap) dan Excel, lengkap dengan kop surat dan blok pengesahan.
- Undo dan redo hingga 50 langkah.
- Simpan otomatis, cadangan bergilir, cadangan manual, pemulihan versi lama, dan draf pemulihan setelah penutupan tidak wajar.
- Tema terang dan gelap, tata letak responsif.

## Pintasan

| Pintasan | Fungsi |
| --- | --- |
| `Ctrl+S` / `Ctrl+Shift+S` | Simpan / Simpan sebagai |
| `Ctrl+O` | Buka berkas |
| `Ctrl+E` | Pratinjau cetak dan ekspor |
| `Ctrl+B` | Ciutkan atau buka menu samping |
| `Ctrl+I` | Tampilkan atau sembunyikan panel pemeriksaan |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Alt+1` sampai `Alt+7` | Fokus ke semua hari atau ke satu hari |

## Pengembangan

Prasyarat: Node.js 20 atau lebih baru.

```bash
npm install
npm run dev          # mode pengembangan dengan hot reload
npm test             # unit test (Vitest)
npm run typecheck    # pemeriksaan tipe
npm run build        # membangun bundle main, preload, dan renderer
npm run build:win    # membangun installer NSIS dan versi portable (jalankan di Windows)
```

Keluaran installer ada di folder `release/`.

## Struktur

```
src/core/       logika domain murni (checker, parser sel, validator, data contoh)
src/main/       proses utama Electron: penyimpanan, cadangan, ekspor, IPC
src/preload/    jembatan IPC bertipe ke renderer
src/renderer/   antarmuka Vue 3 + Pinia + Tailwind CSS
tests/          unit test
docs/           PRD, ERD, desain, dan catatan keputusan arsitektur
```

## Cadangan dan pemulihan

- Setiap penyimpanan manual menyalin versi sebelumnya ke folder `cadangan/` di samping berkas `.jadwal` (maksimal 30 versi otomatis).
- Simpan otomatis membuat cadangan paling sering sekali per 10 menit.
- Halaman **Cadangan** menampilkan riwayat, membuat cadangan manual yang tidak ikut terhapus oleh rotasi, dan memulihkan versi lama. Pemulihan dapat dibatalkan dengan Undo.
- Proyek yang belum pernah disimpan ditulis ke draf pemulihan setiap 60 detik dan ditawarkan kembali saat aplikasi dibuka.

## Keamanan dan privasi

- Aplikasi tidak melakukan koneksi jaringan (diuji di `tests/offline-audit.test.ts`).
- Jendela berjalan dengan `sandbox`, `contextIsolation`, dan CSP ketat. Renderer hanya dapat mengakses berkas yang dipilih pengguna lewat dialog sistem.
- Berkas `.jadwal` divalidasi sebelum dibuka. Berkas jadwal, cadangan, dan ekspor tidak ikut ke Git (lihat `.gitignore`).
- Berkas `.jadwal` dan cadangannya memuat logo serta tanda tangan yang Anda unggah. Perlakukan sebagai data sekolah.

Panduan kontribusi ada di [CONTRIBUTING.md](CONTRIBUTING.md).
