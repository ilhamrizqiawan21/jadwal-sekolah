import { HariKBM, SlotJam, SlotTipe } from './types'

const SLOT_PREFIX: Record<SlotTipe, string> = {
  kbm: 'B',
  jeda: 'JD',
  upacara: 'UP',
  ibadah: 'IB',
  tutup: 'TT'
}

/** Membuat ID teknis baru; ID ini sengaja tidak perlu diketahui operator. */
export function createSlotId(slots: Array<Pick<SlotJam, 'id' | 'tipe'>>, tipe: SlotTipe): string {
  const prefix = SLOT_PREFIX[tipe]
  const used = new Set(slots.map((slot) => slot.id))
  let index = 1
  while (used.has(`${prefix}${index}`)) index += 1
  return `${prefix}${index}`
}

export function getDefaultSlotLabel(tipe: SlotTipe, zeroBasedIndex: number): string {
  const ordinal = zeroBasedIndex + 1
  if (tipe === 'kbm') return `Sesi KBM ${ordinal}`
  if (tipe === 'jeda') return `Istirahat ${ordinal}`
  if (tipe === 'upacara') return 'Upacara'
  if (tipe === 'ibadah') return 'Ibadah'
  return 'Kegiatan / Tutup'
}

/** Label yang aman ditampilkan ke operator; ID internal tidak ikut ditampilkan. */
export function getSlotOperatorLabel(slot: Pick<SlotJam, 'tipe' | 'label'>, kbmOrdinal: number): string {
  if (slot.tipe === 'kbm') {
    const base = `Sesi ${Math.max(1, kbmOrdinal)}`
    return slot.label.trim() ? `${base} · ${slot.label.trim()}` : base
  }
  return slot.label.trim() || getDefaultSlotLabel(slot.tipe, 0)
}

function parseClock(value: string | undefined): number | null {
  if (!value) return null
  const normalized = value.trim().replace(':', '.')
  const match = normalized.match(/^(\d{1,2})\.(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

function formatClock(minutes: number): string {
  const safeMinutes = Math.max(0, minutes)
  const hour = Math.floor(safeMinutes / 60)
  const minute = safeMinutes % 60
  return `${String(hour).padStart(2, '0')}.${String(minute).padStart(2, '0')}`
}

function splitRange(range: string | undefined): [string, string] | null {
  const parts = range?.split('-').map((part) => part.trim()) || []
  if (parts.length !== 2 || parseClock(parts[0]) === null || parseClock(parts[1]) === null) return null
  return [parts[0], parts[1]]
}

function getSlotRange(slot: SlotJam): { start: number; end: number } | null {
  const first = splitRange(slot.waktu[0])
  const last = splitRange(slot.waktu[slot.waktu.length - 1])
  if (!first || !last) return null
  const start = parseClock(first[0])
  const end = parseClock(last[1])
  if (start === null || end === null) return null
  return { start, end }
}

/** Menghitung waktu slot KBM dari jam mulai dan durasi satu JP. */
export function buildSlotTiming(slot: SlotJam, start: string, end: string, durasiJpMenit: number): SlotJam {
  const startMinute = parseClock(start)
  if (startMinute === null) {
    return { ...slot, waktu: [`${start}-${end}`] }
  }

  if (slot.tipe !== 'kbm') {
    const endMinute = parseClock(end)
    if (endMinute === null) {
      return { ...slot, waktu: [`${formatClock(startMinute)}-${end}`], jp: [] }
    }
    return { ...slot, waktu: [`${formatClock(startMinute)}-${formatClock(endMinute)}`], jp: [] }
  }

  const jumlahJp = Math.max(1, slot.jp.length)
  const durasi = Math.max(1, Math.round(durasiJpMenit))
  const waktu = Array.from({ length: jumlahJp }, (_, index) => {
    const jpStart = startMinute + index * durasi
    return `${formatClock(jpStart)}-${formatClock(jpStart + durasi)}`
  })

  return { ...slot, waktu }
}

/** Mengembalikan pesan validasi yang dapat langsung ditampilkan di menu Sesi KBM. */
export function validateHariSlots(hari: HariKBM): string[] {
  const messages: string[] = []
  const seenIds = new Set<string>()
  const ranges: Array<{ slot: SlotJam; start: number; end: number }> = []

  for (const slot of hari.slots) {
    const id = slot.id.trim()
    if (seenIds.has(id)) {
      messages.push(`ID sesi "${id}" digunakan lebih dari sekali.`)
    }
    seenIds.add(id)

    const range = getSlotRange(slot)
    if (!range) {
      messages.push(`Waktu sesi "${id}" belum valid.`)
      continue
    }
    if (range.end <= range.start) {
      messages.push(`Waktu sesi "${id}" harus berakhir setelah waktu mulai.`)
      continue
    }
    ranges.push({ slot, ...range })
  }

  for (let index = 0; index < ranges.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < ranges.length; nextIndex += 1) {
      const current = ranges[index]
      const next = ranges[nextIndex]
      if (current.start < next.end && next.start < current.end) {
        messages.push(`Waktu sesi "${current.slot.id}" bertumpuk dengan sesi "${next.slot.id}".`)
      }
    }
  }

  return messages
}
