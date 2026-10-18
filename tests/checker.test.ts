import { describe, it, expect } from 'vitest'
import { ProyekData } from '../src/core/types'
import { periksa, preview } from '../src/core/checker'

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
        },
        Selasa: {
          aktif: true,
          judul: 'SELASA',
          slots: [
            { id: 'B1', tipe: 'kbm', label: '', waktu: ['07.00-07.40', '07.40-08.20'], jp: [1, 2] },
            { id: 'B2', tipe: 'kbm', label: '', waktu: ['08.20-09.00', '09.00-09.40'], jp: [3, 4] }
          ]
        }
      }
    },
    master: {
      kelas: [
        { id: 'c1', nama: '7A', urutan: 1 },
        { id: 'c2', nama: '7B', urutan: 2 },
        { id: 'c3', nama: '7C', urutan: 3 }
      ],
      guru: [
        { id: 'g1', nama: 'Guru A', tidak_bisa: {} },
        { id: 'g2', nama: 'Guru B', tidak_bisa: {} }
      ],
      penugasan: [
        {
          id: 'a1',
          guru_id: 'g1',
          kode: '8A',
          mapel: 'IPA',
          beban: { c1: 2, c2: 2 }
        },
        {
          id: 'a2',
          guru_id: 'g1',
          kode: '8B',
          mapel: 'TIK',
          beban: { c3: 2 }
        },
        {
          id: 'a3',
          guru_id: 'g2',
          kode: '9',
          mapel: 'PKN',
          beban: { c1: 2, c2: 2, c3: 2 }
        }
      ]
    },
    jadwal: {}
  }
}

