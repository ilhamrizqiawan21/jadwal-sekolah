# ADR-0001: Platform Native Windows Desktop Berbasis Electron

**Date**: 2026-10-18
**Status**: accepted
**Deciders**: Tim pengembang proyek Jadwal Sekolah

## Context

Aplikasi jadwal ditujukan sebagai alat kerja operasional harian bagi operator sekolah di berbagai daerah Indonesia. Sebagian sekolah memiliki koneksi internet yang tidak stabil atau kebijakan data lokal, sehingga sistem berbasis web online/SaaS kurang ideal. Aplikasi pendahulu (`jadwal-mts`, Python Tkinter) terbukti efektif pada mesin anti-bentrok, namun tampilannya usang dan tidak memenuhi ekspektasi UI desktop 2026.

## Decision

Mengembangkan aplikasi sebagai Aplikasi Desktop Windows Mandiri (Offline) menggunakan Electron + Vite + Vue 3 / Tailwind CSS.

## Alternatives Considered

### Alternative 1: Python Tkinter
- **Pros**: Sangat ringan.
- **Cons**: Estetika UI usang; sangat sulit membangun tabel jadwal interaktif, animasi halus, dan responsif.
- **Why not**: Tidak memenuhi ekspektasi antarmuka desktop modern tahun 2026.

### Alternative 2: Web SaaS (Laravel/Cloud)
- **Pros**: Tidak dirinci dalam diskusi keputusan asli.
- **Cons**: Menuntut koneksi internet terus-menerus, biaya server bulanan, isu privasi data internal sekolah.
- **Why not**: Bertentangan dengan kebutuhan offline-first dan privasi data sekolah.

### Alternative 3: Tauri (Rust + Web)
- **Pros**: Ukuran installer sangat kecil.
- **Cons**: Membutuhkan dependensi toolchain kompilasi Rust/C++ yang lebih rumit dibandingkan ekosistem Node.js yang sudah tersedia di mesin pengembang.
- **Why not**: Kompleksitas toolchain tidak sepadan dengan penghematan ukuran installer untuk tim yang sudah mahir di ekosistem Node.js.

## Consequences

### Positive
- Tampilan UI modern setara aplikasi 2026 (gaya VS Code/Notion).
- Dukungan rendering tabel fleksibel via CSS/DOM.
- Ekosistem packaging Windows yang matang (`electron-builder`).
- 100% berjalan offline.

### Negative
- Ukuran berkas aplikasi (`.exe`) berkisar ~70-80 MB.
- Penggunaan RAM sekitar ~100 MB dibanding aplikasi native tradisional yang lebih ringan.

### Risks
- Konsumsi resource perlu dipantau pada laptop sekolah berspesifikasi rendah, meski dinilai aman untuk standar PC Windows modern.
