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

  const namaKelas = new Map<string, string>()
  const urutKelas = new Map<string, number>()
  const validKelasIds = new Set<string>()
  for (let i = 0; i < p.master.kelas.length; i++) {
    const k = p.master.kelas[i]
    namaKelas.set(k.id, k.nama)
    urutKelas.set(k.id, i)
    validKelasIds.add(k.id)
  }

  const namaGuru = new Map<string, string>()
  for (let i = 0; i < p.master.guru.length; i++) {
    const g = p.master.guru[i]
    namaGuru.set(g.id, g.nama)
  }

  // Pre-compute teacher availability set for O(1) lookup: "hari#slotId#guruId"
  const guruTidakBisaSet = new Set<string>()
  for (let gi = 0; gi < p.master.guru.length; gi++) {
    const g = p.master.guru[gi]
    const tb = g.tidak_bisa
    if (tb) {
      for (const hari in tb) {
        const slotIds = tb[hari]
        if (slotIds) {
          for (let si = 0; si < slotIds.length; si++) {
            guruTidakBisaSet.add(hari + '#' + slotIds[si] + '#' + g.id)
          }
        }
      }
    }
  }

  // Pre-compute code metadata for O(1) loop lookups
  interface CodeMeta {
    guru_ids: string[]
    gkey: string
    cap: number
  }
  const codeMetaMap = new Map<string, CodeMeta>()
  const kapasitas = new Map<string, number>()

  for (const [kode, list] of seenCodes.entries()) {
    const allGids: string[] = []
    for (let i = 0; i < list.length; i++) {
      const a = list[i]
      if (a.guru_ids && a.guru_ids.length > 0) {
        for (let gi = 0; gi < a.guru_ids.length; gi++) allGids.push(a.guru_ids[gi])
      } else if (a.guru_id) {
        allGids.push(a.guru_id)
      }
    }
    const gidsList = Array.from(new Set(allGids))
    const gkey = gidsList.length === 1 ? gidsList[0] : `kode:${kode}`
    const cap = Math.max(1, gidsList.length)
    kapasitas.set(gkey, cap)
    codeMetaMap.set(kode, {
      guru_ids: gidsList,
      gkey,
      cap
    })

    if (list.length > 1 && gidsList.length > 1) {
      const names = gidsList
        .map((gid) => namaGuru.get(gid) || '?')
        .sort()
        .join(', ')
      tambah({
        jenis: 'kode_ganda',
        tingkat: 'warn',
        pesan: `Kode ${kode} dipakai oleh lebih dari satu guru (${names}); kapasitas disesuaikan.`,
        ringkas: `Kode ${kode} dipakai ${gidsList.length} guru`,
        sel: [],
        guru_id: list[0].guru_id,
        kode
      })
    }
  }

  // Pre-compute slot labels for fast O(1) string creation
  const slotLabelMap = new Map<string, string>()
  const slotHalfLabelMap = new Map<string, string>()
  for (const hKey in p.struktur_waktu.hari) {
    const h = p.struktur_waktu.hari[hKey]
    if (h) {
      for (let si = 0; si < h.slots.length; si++) {
        const slot = h.slots[si]
        const baseKey = hKey + '#' + slot.id
        if (slot.jp && slot.jp.length > 0) {
          slotLabelMap.set(baseKey, `${hKey} jam ke-${slot.jp.join('-')}`)
          for (let hi = 0; hi < slot.jp.length; hi++) {
            slotHalfLabelMap.set(baseKey + '#' + hi, `${hKey} jam ke-${slot.jp[hi]}`)
          }
        } else {
          slotLabelMap.set(baseKey, `${hKey} ${slot.id}`)
        }
      }
    }
  }

  function getLabel(h: string, sId: string, half?: number): string {
    if (half !== undefined) {
      const v = slotHalfLabelMap.get(h + '#' + sId + '#' + half)
      if (v) return v
    }
    const v = slotLabelMap.get(h + '#' + sId)
    if (v) return v
    return labelWaktu(p, h, sId, half)
  }

  // 2. Single-pass over schedule
  interface PakaiSlot {
    hari: string
    slotId: string
    half: number
    gid: string
    kids: string[]
    codes: string[]
  }
  const pakai = new Map<string, PakaiSlot>()
  const countMap: Record<string, number> = {}
  const cellMap: Record<string, SelKoordinat[]> = {}
  const checkedUnknownCodes = new Set<string>()

  const hariKeys = Object.keys(p.struktur_waktu.hari)

  for (const hari of hariKeys) {
    const h = p.struktur_waktu.hari[hari]
    // Abaikan hari libur / tidak aktif dalam struktur waktu
    if (!h || !h.aktif) continue

    const hariRow = p.jadwal[hari]
    if (!hariRow) continue

    // Indeks slot KBM yang valid untuk hari ini
    const validKbmSlots = new Set<string>()
    for (let si = 0; si < h.slots.length; si++) {
      if (h.slots[si].tipe === 'kbm') {
        validKbmSlots.add(h.slots[si].id)
      }
    }

    for (const slotId in hariRow) {
      // Abaikan slot non-KBM (upacara, jeda/istirahat, tutup)
      if (!validKbmSlots.has(slotId)) continue

      const slotRow = hariRow[slotId]
      if (!slotRow) continue

      for (const kid in slotRow) {
        if (!validKelasIds.has(kid)) continue
        const jpContent = slotRow[kid]
        if (!jpContent) continue

        let sel: SelKoordinat | null = null
        function getSel(): SelKoordinat {
          if (!sel) sel = [hari, slotId, kid]
          return sel
        }

        const checkedGidsThisCell: string[] = []

        const halfLen = Math.max(jpContent.length, 1)
        for (let half = 0; half < halfLen; half++) {
          const kodes = jpContent[half] || []
          for (let ki = 0; ki < kodes.length; ki++) {
            const kode = kodes[ki]
            if (!kode) continue
            const codeUpper = kode.toUpperCase()
            const meta = codeMetaMap.get(codeUpper)

            if (!meta) {
              const unknownKey = hari + '#' + slotId + '#' + kid + '#' + codeUpper
              if (!checkedUnknownCodes.has(unknownKey)) {
                checkedUnknownCodes.add(unknownKey)
                const kName = namaKelas.get(kid) || kid
                tambah({
                  jenis: 'kode_asing',
                  tingkat: 'error',
                  pesan: `Kode "${codeUpper}" tidak ada di Beban Mengajar (${getLabel(hari, slotId)}, kelas ${kName}).`,
                  ringkas: `Kode "${codeUpper}" tidak dikenal · ${kName} · ${getLabel(hari, slotId)}`,
                  sel: [getSel()],
                  kode: codeUpper
                })
              }
              continue
            }

            const pakaiKey = hari + '#' + slotId + '#' + half + '#' + meta.gkey
            let slotEntry = pakai.get(pakaiKey)
            if (!slotEntry) {
              slotEntry = {
                hari,
                slotId,
                half,
                gid: meta.gkey,
                kids: [],
                codes: []
              }
              pakai.set(pakaiKey, slotEntry)
            }
            slotEntry.kids.push(kid)
            slotEntry.codes.push(codeUpper)

            const cntKey = codeUpper + ':' + kid
            countMap[cntKey] = (countMap[cntKey] || 0) + 1

            if (!cellMap[cntKey]) {
              cellMap[cntKey] = [getSel()]
            } else {
              const currentList = cellMap[cntKey]
              const lastSel = currentList[currentList.length - 1]
              const thisSel = getSel()
              if (lastSel[0] !== thisSel[0] || lastSel[1] !== thisSel[1] || lastSel[2] !== thisSel[2]) {
                currentList.push(thisSel)
              }
            }

            for (let gi = 0; gi < meta.guru_ids.length; gi++) {
              const gid = meta.guru_ids[gi]
              if (checkedGidsThisCell.indexOf(gid) === -1) {
                checkedGidsThisCell.push(gid)
              }
            }
          }
        }

        // Cek jam berhalangan
        for (let gi = 0; gi < checkedGidsThisCell.length; gi++) {
          const gid = checkedGidsThisCell[gi]
          if (guruTidakBisaSet.has(hari + '#' + slotId + '#' + gid)) {
            const gName = namaGuru.get(gid) || gid
            const kName = namaKelas.get(kid) || kid
            tambah({
              jenis: 'tidak_bisa',
              tingkat: 'error',
              pesan: `${gName} meminta jam ini kosong (${getLabel(hari, slotId)}) tetapi ditempatkan di kelas ${kName}.`,
              ringkas: `${gName} · ${kName} · ${getLabel(hari, slotId)}`,
              sel: [getSel()],
              guru_id: gid
            })
          }
        }
      }
    }
  }

  // 3. Evaluasi Bentrok (Hanya evaluasi jika total slot dipakai > kapasitas)
  for (const slotEntry of pakai.values()) {
    const kids = slotEntry.kids
    const cap = kapasitas.get(slotEntry.gid) || 1
    const { hari, slotId, half, gid } = slotEntry

    // Periksa apakah ada guru dalam kode team-teaching yang sedang mengajar solo di slot yang sama
    let effectiveCap = cap
    const busyTeachers: string[] = []
    if (gid.startsWith('kode:')) {
      const codeKey = gid.slice(5)
      const meta = codeMetaMap.get(codeKey)
      if (meta) {
        for (let i = 0; i < meta.guru_ids.length; i++) {
          const teacherId = meta.guru_ids[i]
          const teacherSoloKey = hari + '#' + slotId + '#' + half + '#' + teacherId
          const soloEntry = pakai.get(teacherSoloKey)
          if (soloEntry && soloEntry.kids.length > 0) {
            effectiveCap--
            const tName = namaGuru.get(teacherId) || teacherId
            const soloKelasNames = soloEntry.kids.map((k) => namaKelas.get(k) || k).join(', ')
            busyTeachers.push(`${tName} di kelas ${soloKelasNames}`)
          }
        }
      }
    }
    effectiveCap = Math.max(0, effectiveCap)

    // Fast path: jika jumlah penugasan <= kapasitas efektif dan tidak ada potensi over-capacity
    if (kids.length <= effectiveCap && busyTeachers.length === 0) continue

    // Cek jumlah kelas unik
    const uniqueKelasSet = new Set<string>(kids)

    if (uniqueKelasSet.size > effectiveCap) {
      const uniqueKelas = Array.from(uniqueKelasSet).sort(
        (a, b) => (urutKelas.get(a) || 0) - (urutKelas.get(b) || 0)
      )
      const kn = uniqueKelas.map((k) => namaKelas.get(k) || k).join(' dan ')

      const uniqueCodesSet = new Set<string>(slotEntry.codes)
      const uniqueCodes = Array.from(uniqueCodesSet).sort()

      const gNama = gid.startsWith('kode:')
        ? `kode ${gid.slice(5)} (dipegang beberapa guru)`
        : namaGuru.get(gid) || '?'

      const selArr: SelKoordinat[] = new Array(uniqueKelas.length)
      for (let i = 0; i < uniqueKelas.length; i++) {
        selArr[i] = [hari, slotId, uniqueKelas[i]]
      }

      const busyNotice = busyTeachers.length > 0 ? ` [${busyTeachers.join(', ')}]` : ''
      tambah({
        jenis: 'bentrok',
        tingkat: 'error',
        pesan: `BENTROK: ${gNama} (kode ${uniqueCodes.join(', ')}) mengajar di ${kn} sekaligus pada ${getLabel(hari, slotId, half)}${busyNotice}.`,
        ringkas: `${gNama} · ${kn} · ${getLabel(hari, slotId, half)}`,
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
      if (a.guru_ids && a.guru_ids.length > 0) {
        for (let gi = 0; gi < a.guru_ids.length; gi++) holders.get(codeUpper)!.add(a.guru_ids[gi])
      } else if (a.guru_id) {
        holders.get(codeUpper)!.add(a.guru_id)
      }
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
      const pemegang = holders.get(kode.toUpperCase()) || new Set([a.guru_id])

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

      // Hitung kapasitas efektif dengan memperhitungkan guru pemegang yang mengajar solo di slot ini
      let effectiveCap = cap
      if (gkey.startsWith('kode:')) {
        for (const [k2, otherJP] of Object.entries(slotRow)) {
          if (k2 !== kelasId && otherJP[half]) {
            for (const c of otherJP[half]) {
              const otherA = penugasanByKode.get(c.toUpperCase())
              if (otherA && otherA.kode.toUpperCase() !== kode.toUpperCase()) {
                if (pemegang.has(otherA.guru_id)) {
                  effectiveCap--
                }
              }
            }
          }
        }
      }
      effectiveCap = Math.max(0, effectiveCap)

      if (kelasLain.length + 1 > effectiveCap && !seenWarnings.has(gkey)) {
        seenWarnings.add(gkey)
        const gNama = gkey.startsWith('kode:')
          ? `Kode ${kode.toUpperCase()}`
          : namaGuru.get(a.guru_id) || '?'
        const kn = kelasLain.map((k) => namaKelas.get(k) || k).join(' dan ')
        warnings.push(
          `BENTROK: ${gNama} sudah mengajar di ${kn} pada ${labelWaktu(p, hari, slotId)}`
        )
      }

      // Cek apakah guru berhalangan (termasuk seluruh pemegang kode team-teaching)
      for (const gid of pemegang) {
        const guru = p.master.guru.find((g) => g.id === gid)
        if (guru && guru.tidak_bisa && guru.tidak_bisa[hari]?.includes(slotId)) {
          const msg = `${guru.nama} meminta jam ini kosong`
          if (!warnings.includes(msg)) warnings.push(msg)
        }
      }
    }
  }

  return warnings
}
