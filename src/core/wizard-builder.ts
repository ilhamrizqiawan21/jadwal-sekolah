import { ProyekData, TingkatTingkat, SemesterTipe } from './types'
import { getPresetStrukturWaktu } from './default-presets'

export interface WizardProfileData {
  nama_sekolah: string
  jenjang: TingkatTingkat
  semester: SemesterTipe
  tahun_pelajaran: string
  kota_tanggal: string
  kepala_sekolah_nama: string
  kepala_sekolah_nip: string
  kop_base64?: string
  ttd_base64?: string
}

/**
 * Validasi isian wajib pada tahap 1 (Profil Sekolah)
 */
export function validateProfileStep(profile: WizardProfileData): string[] {
  const errors: string[] = []
  if (!profile.nama_sekolah || profile.nama_sekolah.trim() === '') {
    errors.push('Nama sekolah wajib diisi')
  }
  if (!profile.tahun_pelajaran || profile.tahun_pelajaran.trim() === '') {
    errors.push('Tahun pelajaran wajib diisi')
  }
  return errors
}

/**
 * Membangun objek ProyekData lengkap dan siap pakai dari hasil input wizard
 */
export function buildProjectFromWizard(
  profile: WizardProfileData,
  polaHari: 5 | 6 = 5,
  presetJenjang?: TingkatTingkat
): ProyekData {
  const jenjang = presetJenjang || profile.jenjang || 'SMP'
  const strukturWaktu = getPresetStrukturWaktu(jenjang, polaHari)

  return {
    format_version: 2,
    app_version: '2.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    meta: {
      nama_sekolah: profile.nama_sekolah.trim(),
      jenjang: profile.jenjang,
      semester: profile.semester,
      tahun_pelajaran: profile.tahun_pelajaran.trim(),
      kota_tanggal: profile.kota_tanggal.trim(),
      pejabat_ttd: {
        jabatan: 'Kepala Sekolah',
        nama: profile.kepala_sekolah_nama.trim(),
        nip: profile.kepala_sekolah_nip.trim()
      },
      kop_base64: profile.kop_base64 || '',
      ttd_base64: profile.ttd_base64 || ''
    },
    struktur_waktu: strukturWaktu,
    master: {
      kelas: [],
      guru: [],
      penugasan: []
    },
    jadwal: {}
  }
}
