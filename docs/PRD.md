# Product Requirements Document (PRD)
## Proyek: Jadwal Sekolah (Native Windows Desktop Application)

* **Versi Dokumen:** 1.0.0
* **Status:** Disetujui (Approved)
* **Target Rilis:** 2026
* **Platform:** Windows 10 & 11 (Desktop Offline, Native Look & Feel)
* **Teknologi Utama:** Electron, TypeScript, Vite, Vue 3 / Tailwind CSS

---

## 1. Pendahuluan & Latar Belakang

### 1.1 Latar Belakang
Penyusunan jadwal pelajaran di sekolah merupakan salah satu tugas paling rumit yang dihadapi wakil kepala bidang kurikulum dan operator sekolah setiap awal semester. Tantangan utamanya mencakup:
* Menghindari bentrok jadwal guru (satu guru mengajar di dua kelas berbeda pada jam yang sama).
* Memenuhi batasan jam berhalangan guru (*availability constraint*, misal guru honorer yang hanya bisa mengajar hari tertentu).
* Memastikan distribusi beban jam pelajaran (JP) sesuai kurikulum nasional/sekolah.
* Mengakomodasi kebutuhan spesifik berbagai jenjang (SD, SMP, SMA, SMK) dengan variasi hari efektif (5 hari kerja vs 6 hari kerja) dan durasi JP yang berbeda (35, 40, atau 45 menit).

Aplikasi pendahulu (`jadwal-mts`) membuktikan efektivitas mesin validasi jadwal anti-bentrok, namun masih memiliki keterbatasan:
1. Struktur jadwal, hari, dan format cetak terikat (*hardcoded*) pada kebutuhan satu madrasah tertentu.
2. Tampilan berbasis Tkinter terasa usang dan tidak memenuhi standar estetika perangkat lunak desktop modern tahun 2026.

### 1.2 Tujuan Produk
Membangun aplikasi desktop Windows mandiri (**Jadwal Sekolah**) yang:
1. **Bersifat Global & Fleksibel**: Dapat digunakan oleh jenjang sekolah mana saja (SD/MI, SMP/MTs, SMA/MA, SMK) baik sekolah 5 hari maupun 6 hari kerja.
2. **Offline-First & Mandiri**: Berjalan 100% lokal di komputer operator sekolah tanpa perlu koneksi internet atau server database eksternal.
3. **Modern & Responsif (Standar 2026)**: Menghadirkan UI bertaraf modern (*Fluent Design*, tema terang/gelap, keyboard-friendly mirip spreadsheet, animasi mikro halus).
4. **Mempertahankan Inti Logika Terbaik**: Validasi bentrok instan saat mengetik, jam berhalangan, beban mengajar, tim pengajar (*team teaching*), riwayat undo/redo, dan pencadangan otomatis bergilir.

---

## 2. Pengguna Sasaran (User Persona)

| Persona | Peran | Kebutuhan Utama |
| :--- | :--- | :--- |
| **Operator Sekolah / Tim Kurikulum** | Pengguna Utama | Menyusun jadwal dengan cepat tanpa bentrok, mengatur ketersediaan guru, melihat sisa JP yang belum terplot, dan mencetak dokumen resmi siap tanda tangan. |
| **Kepala Sekolah** | Pengesah / Reviewer | Menerima laporan cetak PDF/Excel beban mengajar dan matriks jadwal yang rapi, standar, dan bebas bentrok. |

---

## 3. Fitur Utama & Ruang Lingkup

### 3.1 Wizard Konfigurasi Sekolah Baru (New School Onboarding)
Alur panduan interaktif saat membuat proyek jadwal baru:
* **Langkah 1 (Profil Sekolah)**: Nama sekolah, jenjang (SD, SMP, SMA, SMK, atau lainnya), tahun pelajaran, semester (Ganjil/Genap), kota, nama kepala sekolah, NIP, serta unggah logo/kop & tanda tangan.
* **Langkah 2 (Pola Hari Belajar)**: Pilihan 5 hari kerja (Senin–Jumat) atau 6 hari kerja (Senin–Sabtu).
* **Langkah 3 (Struktur Jam & KBM)**:
  * Pilihan preset standar sesuai jenjang (durasi JP: 35 menit untuk SD, 40 menit untuk SMP, 45 menit untuk SMA/SMK).
  * Penentuan jam mulai KBM, slot jam per hari, dan penempatan jeda istirahat / upacara / ibadah.
  * Dukungan fleksibel untuk mapel 1 JP, 2 JP, 3 JP, maupun 4 JP (bukan kaku kelipatan 2 JP).

