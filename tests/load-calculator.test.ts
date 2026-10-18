import { describe, it, expect } from 'vitest'
import { ProyekData } from '../src/core/types'
import { hitungBeban } from '../src/core/load-calculator'

function createMiniProyek(): ProyekData {
  return {
    format_version: 2,
    app_version: '2.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    meta: {
      nama_sekolah: 'SMP Test',
      jenjang: 'SMP',
      semester: 'GANJIL',
      tahun_pelajaran: '2026/2027',
      kota_tanggal: 'Jakarta, 14 Juli 2026',
      pejabat_ttd: { jabatan: 'Kepala Sekolah', nama: 'Budi', nip: '123' }
    },
    struktur_waktu: {
      pola_hari: 5,
      durasi_jp_menit: 40,
      hari: {
        Senin: {
          aktif: true,
          judul: 'SENIN',
          slots: [
            { id: 'B1', tipe: 'kbm', label: '', waktu: ['07.00-07.40', '07.40-08.20'], jp: [1, 2] },
            { id: 'B2', tipe: 'kbm', label: '', waktu: ['08.20-09.00', '09.00-09.40'], jp: [3, 4] }
          ]
        }
      }
    },
    master: {
      kelas: [{ id: 'c1', nama: '7A' }],
      guru: [{ id: 'g1', nama: 'Guru A', tidak_bisa: {} }],
      penugasan: [
        {
          id: 'a1',
          guru_id: 'g1',
          kode: '8A',
          mapel: 'IPA',
          beban: { c1: 2 }
        }
      ]
    },
    jadwal: {}
  }
}

describe('load-calculator', () => {
  it('mendeteksi beban kurang (INFO) jika JP belum lengkap terpasang', () => {
    const p = createMiniProyek()
    // Kuota target 2 JP, terpasang 0 JP
    const masalah = hitungBeban(p, {})
    const kurang = masalah.filter((m) => m.jenis === 'beban_kurang')
    expect(kurang.length).toBe(1)
    expect(kurang[0].tingkat).toBe('info')
    expect(kurang[0].pesan).toContain('baru 0 dari 2 JP')
  })

  it('mendeteksi beban lebih (ERROR) jika JP melebihi target beban kelas', () => {
    const p = createMiniProyek()
    // Target 2 JP, terpasang 4 JP
    const countMap: Record<string, number> = {
      '8A:c1': 4
    }
    const cellMap: Record<string, [string, string, string][]> = {
      '8A:c1': [
        ['Senin', 'B1', 'c1'],
        ['Senin', 'B2', 'c1']
      ]
    }
    const masalah = hitungBeban(p, countMap, cellMap)
    const lebih = masalah.filter((m) => m.jenis === 'beban_lebih')
    expect(lebih.length).toBe(1)
    expect(lebih[0].tingkat).toBe('error')
    expect(lebih[0].pesan).toContain('terpasang 4 JP, bebannya 2 JP')
  })

  it('mendeteksi beban lebih jika kode dipasang di kelas yang target bebannya 0 atau tidak terdaftar', () => {
    const p = createMiniProyek()
    // Kelas c2 (7B) tidak ada di alokasi beban '8A'
    p.master.kelas.push({ id: 'c2', nama: '7B' })
    const countMap: Record<string, number> = {
      '8A:c1': 2, // pas
      '8A:c2': 2  // salah masuk kelas, target 0
    }
    const cellMap: Record<string, [string, string, string][]> = {
      '8A:c2': [['Senin', 'B1', 'c2']]
    }
    const masalah = hitungBeban(p, countMap, cellMap)
    const lebih = masalah.filter((m) => m.jenis === 'beban_lebih' && m.pesan.includes('7B'))
    expect(lebih.length).toBe(1)
    expect(lebih[0].tingkat).toBe('error')
    expect(lebih[0].pesan).toContain('terpasang 2 JP, bebannya 0 JP')
  })
})
