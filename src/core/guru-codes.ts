import { Guru } from './types'

export function getGuruCode(guru: Pick<Guru, 'id' | 'kode_prefiks'>): string {
  return guru.kode_prefiks?.trim() || guru.id
}

export function getGuruCodes(guruList: Guru[], guruIds: string[]): string {
  return guruIds
    .map((guruId) => {
      const guru = guruList.find((item) => item.id === guruId)
      return guru ? getGuruCode(guru) : guruId
    })
    .filter(Boolean)
    .join(' & ')
}