### 3.2 Manajemen Master Data
* **Data Guru**:
  * ID guru unik, Nama lengkap + gelar, NIP/NUPTK, Jabatan/Catatan, Warna penanda.
  * **Matriks Ketersediaan (*Availability Matrix*)**: Antarmuka klik visual hari x jam untuk menandai jam guru berhalangan mengajar.
* **Data Kelas**:
  * Nama rombel/kelas (misal: 7A, X-RPL 1, XII IPA 2), Tingkat/Grade, Wali kelas terpilih, rekapitulasi total JP terplot.
  * Urutan kelas dapat digeser (naik/turun/kiri/kanan).
* **Data Mata Pelajaran & Beban Mengajar (Penugasan)**:
  * Pengelompokan mapel (Wajib, Peminatan, Muatan Lokal).
  * Pembuatan kode unik guru/mapel (misal `1`, `2A`, `2B`, `BIO-1`).
  * Matriks distribusi JP: Menentukan berapa JP guru tersebut mengajar di masing-masing kelas.
  * Dukungan *Team Teaching* (satu kode diampu oleh >1 guru, kapasitas kelas disesuaikan otomatis).

### 3.3 Kisi Jadwal Interaktif (Interactive Schedule Grid)
* Tampilan matriks: Baris = Jam/Slot Pelajaran per Hari; Kolom = Daftar Kelas.
* **Pengalaman Mengetik Cepat**: Operator dapat langsung mengetik kode guru/mapel di sel, menavigasi dengan tombol panah keyboard (`Enter`, `Tab`, `Panah`), dan memisahkan JP parsial dengan pemisah `|`.
* **Visualisasi Anti-Bentrok Real-time**:
  * Pengecekan instan setiap perubahan sel: sel bentrok ditandai merah mencolok.
  * Pop-up peringatan instan (*toast/alert*) yang hilang otomatis dan tidak memblokir ketikan.
  * Panel samping (*Sidebar Inspector*): Menampilkan rincian masalah yang dikelompokkan (*Error*, *Warning*, *Info/Belum Lengkap*). Mengklik masalah langsung melompat (*jump to cell*) ke posisi sel terkait.
  * Tab daftar kode guru dengan filter pencarian cepat dan indikator sisa JP yang belum terplot.

### 3.4 Penyimpanan & Keamanan Data (Persistence & Backup)
* Format file proyek berbasis `.jadwal` (standar JSON terstruktur).
* **Auto-Save & Safe Atomic Write**: Penyimpanan otomatis ke disk setiap 60 detik tanpa membuat UI lag, menggunakan file temporary sebelum mengganti file asli untuk mencegah file korup saat listrik padam.
* **Pencadangan Bergilir (Rotating Backup)**: Otomatis menyimpan hingga 30 versi snapshot terakhir di folder subdirektori `cadangan/`.
* **Undo / Redo Tak Terbatas**: Dukungan riwayat perubahan (*Command Pattern*) minimal 50 langkah untuk semua aksi di grid jadwal maupun master data.

### 3.5 Ekspor Dokumen Resmi (Adaptif)
* **Ekspor PDF Siap Cetak**:
  * Halaman 1: Dokumen Rekapitulasi Daftar Beban Mengajar Guru (Lengkap dengan kop sekolah dan lembar pengesahan tanda tangan).
  * Halaman 2: Matriks Jadwal Pelajaran Utama, tata letak otomatis proporsional menyesuaikan jumlah hari (5 atau 6 hari) dan jumlah kelas tanpa teks terpotong.
* **Ekspor Microsoft Excel (`.xlsx`)**:
  * Dua sheet dengan format, border, warna sel, dan penataan kolom yang persis sama dengan dokumen cetak.

---

## 4. Persyaratan Non-Fungsional (NFR)

1. **Performa**:
   * *Startup time*: Aplikasi siap dipakai dalam waktu < 2 detik di Windows 10/11 standar.
   * *Latency validasi bentrok*: < 15 milidetik untuk evaluasi seluruh sel jadwal (6 hari x 10 jam x 40 kelas).
2. **Kemandirian (Zero-Configuration)**:
   * Tidak membutuhkan instalasi server eksternal (Apache/MySQL/Node runtime di PC pengguna).
   * Dikemas dalam bentuk satu paket installer Windows (`.exe`) dan versi *portable*.
3. **Keandalan Data (Data Integrity)**:
   * Nol toleransi terhadap korupsi berkas berkat *atomic save*.
   * Validasi skema berkas dengan versioning format (`format_version`).
4. **Aksesibilitas & UX**:
   * Desain responsif terhadap resolusi layar laptop sekolah (mulai dari 1366x768 hingga 4K) dengan fitur Zoom / Fit to Window.
