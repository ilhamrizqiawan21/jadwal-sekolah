import { describe, it, expect } from 'vitest'
import { createDummyProject } from '../src/core/dummy-data'
import { periksa } from '../src/core/checker'

describe('dummy-data', () => {
  it('menghasilkan data demonstrasi yang siap diuji', () => {
    const project = createDummyProject()
    const assignedCodes = new Set(project.master.penugasan.map((assignment) => assignment.kode))
    const scheduledCodes = Object.values(project.jadwal).flatMap((day) =>
      Object.values(day).flatMap((slot) =>
        Object.values(slot).flatMap((cell) => cell.flat())
      )
    )

    expect(project.meta.nama_sekolah).toBe('Lembaga Pendidikan Demo')
    expect(project.meta.jenis_lembaga).toBe('Lembaga Pendidikan')
    expect(project.meta.alamat_sekolah).toContain('Kota Demo')
    expect(project.meta.pejabat_ttd.nama).toBe('Pimpinan Lembaga')
    expect(project.master.kelas).toHaveLength(6)
    expect(project.master.kelas.every((kelas) => kelas.wali_guru_id)).toBe(true)
    expect(project.master.guru).toHaveLength(12)
    expect(project.master.guru.some((guru) => Object.keys(guru.tidak_bisa).length > 0)).toBe(true)
    expect(project.master.penugasan).toHaveLength(12)
    expect(project.master.penugasan.some((assignment) => (assignment.guru_ids?.length || 0) > 1)).toBe(true)
    expect(scheduledCodes.length).toBeGreaterThan(0)
    expect(scheduledCodes.every((code) => assignedCodes.has(code))).toBe(true)
    expect(Object.keys(project.jadwal)).toHaveLength(6)
    expect(periksa(project).jumlah('error')).toBe(0)
  })
})
