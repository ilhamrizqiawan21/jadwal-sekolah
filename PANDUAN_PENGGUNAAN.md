# Jadwal Pendidikan

Aplikasi desktop Windows untuk menyusun jadwal pembelajaran, mengatur guru, rombongan belajar, sesi KBM, beban mengajar, serta mencetak atau mengekspor dokumen jadwal.

## Instalasi

1. Jalankan berkas `Jadwal Pendidikan Setup 1.0.0.exe`.
2. Ikuti langkah pemasangan.
3. Pilih lokasi pemasangan jika diperlukan.
4. Setelah selesai, buka aplikasi melalui pintasan Desktop atau Start Menu.

Windows mungkin menampilkan peringatan SmartScreen karena aplikasi belum ditandatangani dengan sertifikat penerbit. Pilih **Info selengkapnya**, lalu **Tetap jalankan** hanya jika berkas diperoleh dari sumber rilis yang dipercaya.

### Versi portable

Berkas `Jadwal Pendidikan 1.0.0.exe` dapat dijalankan tanpa instalasi. Simpan berkas tersebut di folder yang mudah ditemukan. Data proyek tetap disimpan ke lokasi yang dipilih operator.

## Memulai proyek baru

1. Buka aplikasi.
2. Pilih **Baru**.
3. Isi identitas lembaga, jenjang, tahun pelajaran, dan semester.
4. Tentukan pola hari belajar.
5. Pilih pola waktu yang tersedia atau gunakan pilihan **Kustom**.
6. Selesaikan penyiapan, lalu lengkapi data master.

## Urutan pengisian data

Gunakan urutan berikut agar penyusunan jadwal berjalan lancar:

1. **Pengaturan** — identitas lembaga, logo, kop dokumen, dan pengesahan.
2. **Sesi KBM** — jam mulai, durasi 1 JP, jumlah JP setiap sesi, dan waktu istirahat.
3. **Guru & Izin** — daftar guru, kode guru, dan waktu guru tidak dapat mengajar.
4. **Data Kelas** — rombongan belajar, tingkat, wali kelas, dan urutan kolom.
5. **Beban Mengajar** — kode mata pelajaran, guru pengampu, team teaching, dan target JP per kelas.
6. **Jadwal KBM** — isi kode mata pelajaran pada sel jadwal.

## Mengatur sesi KBM

Menu **Sesi KBM** dibuat terpisah karena setiap lembaga dapat memiliki pola waktu yang berbeda.

- **Durasi 1 JP** menentukan panjang satu jam pelajaran.
- Sesi KBM dapat diatur menjadi 1 JP atau 2 JP.
- Waktu selesai sesi KBM mengikuti durasi dan jumlah JP yang dipilih.
- Gunakan **Tambah Istirahat** untuk waktu jeda.
- Gunakan **Salin ke hari lain** jika susunan waktu beberapa hari sama.
- Perbaiki pesan berwarna merah sebelum menekan **Simpan Sesi KBM**.

## Mengisi jadwal

- Pilih sel pada kisi jadwal.
- Tekan **Enter** atau klik dua kali untuk mulai mengisi.
- Masukkan kode mata pelajaran, misalnya `MAT` atau `BIN`.
- Saran kode akan muncul saat mengetik.
- Gunakan panel **Pemeriksaan** untuk melihat bentrok guru, jam berhalangan, kode yang tidak dikenal, atau alokasi yang belum lengkap.
- Panel **Daftar Kode** membantu mencari kode berdasarkan mapel atau guru.

## Menyimpan proyek

- Tekan **Simpan** di bagian atas atau gunakan `Ctrl + S`.
- Proyek disimpan sebagai berkas `.jadwal`.
- Gunakan **Simpan Salinan Baru** untuk membuat salinan dengan nama atau lokasi lain.
- Aplikasi menyimpan data secara lokal di komputer dan tidak memerlukan koneksi internet.
- Saat berkas proyek sudah tersimpan, aplikasi membuat cadangan bergilir untuk membantu pemulihan data.

## Mencetak dan mengekspor

1. Buka menu **Cetak & Ekspor**.
2. Pilih **Matriks Jadwal Pelajaran** atau **Lampiran Beban Mengajar**.
3. Periksa kop lembaga, isi tabel, kode guru, tanda tangan, dan halaman dokumen.
4. Pilih **Simpan PDF (A4)** atau **Ekspor Excel (.xlsx)**.

## Data demonstrasi

Menu **Pengaturan** menyediakan **Data Demonstrasi** untuk melihat alur aplikasi secara lengkap. Data ini menggantikan proyek yang sedang terbuka, sehingga simpan proyek terlebih dahulu jika masih diperlukan.

## Tombol penting

| Tombol | Fungsi |
| --- | --- |
| **Buka** | Membuka berkas proyek `.jadwal` |
| **Baru** | Membuat proyek baru |
| **Refresh** | Memuat ulang tampilan tanpa menutup aplikasi |
| **Bentrok** | Membuka ringkasan masalah jadwal |
| **Simpan** | Menyimpan perubahan proyek |
| **Undo / Redo** | Membatalkan atau mengulangi perubahan jadwal |

## Jika terjadi masalah

- Pastikan target JP pada **Beban Mengajar** sesuai dengan jumlah JP di kisi jadwal.
- Pastikan setiap kode pada kisi sudah dibuat pada menu **Beban Mengajar**.
- Periksa izin guru jika muncul bentrok ketersediaan.
- Jika tampilan tidak memperbarui setelah perubahan, gunakan tombol **Refresh**.
- Jika proyek tidak dapat dibuka, gunakan salinan cadangan atau buka berkas `.jadwal` lain melalui tombol **Buka**.

## Berbagi aplikasi

Untuk membagikan aplikasi, sertakan:

- `Jadwal Pendidikan Setup 1.0.0.exe` untuk pemasangan biasa.
- `Jadwal Pendidikan 1.0.0.exe` untuk versi portable.
- Berkas `PANDUAN_PENGGUNAAN.md` ini sebagai panduan operator.

Jangan membagikan folder `node_modules`, `src`, atau folder kerja pengembangan kepada operator akhir.
