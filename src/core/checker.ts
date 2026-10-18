import {
  ProyekData,
  HasilPemeriksaan,
  Masalah,
  SelKoordinat,
  CellContent,
  Penugasan
} from './types'
import { hitungBeban } from './load-calculator'

/**
 * Mendapatkan label waktu manusiawi (misal "Senin jam ke-1-2" atau "Senin B1")
 */
export function labelWaktu(
  p: ProyekData,
  hari: string,
  slotId: string,
  half?: number
): string {
  const h = p.struktur_waktu.hari[hari]
  if (h) {
    const slot = h.slots.find((s) => s.id === slotId)
    if (slot && slot.jp.length > 0) {
      if (half !== undefined && half < slot.jp.length) {
        return `${hari} jam ke-${slot.jp[half]}`
      }
      return `${hari} jam ke-${slot.jp.join('-')}`
    }
  }
  return `${hari} ${slotId}`
}

/**
 * Mesin utama pemeriksaan jadwal.
 * Sangat teroptimasi (O(N) single-pass) untuk menjaga performa NFR < 15ms.
 */
export function periksa(p: ProyekData): HasilPemeriksaan {
  const masalahList: Masalah[] = []
  const perSel: Record<string, Masalah[]> = {}

  function tambah(m: Masalah): void {
    masalahList.push(m)
    for (let i = 0; i < m.sel.length; i++) {
      const s = m.sel[i]
      const key = s[0] + ':' + s[1] + ':' + s[2]
      if (!perSel[key]) perSel[key] = []
      perSel[key].push(m)
    }
  }

  // 1. Indexing master data (Pre-computed Maps)
  const penugasanByKode = new Map<string, Penugasan>()
  const seenCodes = new Map<string, Penugasan[]>()

  for (const a of p.master.penugasan) {
    if (a.kode) {
      const codeUpper = a.kode.toUpperCase()
      if (!penugasanByKode.has(codeUpper)) {
        penugasanByKode.set(codeUpper, a)
      }
      if (!seenCodes.has(codeUpper)) seenCodes.set(codeUpper, [])
      seenCodes.get(codeUpper)!.push(a)
    }
  }

  const namaKelas = new Map(p.master.kelas.map((k) => [k.id, k.nama]))
  const namaGuru = new Map(p.master.guru.map((g) => [g.id, g.nama]))
  const urutKelas = new Map(p.master.kelas.map((k, i) => [k.id, i]))
  const validKelasIds = new Set(p.master.kelas.map((k) => k.id))

  // Pre-compute teacher availability set for O(1) lookup: "hari#slotId#guruId"
  const guruTidakBisaSet = new Set<string>()
  for (const g of p.master.guru) {
    if (g.tidak_bisa) {
      for (const [hari, slotIds] of Object.entries(g.tidak_bisa)) {
        for (const sid of slotIds) {
          guruTidakBisaSet.add(`${hari}#${sid}#${g.id}`)
        }
      }
    }
  }

  // Pre-compute code metadata for O(1) loop lookups
  interface CodeMeta {
    guru_id: string
    gkey: string
    cap: number
  }
  const codeMetaMap = new Map<string, CodeMeta>()
  const kapasitas = new Map<string, number>()

  for (const [kode, list] of seenCodes.entries()) {
    const gids = new Set(list.map((a) => a.guru_id))
    const gkey = gids.size === 1 ? list[0].guru_id : `kode:${kode}`
    kapasitas.set(gkey, gids.size)
    codeMetaMap.set(kode, {
      guru_id: list[0].guru_id,
      gkey,
      cap: gids.size
    })

    if (list.length > 1 && gids.size > 1) {
      const names = Array.from(gids)
        .map((gid) => namaGuru.get(gid) || '?')
        .sort()
        .join(', ')
      tambah({
        jenis: 'kode_ganda',
        tingkat: 'warn',
        pesan: `Kode ${kode} dipakai oleh lebih dari satu guru (${names}); kapasitas disesuaikan.`,
        ringkas: `Kode ${kode} dipakai ${gids.size} guru`,
        sel: [],
        guru_id: list[0].guru_id,
        kode
      })
    }
  }

  // 2. Single-pass over schedule
  const pakai = new Map<string, Array<[string, string]>>()
  const countMap: Record<string, number> = {}
  const cellMap: Record<string, SelKoordinat[]> = {}
  const checkedUnknownCodes = new Set<string>()

  const hariKeys = Object.keys(p.struktur_waktu.hari)

  for (const hari of hariKeys) {
    const hariRow = p.jadwal[hari]
    if (!hariRow) continue

    for (const slotId in hariRow) {
      const slotRow = hariRow[slotId]
      if (!slotRow) continue

      for (const kid in slotRow) {
        if (!validKelasIds.has(kid)) continue
        const jpContent = slotRow[kid]
        if (!jpContent) continue

        const sel: SelKoordinat = [hari, slotId, kid]
        const cellGuruIds = new Set<string>()

        const halfLen = Math.max(jpContent.length, 1)
        for (let half = 0; half < halfLen; half++) {
          const kodes = jpContent[half] || []
          for (const kode of kodes) {
            if (!kode) continue
            const codeUpper = kode.toUpperCase()
            const meta = codeMetaMap.get(codeUpper)

            if (!meta) {
              const unknownKey = `${hari}#${slotId}#${kid}#${codeUpper}`
              if (!checkedUnknownCodes.has(unknownKey)) {
                checkedUnknownCodes.add(unknownKey)
                const kName = namaKelas.get(kid) || kid
                tambah({
                  jenis: 'kode_asing',
                  tingkat: 'error',
                  pesan: `Kode "${codeUpper}" tidak ada di Beban Mengajar (${labelWaktu(p, hari, slotId)}, kelas ${kName}).`,
                  ringkas: `Kode "${codeUpper}" tidak dikenal · ${kName} · ${labelWaktu(p, hari, slotId)}`,
                  sel: [sel],
                  kode: codeUpper
                })
              }
              continue
            }

            const pakaiKey = `${hari}#${slotId}#${half}#${meta.gkey}`
            let list = pakai.get(pakaiKey)
            if (!list) {
              list = []
              pakai.set(pakaiKey, list)
            }
            list.push([kid, codeUpper])

            const cntKey = `${codeUpper}:${kid}`
            countMap[cntKey] = (countMap[cntKey] || 0) + 1

            if (half === 0) {
              if (!cellMap[cntKey]) cellMap[cntKey] = []
              cellMap[cntKey].push(sel)
            }

            cellGuruIds.add(meta.guru_id)
          }
        }

        // Cek jam berhalangan (langsung pada pass yang sama)
        for (const gid of cellGuruIds) {
          if (guruTidakBisaSet.has(`${hari}#${slotId}#${gid}`)) {
            const gName = namaGuru.get(gid) || gid
            const kName = namaKelas.get(kid) || kid
            tambah({
              jenis: 'tidak_bisa',
              tingkat: 'error',
              pesan: `${gName} meminta jam ini kosong (${labelWaktu(p, hari, slotId)}) tetapi ditempatkan di kelas ${kName}.`,
              ringkas: `${gName} · ${kName} · ${labelWaktu(p, hari, slotId)}`,
              sel: [sel],
              guru_id: gid
            })
          }
        }
      }
    }
  }

  // 3. Evaluasi Bentrok (Hanya evaluasi jika total slot dipakai > kapasitas)
  for (const [pakaiKey, list] of pakai.entries()) {
    const [hari, slotId, halfStr, gid] = pakaiKey.split('#')
    const cap = kapasitas.get(gid) || 1

    // Fast path: jika jumlah penugasan <= kapasitas, tidak mungkin bentrok
    if (list.length <= cap) continue

    // Cek jumlah kelas unik
    const uniqueKelasSet = new Set<string>()
    for (let i = 0; i < list.length; i++) {
      uniqueKelasSet.add(list[i][0])
    }

    if (uniqueKelasSet.size > cap) {
      const half = parseInt(halfStr, 10)
      const uniqueKelas = Array.from(uniqueKelasSet).sort(
        (a, b) => (urutKelas.get(a) || 0) - (urutKelas.get(b) || 0)
      )
      const kn = uniqueKelas.map((k) => namaKelas.get(k) || k).join(' dan ')

      const uniqueCodesSet = new Set<string>()
      for (let i = 0; i < list.length; i++) {
        uniqueCodesSet.add(list[i][1])
      }
      const uniqueCodes = Array.from(uniqueCodesSet).sort()

      const gNama = gid.startsWith('kode:')
        ? `kode ${gid.slice(5)} (dipegang beberapa guru)`
        : namaGuru.get(gid) || '?'

      const selArr: SelKoordinat[] = new Array(uniqueKelas.length)
      for (let i = 0; i < uniqueKelas.length; i++) {
        selArr[i] = [hari, slotId, uniqueKelas[i]]
      }

      tambah({
        jenis: 'bentrok',
        tingkat: 'error',
        pesan: `BENTROK: ${gNama} (kode ${uniqueCodes.join(', ')}) mengajar di ${kn} sekaligus pada ${labelWaktu(p, hari, slotId, half)}.`,
        ringkas: `${gNama} · ${kn} · ${labelWaktu(p, hari, slotId, half)}`,
        sel: selArr,
        guru_id: gid.startsWith('kode:') ? undefined : gid
      })
    }
  }

  // 4. Validasi Beban Mengajar (Lebih & Kurang)
  const bebanMasalah = hitungBeban(p, countMap, cellMap, namaGuru, namaKelas, seenCodes)
  for (const m of bebanMasalah) {
    tambah(m)
  }

  return {
    masalah: masalahList,
    per_sel: perSel,
    terpasang: countMap,
    jumlah: (tingkat) => masalahList.filter((m) => m.tingkat === tingkat).length,
    adaError: () => masalahList.some((m) => m.tingkat === 'error')
  }
}

