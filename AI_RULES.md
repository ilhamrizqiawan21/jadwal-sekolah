# AI Development & Architecture Rules (`AI_RULES.md`)
## Proyek: Jadwal Sekolah (Windows Desktop)

Dokumen ini berisi aturan wajib bagi agen AI (Antigravity / Gemini) dan pengembang dalam memodifikasi, memperluas, dan mengelola kode di repositori `jadwal-sekolah`.

---

## 1. Prinsip Utama & Karakter Kerja
1. **Bahasa Komunikasi**: Gunakan **Bahasa Indonesia** yang lugas, terstruktur, dan langsung ke inti. Istilah teknis, simbol kode, dan pesan commit tetap dalam bahasa Inggris standar.
2. **Kejujuran & Berbasis Fakta**:
   * Jangan mengarang path, versi dependensi, atau hasil pengujian. Jika tes gagal, laporkan gagal.
   * Bedakan fakta yang sudah diuji/dijalankan langsung dari hal yang baru berupa dugaan atau asumsi.
3. **Cakupan Terisolasi (Minimal Blast Radius)**:
   * Jangan merombak kode di luar cakupan tugas yang diminta pengguna.
   * Sebelum mengubah kode, pastikan memahami dampaknya terhadap alur jadwal secara keseluruhan.

---

## 2. Aturan Khusus Domain Penjadwalan (Core Scheduling Integrity)

1. **Integritas Deteksi Bentrok**:
   * Mesin pemeriksa bentrok ([`src/core/checker.ts`](file:///C:/laragon/www/jadwal-sekolah/src/core/checker.ts)) adalah aset terpenting. Logika ini tidak boleh diubah tanpa menjalankan unit test.
   * Aturan bentrok baku:
     * Guru yang sama tidak boleh berada di lebih dari satu kelas pada hari dan slot waktu yang sama.
     * Kode tim pengajar (*team teaching* / kode bersama) memiliki kapasitas sesuai jumlah guru pemegangnya. Bentrok baru terjadi jika kelas unik melebihi jumlah pemegang kode.
     * Penempatan kode pada slot yang terdaftar di `tidak_bisa` guru wajib memicu error tingkat kritis.
     * Kuota beban JP per kelas harus dihitung secara akurat; selisih lebih memicu error, selisih kurang berstatus informasi.
2. **Pemisahan Lapisan (Core vs UI)**:
   * Modul dalam `src/core/` **TIDAK BOLEH** mengimpor modul Vue, Pinia, atau Electron API. Seluruh fungsi core harus berupa *pure functions* yang deterministik dan mudah di-test.
3. **Penyimpanan Aman (Safe Atomic File IO)**:
   * Setiap penyimpanan berkas `.jadwal` wajib melalui mekanisme *write-to-temporary then replace* untuk mencegah file korup jika terjadi pemutusan daya listrik mendadak.
   * Mekanisme pencadangan bergilir (*rotating backup*) hingga 30 snapshot di folder `cadangan/` wajib dipertahankan.

---

## 3. Disiplin Pengujian (TDD Workflow)

1. Setiap fitur baru atau perbaikan bug pada logika penjadwalan harus dimulai dengan membuat pengujian yang gagal terlebih dahulu (*failing test*) di direktori `tests/`.
2. Implementasikan kode hingga seluruh tes lulus hijau (*green*).
3. Jangan pernah mengubah atau menghapus pengujian hanya agar kode terlihat lulus, kecuali spesifikasi kebutuhan bisnisnya memang berubah secara resmi dengan persetujuan pengguna.

---

## 4. Standar UI/UX Desktop (Windows 2026 Edition)

1. **Keyboard-First Experience**:
   * Operator sekolah bekerja dengan kecepatan tinggi. Kisi jadwal harus mendukung navigasi panah, `Tab`, `Enter`, `Delete`, `Ctrl+Z`, `Ctrl+Y`, `Ctrl+C`, dan `Ctrl+V` tanpa memerlukan mouse setiap saat.
2. **Responsivitas Realtime**:
   * Validasi bentrok wajib dieksekusi saat operator mengetik di sel (secara instan tanpa jeda terasa / < 15ms).
   * Notifikasi bentrok baru menggunakan *toast* mengambang yang hilang otomatis dan tidak mencuri fokus ketikan keyboard.
3. **Kejelasan Visual**:
   * Sel yang bentrok wajib diberi penanda visual tegas (warna merah semantik dengan kontras yang baik).
   * Panel samping masalah harus menyediakan fungsi *jump to cell* sekali klik.

---

## 5. Keamanan & Kehati-hatian Sistem
1. Jangan pernah menulis rahasia (token, kunci API) ke dalam kode atau berkas proyek.
2. Jangan menjalankan perintah berbahaya (`git reset --hard`, `git clean`, penghapusan folder) tanpa persetujuan eksplisit dari pengguna.
3. Selalu periksa kompatibilitas Windows (sintaks PowerShell, separator path `\` atau normalisasi URL `file:///`).
