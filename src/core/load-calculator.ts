import { ProyekData, Masalah, SelKoordinat, Penugasan } from './types'

/**
 * Menghitung selisih beban JP per kode per kelas (target vs terpasang).
 * Selisih lebih -> ERROR
 * Selisih kurang -> INFO (belum lengkap)
 */
export function hitungBeban(
  p: ProyekData,
  countMap: Record<string, number>,
  cellMap: Record<string, SelKoordinat[]> = {},
  guruMapParam?: Map<string, string>,
  kelasMapParam?: Map<string, string>,
  seenCodesParam?: Map<string, Penugasan[]>
): Masalah[] {
  const masalah: Masalah[] = []
  const guruMap = guruMapParam || new Map(p.master.guru.map((g) => [g.id, g.nama]))
  const kelasMap = kelasMapParam || new Map(p.master.kelas.map((k) => [k.id, k.nama]))

  let seen = seenCodesParam
  if (!seen) {
    seen = new Map<string, Penugasan[]>()
    for (const a of p.master.penugasan) {
      if (a.kode) {
        const codeKey = a.kode.toUpperCase()
        if (!seen.has(codeKey)) {
          seen.set(codeKey, [])
        }
        seen.get(codeKey)!.push(a)
      }
    }
  }

  for (const [codeUpper, sama] of seen.entries()) {
    const a0 = sama[0]
    const guruNama = guruMap.get(a0.guru_id) || '?'

    // Kumpulkan hanya kelas yang memiliki target beban pada kode ini
    const relevantKelasIds = new Set<string>()
    for (let i = 0; i < sama.length; i++) {
      const b = sama[i].beban
      if (b) {
        for (const kid in b) {
          relevantKelasIds.add(kid)
        }
      }
    }

    for (const kid of relevantKelasIds) {
      let target = 0
      for (let i = 0; i < sama.length; i++) {
        const b = sama[i].beban?.[kid] || 0
        if (b > target) target = b
      }
      if (target === 0) continue

      const countKey = codeUpper + ':' + kid
      const ada = countMap[countKey] || 0

      if (ada === target) continue

      const kelasNama = kelasMap.get(kid) || kid
      const cells = cellMap[countKey] || []

      if (ada > target) {
        masalah.push({
          jenis: 'beban_lebih',
          tingkat: 'error',
          pesan: `Kelebihan jam: kode ${a0.kode} (${guruNama}) di ${kelasNama} terpasang ${ada} JP, bebannya ${target} JP.`,
          ringkas: `Kode ${a0.kode} · ${kelasNama}: ${ada} dari ${target} JP (lebih)`,
          sel: cells,
          guru_id: a0.guru_id,
          kode: a0.kode
        })
      } else {
        masalah.push({
          jenis: 'beban_kurang',
          tingkat: 'info',
          pesan: `Belum lengkap: kode ${a0.kode} (${guruNama}) di ${kelasNama} baru ${ada} dari ${target} JP.`,
          ringkas: `Kode ${a0.kode} · ${kelasNama}: ${ada} dari ${target} JP`,
          sel: [],
          guru_id: a0.guru_id,
          kode: a0.kode
        })
      }
    }
  }

  return masalah
}