/**
 * Pratinjau bentrok instan saat operator mengetik kode di suatu sel
 */
export function preview(
  p: ProyekData,
  hari: string,
  slotId: string,
  kelasId: string,
  jp: CellContent
): string[] {
  const warnings: string[] = []
  const penugasanByKode = new Map<string, Penugasan>()
  for (const a of p.master.penugasan) {
    if (a.kode) {
      penugasanByKode.set(a.kode.toUpperCase(), a)
    }
  }

  const namaKelas = new Map(p.master.kelas.map((k) => [k.id, k.nama]))
  const namaGuru = new Map(p.master.guru.map((g) => [g.id, g.nama]))

  const holders = new Map<string, Set<string>>()
  for (const a of p.master.penugasan) {
    if (a.kode) {
      const codeUpper = a.kode.toUpperCase()
      if (!holders.has(codeUpper)) holders.set(codeUpper, new Set())
      holders.get(codeUpper)!.add(a.guru_id)
    }
  }

  function getKunci(kode: string): [string, number] | null {
    const a = penugasanByKode.get(kode.toUpperCase())
    if (!a) return null
    const pemegang = holders.get(kode.toUpperCase()) || new Set([a.guru_id])
    const gkey = pemegang.size === 1 ? a.guru_id : `kode:${kode.toUpperCase()}`
    return [gkey, pemegang.size]
  }

  const slotRow = p.jadwal[hari]?.[slotId] || {}
  const seenWarnings = new Set<string>()

  for (let half = 0; half < jp.length; half++) {
    for (const kode of jp[half]) {
      const kk = getKunci(kode)
      if (!kk) continue
      const [gkey, cap] = kk
      const a = penugasanByKode.get(kode.toUpperCase())!

      // Cari kelas lain pada slot dan half yang sama
      const kelasLain: string[] = []
      for (const [k2, otherJP] of Object.entries(slotRow)) {
        if (k2 !== kelasId && otherJP[half]) {
          if (
            otherJP[half].some((c) => {
              const kk2 = getKunci(c)
              return kk2 && kk2[0] === gkey
            })
          ) {
            kelasLain.push(k2)
          }
        }
      }

      if (kelasLain.length + 1 > cap && !seenWarnings.has(gkey)) {
        seenWarnings.add(gkey)
        const gNama = gkey.startsWith('kode:')
          ? `Kode ${kode.toUpperCase()}`
          : namaGuru.get(a.guru_id) || '?'
        const kn = kelasLain.map((k) => namaKelas.get(k) || k).join(' dan ')
        warnings.push(
          `BENTROK: ${gNama} sudah mengajar di ${kn} pada ${labelWaktu(p, hari, slotId)}`
        )
      }

      // Cek apakah guru berhalangan
      const guru = p.master.guru.find((g) => g.id === a.guru_id)
      if (guru && guru.tidak_bisa && guru.tidak_bisa[hari]?.includes(slotId)) {
        const msg = `${guru.nama} meminta jam ini kosong`
        if (!warnings.includes(msg)) warnings.push(msg)
      }
    }
  }

  return warnings
}
