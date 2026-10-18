import { CellContent } from './types'

/**
 * Mengubah ketikan operator menjadi array kode.
 * Mendukung pemisah /, ,, +, ; dan greedy search untuk kode komposit (mis. "3/15A").
 * Kode asing tetap dipertahankan huruf besar agar operator tidak kehilangan ketikan.
 */
export function parseCell(text: string, knownCodes: Set<string>): string[] {
  const t = (text || '').replace(/\s+/g, '').toUpperCase()
  if (!t) return []
  if (knownCodes.has(t)) return [t]

  const tokens = t.split(/[/,+;]/).filter(Boolean)
  const out: string[] = []
  let i = 0

  while (i < tokens.length) {
    let matched = false
    for (let j = tokens.length; j > i; j--) {
      const candidate = tokens.slice(i, j).join('/')
      if (knownCodes.has(candidate)) {
        out.push(candidate)
        i = j
        matched = true
        break
      }
    }
    if (!matched) {
      out.push(tokens[i])
      i++
    }
  }

  return out
}

/**
 * Mengubah ketikan sel menjadi array per JP.
 * Pemisah '|' memisahkan JP pertama dan kedua.
 */
export function parseCellJP(text: string, knownCodes: Set<string>): CellContent {
  const parts = (text || '').split('|')
  const a = parseCell(parts[0], knownCodes)
  const b = parts.length > 1 ? parseCell(parts[1], knownCodes) : [...a]
  return [a, b]
}

/**
 * Mengonversi array kode menjadi teks sel yang dipisah garis miring.
 */
export function cellText(codes: string[]): string {
  return codes.join('/')
}

/**
 * Mengonversi CellContent ([jp1, jp2]) menjadi string tampilan.
 */
export function cellTextJP(content: CellContent): string {
  if (!content || content.length === 0) return ''
  const a = cellText(content[0] || [])
  const b = cellText(content[1] || content[0] || [])
  return a === b ? a : `${a}|${b}`
}
