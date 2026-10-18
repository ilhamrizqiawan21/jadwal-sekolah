# ADR-0003: Isolasi Core Domain Engine (TypeScript Murni Tanpa Ketergantungan UI)

**Date**: 2026-10-18
**Status**: accepted
**Deciders**: Tim pengembang proyek Jadwal Sekolah

## Context

Logika penjadwalan (deteksi bentrok guru, batas jam berhalangan, kuota beban mengajar, dan team teaching) adalah aset paling krusial dari aplikasi. Menggabungkan logika ini ke dalam komponen Vue atau lifecycle Electron akan mempersulit pengujian dan membuat kode rentan regresi saat UI dirombak.

## Decision

Memisahkan seluruh logika penjadwalan ke dalam direktori `src/core/` sebagai TypeScript murni: tidak mengimpor modul Electron, Vue, Pinia, atau DOM window; seluruh fungsi bersifat pure function yang menerima model data dan mengembalikan objek daftar masalah (`HasilPemeriksaan`); wajib diuji dengan unit test (Vitest) secara independen.

## Alternatives Considered

### Alternative 1: Logika bentrok ditulis langsung di dalam Pinia store / komponen Vue
- **Pros**: Lebih sedikit lapisan abstraksi di awal, iterasi fitur UI terasa lebih cepat.
- **Cons**: Logika anti-bentrok tercampur dengan reactivity Vue, sulit diuji tanpa merender komponen, rentan regresi saat UI dirombak.
- **Why not**: Mesin deteksi bentrok adalah aset terpenting aplikasi (lihat `AI_RULES.md`) dan harus dapat diverifikasi benar secara matematis secara independen dari UI.

## Consequences

### Positive
- Eksekusi pengujian berjalan dalam hitungan milidetik tanpa menjalankan antarmuka grafis Electron.
- Logika anti-bentrok terbukti benar secara matematis sebelum UI dibangun.
- Arsitektur bersih dan mudah dimodifikasi di masa depan (UI dapat dirombak tanpa menyentuh core).

### Negative
- Menambah disiplin lapisan (boundary) yang harus dijaga tim — setiap perubahan fitur perlu dipikirkan letaknya (core vs UI) sejak awal.

### Risks
- Risiko pelanggaran batas lapisan (misalnya import Vue/Electron tersusup ke `src/core/`) perlu dicegah dengan lint rule atau review checklist, karena tidak otomatis dicegah oleh TypeScript semata.
