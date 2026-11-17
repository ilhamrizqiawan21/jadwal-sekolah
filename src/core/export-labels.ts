import { CellContent, Penugasan, ProyekData } from './types'

function getGuruIds(penugasan: Penugasan): string[] {
  return penugasan.guru_ids && penugasan.guru_ids.length > 0
    ? penugasan.guru_ids
    : penugasan.guru_id
      ? [penugasan.guru_id]
      : []
}

/** Mengambil kode guru eksplisit untuk keperluan dokumen; tidak menampilkan id internal. */
export function getExportGuruCodes(data: ProyekData, penugasan: Penugasan): string {
  return getGuruIds(penugasan)
    .map((guruId) => data.master.guru.find((guru) => guru.id === guruId)?.kode_prefiks?.trim() || '')
    .filter(Boolean)
    .join(' & ')
}

export function formatExportToken(data: ProyekData, kode: string): string {
  const penugasan = data.master.penugasan.find((item) => item.kode.toUpperCase() === kode.toUpperCase())
  if (!penugasan) return kode
  const guruCodes = getExportGuruCodes(data, penugasan)
  return guruCodes ? `${kode} (${guruCodes})` : kode
}

export function formatExportPart(data: ProyekData, codes: string[]): string {
  return codes.map((kode) => formatExportToken(data, kode)).join('/')
}

export function formatExportCell(data: ProyekData, content: CellContent): string {
  if (!content || content.length === 0) return ''
  const a = formatExportPart(data, content[0] || [])
  const b = formatExportPart(data, content.length > 1 ? content[1] || [] : content[0] || [])
  return a === b ? a : `${a}|${b}`
}
