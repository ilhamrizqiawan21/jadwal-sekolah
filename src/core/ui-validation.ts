export interface SelectableCell {
  hari: string
  slotId: string
  kelasId: string
}

export function validateRequiredField(value: string, label: string): string | null {
  return value.trim() ? null : `${label} wajib diisi.`
}

export function validateTeamTeaching(guruIds: string[]): string | null {
  return guruIds.length >= 2 ? null : 'Team Teaching memerlukan minimal 2 guru.'
}

export function canApplyCodeToCell(cell: SelectableCell | null): boolean {
  return Boolean(cell?.hari.trim() && cell.slotId.trim() && cell.kelasId.trim())
}
