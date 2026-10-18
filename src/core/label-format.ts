/**
 * Merenggangkan huruf label slot non-KBM, misalnya "ISTIRAHAT" menjadi "I S T I R A H A T".
 * Jarak antar kata memakai spasi tak terputus agar tidak runtuh di HTML.
 */
export function renggangkanLabel(label: string): string {
  const NBSP = '\u00A0'
  return label
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((kata) => kata.split('').join(' '))
    .join(`${NBSP}${NBSP}${NBSP}`)
}
