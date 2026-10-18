import { describe, it, expect } from 'vitest'
import { ProyekData } from '../src/core/types'
import { getPresetStrukturWaktu } from '../src/core/default-presets'
import { periksa, preview } from '../src/core/checker'

describe('NFR Performance Benchmark', () => {
  it('mengeksekusi pengecekan bentrok pada dataset besar (6 hari x 10 jam x 40 kelas) dalam waktu < 35ms (ADR-0007 Toleransi Stres Ekstrim)', () => {
    // Generate dataset sintetis
    const sw = getPresetStrukturWaktu('SMA', 6)
    const kelasList = Array.from({ length: 40 }, (_, i) => ({
      id: `c${i + 1}`,
      nama: `Kelas ${i + 1}`,
      urutan: i + 1
    }))

    const guruList = Array.from({ length: 60 }, (_, i) => ({
      id: `g${i + 1}`,
      nama: `Guru ${i + 1}`,
      tidak_bisa: {
        Senin: i % 5 === 0 ? ['B1'] : []
      }
    }))

    const penugasanList = guruList.map((g, idx) => ({
      id: `a${idx + 1}`,
      guru_id: g.id,
      kode: `${idx + 1}`,
      mapel: `Mapel ${idx + 1}`,
      beban: Object.fromEntries(kelasList.slice(0, 10).map((k) => [k.id, 2]))
    }))

    // Isi jadwal dengan kombinasi padat
    const jadwal: ProyekData['jadwal'] = {}
    const hariKeys = Object.keys(sw.hari)

    for (const h of hariKeys) {
      jadwal[h] = {}
      for (const slot of sw.hari[h].slots) {
        if (slot.tipe !== 'kbm') continue
        jadwal[h][slot.id] = {}
        for (let ki = 0; ki < kelasList.length; ki++) {
          const kid = kelasList[ki].id
          const code = `${((ki + parseInt(slot.id.slice(1) || '1')) % 50) + 1}`
          jadwal[h][slot.id][kid] = [[code], [code]]
        }
      }
    }

    const p: ProyekData = {
      format_version: 2,
      app_version: '2.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      meta: {
        nama_sekolah: 'SMA Benchmark',
        jenjang: 'SMA',
        semester: 'GANJIL',
        tahun_pelajaran: '2026/2027',
        kota_tanggal: 'Jakarta',
        pejabat_ttd: { jabatan: 'Kepsek', nama: 'Admin', nip: '1' }
      },
      struktur_waktu: sw,
      master: {
        kelas: kelasList,
        guru: guruList,
        penugasan: penugasanList
      },
      jadwal
    }

    // Warm up JIT compiler
    for (let w = 0; w < 3; w++) {
      periksa(p)
    }

    // Ukur rata-rata durasi per panggilan (10 iterasi) untuk mengatasi kuantisasi timer Windows 15.6ms
    const ITERATIONS = 10
    const start = performance.now()
    for (let i = 0; i < ITERATIONS; i++) {
      periksa(p)
    }
    const duration = (performance.now() - start) / ITERATIONS
    const hasil = periksa(p)

    console.log(`[Benchmark NFR Ekstrim] Rata-rata evaluasi 6 hari x 10 jam x 40 kelas = ${duration.toFixed(2)} ms, Total Masalah: ${hasil.masalah.length}`)
    // Berdasarkan ADR-0007: Batas toleransi beban stres ekstrim (40 kelas, 2.400 sel) adalah < 35ms
    expect(duration).toBeLessThan(35)
    expect(hasil.masalah.length).toBeGreaterThan(0)
  })

  it('Tier 2 NFR: periksa() pada beban normal sekolah (6 hari x 10 jam x 24 kelas) selesai dalam < 15ms (ADR-0007)', () => {
    const sw = getPresetStrukturWaktu('SMA', 6)
    const kelasList = Array.from({ length: 24 }, (_, i) => ({
      id: `c${i + 1}`,
      nama: `Kelas ${i + 1}`,
      urutan: i + 1
    }))

    const guruList = Array.from({ length: 35 }, (_, i) => ({
      id: `g${i + 1}`,
      nama: `Guru ${i + 1}`,
      tidak_bisa: {
        Senin: i % 5 === 0 ? ['B1'] : []
      }
    }))

    const penugasanList = guruList.map((g, idx) => ({
      id: `a${idx + 1}`,
      guru_id: g.id,
      kode: `${idx + 1}`,
      mapel: `Mapel ${idx + 1}`,
      beban: Object.fromEntries(kelasList.slice(0, 8).map((k) => [k.id, 2]))
    }))

    const jadwal: ProyekData['jadwal'] = {}
    const hariKeys = Object.keys(sw.hari)

    for (const h of hariKeys) {
      jadwal[h] = {}
      for (const slot of sw.hari[h].slots) {
        if (slot.tipe !== 'kbm') continue
        jadwal[h][slot.id] = {}
        for (let ki = 0; ki < kelasList.length; ki++) {
          const kid = kelasList[ki].id
          const code = `${((ki + parseInt(slot.id.slice(1) || '1')) % 30) + 1}`
          jadwal[h][slot.id][kid] = [[code], [code]]
        }
      }
    }

    const p: ProyekData = {
      format_version: 2,
      app_version: '2.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      meta: {
        nama_sekolah: 'SMA Normal 24 Rombel',
        jenjang: 'SMA',
        semester: 'GANJIL',
        tahun_pelajaran: '2026/2027',
        kota_tanggal: 'Jakarta',
        pejabat_ttd: { jabatan: 'Kepsek', nama: 'Admin', nip: '1' }
      },
      struktur_waktu: sw,
      master: {
        kelas: kelasList,
        guru: guruList,
        penugasan: penugasanList
      },
      jadwal
    }

    // Warm up
    for (let w = 0; w < 3; w++) periksa(p)

    const ITERATIONS = 10
    const start = performance.now()
    for (let i = 0; i < ITERATIONS; i++) {
      periksa(p)
    }
    const duration = (performance.now() - start) / ITERATIONS
    console.log(`[Benchmark NFR Normal] Rata-rata evaluasi 24 kelas = ${duration.toFixed(2)} ms`)
    expect(duration).toBeLessThan(15) // ADR-0007 Target beban normal sekolah < 15ms
  })

  it('Tier 1 NFR: preview() untuk validasi instan saat mengetik selesai dalam < 5ms (ADR-0007)', () => {
    const sw = getPresetStrukturWaktu('SMA', 6)
    const p: ProyekData = {
      format_version: 2,
      app_version: '2.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      meta: {
        nama_sekolah: 'SMA Test',
        jenjang: 'SMA',
        semester: 'GANJIL',
        tahun_pelajaran: '2026/2027',
        kota_tanggal: 'Jakarta',
        pejabat_ttd: { jabatan: 'Kepsek', nama: 'Admin', nip: '1' }
      },
      struktur_waktu: sw,
      master: {
        kelas: [{ id: 'c1', nama: '10A', urutan: 1 }, { id: 'c2', nama: '10B', urutan: 2 }],
        guru: [
          { id: 'g1', nama: 'Guru 1', tidak_bisa: { Senin: ['B1'] } },
          { id: 'g2', nama: 'Guru 2', tidak_bisa: {} }
        ],
        penugasan: [
          { id: 'a1', guru_id: 'g1', kode: '1', mapel: 'Matematika', beban: { c1: 2 } },
          { id: 'a2', guru_id: 'g2', kode: '2', mapel: 'Fisika', beban: { c2: 2 } }
        ]
      },
      jadwal: {
        Senin: {
          B1: {
            c1: [['1'], ['1']]
          }
        }
      }
    }

    const ITERATIONS = 100
    const start = performance.now()
    for (let i = 0; i < ITERATIONS; i++) {
      preview(p, 'Senin', 'B1', 'c2', [['1'], ['1']])
    }
    const duration = (performance.now() - start) / ITERATIONS

    console.log(`[Benchmark NFR Tier 1] Rata-rata preview() per keystroke = ${duration.toFixed(3)} ms`)
    expect(duration).toBeLessThan(5) // ADR-0007 Tier 1 target < 5ms (riil < 0.2ms)
  })
})
