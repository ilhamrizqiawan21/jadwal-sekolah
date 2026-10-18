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
    const guruNama =
      a0.guru_ids && a0.guru_ids.length > 0
        ? a0.guru_ids.map((id) => guruMap.get(id) || '?').join(' & ')
        : guruMap.get(a0.guru_id) || '?'

    // Kumpulkan seluruh kelas yang relevan (dari target beban DAN dari yang terpasang di countMap)
    const allKids = new Set<string>()
    for (let i = 0; i < sama.length; i++) {
      const b = sama[i].beban
      if (b) {
        for (const kid in b) allKids.add(kid)
      }
    }
    // Cari kelas yang terpasang di countMap untuk kode ini
    const prefix = codeUpper + ':'
    for (const ck in countMap) {
      if (ck.startsWith(prefix)) {
        allKids.add(ck.slice(prefix.length))
      }
    }

    for (const kid of allKids) {
      let target = 0
      for (let i = 0; i < sama.length; i++) {
        const b = sama[i].beban?.[kid] || 0
        if (b > target) target = b
      }

      const countKey = codeUpper + ':' + kid
      const ada = countMap[countKey] || 0

      // Jika target 0 dan tidak ada jam terpasang, lewati
      if (target === 0 && ada === 0) continue
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
      } else if (target > 0) {
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
