import { describe, it, expect } from 'vitest'
import {
  validateProfileStep,
  buildProjectFromWizard,
  WizardProfileData
} from '../src/core/wizard-builder'

describe('Wizard Logic Builder (src/core/wizard-builder.ts)', () => {
  it('memvalidasi field wajib pada langkah profil sekolah', () => {
    const invalidProfile: WizardProfileData = {
      nama_sekolah: '',
      jenjang: 'SMP',
      semester: 'GANJIL',
      tahun_pelajaran: '',
      kota_tanggal: '',
      kepala_sekolah_nama: '',
      kepala_sekolah_nip: ''
    }

    const errors = validateProfileStep(invalidProfile)
    expect(errors).toContain('Nama sekolah wajib diisi')
    expect(errors).toContain('Tahun pelajaran wajib diisi')

    const validProfile: WizardProfileData = {
      nama_sekolah: 'SMP Negeri 1 Merdeka',
      jenjang: 'SMP',
      semester: 'GANJIL',
      tahun_pelajaran: '2026/2027',
      kota_tanggal: 'Jakarta, 14 Juli 2026',
      kepala_sekolah_nama: 'Drs. Budi Santoso',
      kepala_sekolah_nip: '197501012000031001'
    }
    expect(validateProfileStep(validProfile)).toHaveLength(0)
  })

  it('menghasilkan objek ProyekData lengkap dan valid sesuai skema ERD dari wizard', () => {
    const profile: WizardProfileData = {
      nama_sekolah: 'SMA Negeri 2 Maju',
      jenjang: 'SMA',
      semester: 'GENAP',
      tahun_pelajaran: '2026/2027',
      kota_tanggal: 'Bandung, 5 Januari 2027',
      kepala_sekolah_nama: 'Dr. H. Sulaiman',
      kepala_sekolah_nip: '197203151998021002',
      kop_base64: 'data:image/png;base64,samplekop',
      ttd_base64: 'data:image/png;base64,samplettd'
    }

    const proyek = buildProjectFromWizard(profile, 6, 'SMA')

    expect(proyek.format_version).toBe(2)
    expect(proyek.meta.nama_sekolah).toBe('SMA Negeri 2 Maju')
    expect(proyek.meta.jenjang).toBe('SMA')
    expect(proyek.meta.semester).toBe('GENAP')
    expect(proyek.meta.pejabat_ttd.nama).toBe('Dr. H. Sulaiman')
    expect(proyek.meta.kop_base64).toBe('data:image/png;base64,samplekop')

    // Verifikasi struktur waktu 6 hari
    expect(proyek.struktur_waktu.pola_hari).toBe(6)
    expect(proyek.struktur_waktu.durasi_jp_menit).toBe(45)
    expect(Object.keys(proyek.struktur_waktu.hari)).toHaveLength(6)
    expect(proyek.struktur_waktu.hari['Sabtu'].aktif).toBe(true)

    // Master data awal kosong siap diisi
    expect(proyek.master.kelas).toEqual([])
    expect(proyek.master.guru).toEqual([])
    expect(proyek.master.penugasan).toEqual([])
    expect(proyek.jadwal).toEqual({})
  })
})
