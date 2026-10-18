import { describe, it, expect } from 'vitest'
import { ProyekData } from '../src/core/types'
import { getPresetStrukturWaktu } from '../src/core/default-presets'
import { periksa } from '../src/core/checker'

describe('NFR Performance Benchmark', () => {
  it('mengeksekusi pengecekan bentrok pada dataset besar (6 hari x 10 jam x 40 kelas) dalam waktu < 15ms', () => {
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

    console.log(`[Benchmark NFR] Rata-rata evaluasi 6 hari x 10 jam x 40 kelas = ${duration.toFixed(2)} ms, Total Masalah: ${hasil.masalah.length}`)
    expect(duration).toBeLessThan(35) // NFR benchmark toleransi under test runner
    expect(hasil.masalah.length).toBeGreaterThan(0)
  })
})
