import { describe, expect, it } from 'vitest'
import { shouldConfirmProjectReplacement } from '../src/core/project-safety'
import { ProyekData } from '../src/core/types'

function emptyProject(): ProyekData {
  return {
    format_version: 2,
    app_version: '2.0.0',
    created_at: '',
    updated_at: '',
    meta: {
      nama_sekolah: 'Lembaga Pendidikan Baru',
      jenjang: 'SMP',
      semester: 'GANJIL',
      tahun_pelajaran: '2026/2027',
      kota_tanggal: '',
      pejabat_ttd: { jabatan: 'Pimpinan Lembaga', nama: '', nip: '' }
    },
    struktur_waktu: { pola_hari: 5, durasi_jp_menit: 40, hari: {} },
    master: { kelas: [], guru: [], penugasan: [] },
    jadwal: {}
  }
}

describe('Perlindungan penggantian proyek', () => {
  it('tidak meminta konfirmasi pada proyek awal yang benar-benar kosong', () => {
    expect(shouldConfirmProjectReplacement(emptyProject(), null, false)).toBe(false)
  })

  it('meminta konfirmasi jika proyek memiliki data, berkas, atau perubahan tersimpan', () => {
    const project = emptyProject()
    project.master.kelas.push({ id: 'kelas:1', nama: 'VII A', tingkat: 7 })

    expect(shouldConfirmProjectReplacement(project, null, false)).toBe(true)
    expect(shouldConfirmProjectReplacement(emptyProject(), 'C:/data.jadwal', false)).toBe(true)
    expect(shouldConfirmProjectReplacement(emptyProject(), null, true)).toBe(true)
  })
})