describe('checker engine', () => {
  it('mendeteksi bentrok: guru yang sama mengajar dua kelas berbeda pada slot dan JP yang sama', () => {
    const p = createMiniProyek()
    // g1 mengajar 8A di 7A dan 8B di 7C pada Senin B1
    p.jadwal = {
      Senin: {
        B1: {
          c1: [['8A'], ['8A']],
          c3: [['8B'], ['8B']]
        }
      }
    }
    const hasil = periksa(p)
    expect(hasil.adaError()).toBe(true)
    const bentrok = hasil.masalah.filter((m) => m.jenis === 'bentrok')
    expect(bentrok.length).toBeGreaterThan(0)
    expect(bentrok[0].pesan).toContain('BENTROK')
    expect(bentrok[0].guru_id).toBe('g1')
  })

  it('tidak bentrok jika JP berbeda dalam satu slot (split JP)', () => {
    const p = createMiniProyek()
    // g1 di 7A pada JP1, g2 di 7A pada JP2
    // g2 di 7B pada JP1, g1 di 7B pada JP2
    p.jadwal = {
      Senin: {
        B1: {
          c1: [['8A'], ['9']],
          c2: [['9'], ['8A']]
        }
      }
    }
    const hasil = periksa(p)
    const bentrok = hasil.masalah.filter((m) => m.jenis === 'bentrok')
    expect(bentrok.length).toBe(0)
  })

  it('mendeteksi pelanggaran jam berhalangan (tidak_bisa)', () => {
    const p = createMiniProyek()
    p.master.guru[0].tidak_bisa = {
      Selasa: ['B2']
    }
    p.jadwal = {
      Selasa: {
        B2: {
          c1: [['8A'], ['8A']]
        }
      }
    }
    const hasil = periksa(p)
    const tidakBisa = hasil.masalah.filter((m) => m.jenis === 'tidak_bisa')
    expect(tidakBisa.length).toBe(1)
    expect(tidakBisa[0].tingkat).toBe('error')
    expect(tidakBisa[0].guru_id).toBe('g1')
  })

  it('mendeteksi kode asing yang tidak ada dalam daftar beban penugasan', () => {
    const p = createMiniProyek()
    p.jadwal = {
      Senin: {
        B1: {
          c1: [['XX'], ['XX']]
        }
      }
    }
    const hasil = periksa(p)
    const kodeAsing = hasil.masalah.filter((m) => m.jenis === 'kode_asing')
    expect(kodeAsing.length).toBe(1)
    expect(kodeAsing[0].pesan).toContain('XX')
  })

  it('mendukung team teaching (kode bersama dipegang > 1 guru)', () => {
    const p = createMiniProyek()
    // Tambah guru C yang juga memegang kode 9
    p.master.guru.push({ id: 'g3', nama: 'Guru C', tidak_bisa: {} })
    p.master.penugasan.push({
      id: 'a4',
      guru_id: 'g3',
      kode: '9',
      mapel: 'PKN',
      beban: { c1: 2 }
    })

    // Kode 9 dipakai di 2 kelas sekaligus (kapasitas 2) -> BUKAN BENTROK
    p.jadwal = {
      Senin: {
        B1: {
          c1: [['9'], ['9']],
          c2: [['9'], ['9']]
        }
      }
    }
    let hasil = periksa(p)
    let bentrok = hasil.masalah.filter((m) => m.jenis === 'bentrok')
    expect(bentrok.length).toBe(0)

    // Kode 9 dipakai di 3 kelas sekaligus (melebihi kapasitas 2) -> BENTROK
    p.jadwal.Senin.B1.c3 = [['9'], ['9']]
    hasil = periksa(p)
    bentrok = hasil.masalah.filter((m) => m.jenis === 'bentrok')
    expect(bentrok.length).toBeGreaterThan(0)
  })

  it('memberikan preview peringatan instan saat mengetik', () => {
    const p = createMiniProyek()
    p.jadwal = {
      Senin: {
        B1: {
          c1: [['8A'], ['8A']]
        }
      }
    }
    // Operator mengetik 8B (guru sama g1) di kelas c2 pada slot yang sama
    const warnings = preview(p, 'Senin', 'B1', 'c2', [['8B'], ['8B']])
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings[0]).toContain('BENTROK')
  })

  it('mendeteksi jam berhalangan (tidak_bisa) pada seluruh anggota team teaching', () => {
    const p = createMiniProyek()
    // g2 dan g3 team-teaching kode '9'
    p.master.guru.push({
      id: 'g3',
      nama: 'Guru C (Team Partner)',
      tidak_bisa: {
        Senin: ['B1'] // g3 tidak bisa di Senin B1, sedangkan g2 bisa
      }
    })
    p.master.penugasan.push({
      id: 'a4',
      guru_id: 'g3',
      kode: '9',
      mapel: 'PKN',
      beban: { c1: 2 }
    })

    // Pasang kode 9 di Senin B1 kelas c1
    p.jadwal = {
      Senin: {
        B1: {
          c1: [['9'], ['9']]
        }
      }
    }

    const hasil = periksa(p)
    const tidakBisa = hasil.masalah.filter((m) => m.jenis === 'tidak_bisa')
    expect(tidakBisa.length).toBe(1)
    expect(tidakBisa[0].guru_id).toBe('g3')
    expect(tidakBisa[0].pesan).toContain('Guru C (Team Partner)')

    // Uji juga preview() untuk rekan team teaching
    const prevWarnings = preview(p, 'Senin', 'B1', 'c1', [['9'], ['9']])
    expect(prevWarnings.some((w) => w.includes('Guru C (Team Partner)'))).toBe(true)
  })

  it('mendeteksi bentrok jika guru team-teaching juga mengajar solo di kelas lain pada jam yang sama', () => {
    const p = createMiniProyek()
    // g1 dan g2 memegang kode TT bersama (kapasitas 2)
    p.master.penugasan.push(
      { id: 'att1', guru_id: 'g1', kode: 'TT', mapel: 'PJOK', beban: { c1: 2, c2: 2 } },
      { id: 'att2', guru_id: 'g2', kode: 'TT', mapel: 'PJOK', beban: { c1: 2, c2: 2 } }
    )
    // g1 juga memegang kode solo S1
    p.master.penugasan.push(
      { id: 'as1', guru_id: 'g1', kode: 'S1', mapel: 'Fisika', beban: { c3: 2 } }
    )
    p.master.kelas.push({ id: 'c3', nama: '7C' })

    // Di Senin B1:
    // c1 diisi TT, c2 diisi TT (memerlukan 2 guru: g1 & g2)
    // c3 diisi S1 (g1 mengajar solo lagi!)
    p.jadwal = {
      Senin: {
        B1: {
          c1: [['TT'], ['TT']],
          c2: [['TT'], ['TT']],
          c3: [['S1'], ['S1']]
        }
      }
    }

    const hasil = periksa(p)
    const bentrok = hasil.masalah.filter((m) => m.jenis === 'bentrok')
    expect(bentrok.length).toBeGreaterThan(0)
    expect(bentrok.some((b) => b.pesan.includes('TT') || b.pesan.includes('S1'))).toBe(true)
  })
})
