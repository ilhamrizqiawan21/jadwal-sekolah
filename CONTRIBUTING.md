# Panduan Kontribusi

Panduan ini menjelaskan aturan kerja dan arsitektur yang wajib dijaga saat mengubah kode di repositori `jadwal-sekolah`.

## 1. Prinsip kerja

1. Komunikasi, komentar, dan teks antarmuka memakai Bahasa Indonesia yang lugas. Nama simbol kode dan pesan commit memakai bahasa Inggris standar.
2. Laporkan hasil apa adanya. Bila tes gagal, tulis gagal; jangan mengarang versi dependensi atau hasil pengujian.
3. Batasi perubahan pada cakupan tugas. Pahami dampaknya terhadap alur jadwal sebelum mengubah kode.

## 2. Integritas domain penjadwalan

1. **Deteksi bentrok.** Mesin pemeriksa di [`src/core/checker.ts`](src/core/checker.ts) adalah bagian terpenting aplikasi. Jangan ubah tanpa menjalankan seluruh unit test. Aturan bakunya:
   * Satu guru tidak boleh berada di lebih dari satu kelas pada hari dan slot yang sama.
   * Kode team teaching memiliki kapasitas sebanyak guru pemegangnya. Bentrok terjadi bila jumlah kelas unik melebihi kapasitas itu.
   * Kode yang ditempatkan pada slot `tidak_bisa` milik guru memicu galat tingkat kritis.
   * Selisih JP lebih dari target memicu galat; selisih kurang berstatus informasi.
2. **Pemisahan lapisan.** Modul di `src/core/` tidak boleh mengimpor Vue, Pinia, atau Electron. Seluruhnya berupa fungsi murni yang deterministik dan mudah diuji. Aturan ini diuji otomatis di `tests/guard-rail.test.ts`.
3. **Penyimpanan aman.**
   * Setiap penyimpanan `.jadwal` memakai pola tulis ke berkas sementara, `fsync`, lalu rename.
   * Cadangan bergilir (maksimal 30 otomatis, 100 manual) disimpan di folder `cadangan/` di samping berkas proyek.
   * Berkas yang dimuat selalu divalidasi oleh `src/core/project-validator.ts` sebelum dipakai.

## 3. Pengujian

1. Fitur baru atau perbaikan bug pada logika inti dimulai dari tes yang gagal di `tests/`.
2. Implementasikan sampai seluruh tes lulus.
3. Jangan mengubah atau menghapus tes hanya agar lulus, kecuali kebutuhan bisnisnya memang berubah.
4. Sebelum mengirim perubahan jalankan `npm test`, `npm run typecheck`, dan `npm run build`.

## 4. Standar antarmuka desktop

1. **Keyboard dulu.** Kisi jadwal mendukung panah, `Tab`, `Enter`, `Delete`, `Ctrl+Z`, `Ctrl+Y`, `Ctrl+C`, dan `Ctrl+V` tanpa mouse.
2. **Responsif.** Validasi bentrok berjalan saat mengetik (di bawah 15 ms). Notifikasi berupa toast yang hilang sendiri dan tidak mengambil fokus dari sel yang sedang diedit.
3. **Jelas secara visual.** Sel bermasalah memakai penanda merah dengan kontras yang cukup. Panel masalah menyediakan lompat ke sel dengan satu klik.
4. **Aksesibel.** Dialog memakai `role="dialog"`, fokus terkunci di dalamnya, dan `Esc` menutupnya. Animasi menghormati `prefers-reduced-motion`.
5. Hindari `alert()` dan `confirm()` bawaan browser; gunakan `useNotifyStore` (toast dan dialog konfirmasi).

## 5. Keamanan dan privasi data

1. Jangan menaruh rahasia (token, kunci API) di kode atau berkas proyek.
2. Jangan memasukkan data sekolah yang nyata (nama sekolah, guru, pejabat, NIP, logo, tanda tangan) ke repositori, termasuk ke data contoh atau tes. Gunakan data fiktif seperti di `src/core/sample-data.ts`.
3. Renderer tidak boleh menentukan jalur berkas sendiri. Semua jalur harus berasal dari dialog sistem dan dicatat di `src/main/file-access.ts`.
4. Jendela memakai `sandbox`, `contextIsolation`, dan CSP ketat. Jangan melonggarkannya tanpa alasan tertulis di ADR.
5. Jangan menjalankan perintah destruktif (`git reset --hard`, `git clean`, menghapus folder) tanpa persetujuan pemilik repositori.
6. Periksa kompatibilitas Windows: separator jalur dan URL `file:///`.

## 6. Keputusan arsitektur

Keputusan yang mengubah arsitektur dicatat sebagai ADR di [`docs/adr/`](docs/adr/) memakai [`template.md`](docs/adr/template.md) sebelum implementasi.
