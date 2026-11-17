import { DEFAULT_PROJECT_NAME } from './app-meta'
import { ProyekData } from './types'

/** Menentukan apakah mengganti proyek berpotensi menghilangkan pekerjaan operator. */
export function shouldConfirmProjectReplacement(
  project: ProyekData,
  filePath: string | null,
  dirty: boolean
): boolean {
  const hasSchedule = Object.values(project.jadwal).some((hari) =>
    Object.values(hari).some((slot) => Object.keys(slot).length > 0)
  )
  const hasMasterData =
    project.master.kelas.length > 0 ||
    project.master.guru.length > 0 ||
    project.master.penugasan.length > 0
  const hasCustomIdentity = project.meta.nama_sekolah.trim() !== DEFAULT_PROJECT_NAME

  return dirty || Boolean(filePath) || hasSchedule || hasMasterData || hasCustomIdentity
}
