import { StrukturWaktu, TingkatTingkat, HariKBM, SlotJam } from './types'

export const HARI_5 = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
export const HARI_6 = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
export const HARI_7 = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

function formatJam(menitSejakTengahMalam: number): string {
  const h = Math.floor(menitSejakTengahMalam / 60)
  const m = menitSejakTengahMalam % 60
  return `${h.toString().padStart(2, '0')}.${m.toString().padStart(2, '0')}`
}

export interface PresetWaktuOptions {
  durasiJP?: number
  blokPerHari?: number
  jpPerSesi?: 1 | 2
  jamMulaiMenit?: number
  jedaSetelahBlok?: number[]
  durasiJedaMenit?: number
  tambahkanTutupJumat?: boolean
  hariAktif?: string[]
}

function buildHariSlots(
  hariName: string,
  durasiJP: number,
  jumlahBlokKBM: number,
  adaUpacara: boolean,
  jedaSetelahBlok: number[] = [2],
  jamMulaiMenit = 7 * 60,
  durasiJedaMenit = 20,
  tambahkanTutupJumat = true,
  jpPerSesi: 1 | 2 = 2
): SlotJam[] {
  const slots: SlotJam[] = []
  let menit = jamMulaiMenit

  if (adaUpacara) {
    const end = menit + 40
    slots.push({
      id: 'UP',
      tipe: 'upacara',
      label: 'Upacara Bendera',
      waktu: [`${formatJam(menit)}-${formatJam(end)}`],
      jp: [],
      warna: '#FEF08A'
    })
    menit = end
  }

  let currentJP = 1
  for (let b = 1; b <= jumlahBlokKBM; b++) {
    const waktu: string[] = []
    const jp: number[] = []
    for (let sesiJp = 0; sesiJp < jpPerSesi; sesiJp++) {
      const jpStart = menit
      const jpEnd = jpStart + durasiJP
      waktu.push(`${formatJam(jpStart)}-${formatJam(jpEnd)}`)
      jp.push(currentJP)
      currentJP += 1
      menit = jpEnd
    }

    slots.push({
      id: `B${b}`,
      tipe: 'kbm',
      label: '',
      waktu,
      jp
    })

    // Tambahkan istirahat jika di jadwal jeda
    if (jedaSetelahBlok.includes(b)) {
      const jedaEnd = menit + durasiJedaMenit
      slots.push({
        id: `JD${b}`,
        tipe: 'jeda',
        label: 'ISTIRAHAT',
        waktu: [`${formatJam(menit)}-${formatJam(jedaEnd)}`],
        jp: []
      })
      menit = jedaEnd
    }
  }

  // Khusus Jumat: jam tutup setelah sholat jumat jika lewat jam 11
  if (hariName === 'Jumat' && tambahkanTutupJumat && menit <= 11 * 60 + 45) {
    slots.push({
      id: 'TUTUP',
      tipe: 'tutup',
      label: "SHOLAT JUM'AT",
      waktu: ['11.45-12.45'],
      jp: []
    })
  }

  return slots
}

export function getPresetStrukturWaktu(
  jenjang: TingkatTingkat,
  polaHari: number = 5,
  options: PresetWaktuOptions = {}
): StrukturWaktu {
  let durasi = 40
  let blokPerHari = 4 // 8 JP
  if (jenjang === 'PAUD' || jenjang === 'TK') {
    durasi = 30
    blokPerHari = 4
  } else if (jenjang === 'SD' || jenjang === 'MI') {
    durasi = 35
    blokPerHari = 3 // 6 JP
  } else if (jenjang === 'SMA' || jenjang === 'MA' || jenjang === 'SMK') {
    durasi = 45
    blokPerHari = 5 // 10 JP
  }

  durasi = Math.max(1, Math.round(options.durasiJP ?? durasi))
  blokPerHari = Math.max(1, Math.round(options.blokPerHari ?? blokPerHari))
  const jamMulaiMenit = Math.max(0, Math.round(options.jamMulaiMenit ?? 7 * 60))
  const jedaSetelahBlok = options.jedaSetelahBlok ?? [2]
  const durasiJedaMenit = Math.max(1, Math.round(options.durasiJedaMenit ?? 20))
  const tambahkanTutupJumat = options.tambahkanTutupJumat ?? true
  const jpPerSesi: 1 | 2 = options.jpPerSesi === 1 ? 1 : 2

  const customAktif = options.hariAktif?.filter((h) => HARI_7.includes(h))
  const hasCustomAktif = Boolean(customAktif && customAktif.length > 0)
  const activeSet = hasCustomAktif ? new Set(customAktif) : null
  const hariList = hasCustomAktif || polaHari === 7 ? HARI_7 : polaHari === 6 ? HARI_6 : HARI_5
  const resolvedPolaHari = activeSet ? activeSet.size : polaHari === 7 ? 7 : polaHari === 6 ? 6 : 5
  const hariRecord: Record<string, HariKBM> = {}

  for (const h of hariList) {
    const isSenin = h === 'Senin'
    const isJumat = h === 'Jumat'
    const blok = isJumat ? Math.max(2, blokPerHari - 1) : blokPerHari

    hariRecord[h] = {
      aktif: activeSet ? activeSet.has(h) : true,
      judul: h.toUpperCase(),
      slots: buildHariSlots(
        h,
        durasi,
        blok,
        isSenin,
        jedaSetelahBlok,
        jamMulaiMenit,
        durasiJedaMenit,
        tambahkanTutupJumat,
        jpPerSesi
      )
    }
  }

  return {
    pola_hari: resolvedPolaHari,
    durasi_jp_menit: durasi,
    jp_per_sesi: jpPerSesi,
    hari: hariRecord
  }
}
