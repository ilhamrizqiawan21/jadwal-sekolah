import { StrukturWaktu, TingkatTingkat, HariKBM, SlotJam } from './types'

export const HARI_5 = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
export const HARI_6 = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function formatJam(menitSejakTengahMalam: number): string {
  const h = Math.floor(menitSejakTengahMalam / 60)
  const m = menitSejakTengahMalam % 60
  return `${h.toString().padStart(2, '0')}.${m.toString().padStart(2, '0')}`
}

function buildHariSlots(
  hariName: string,
  durasiJP: number,
  jumlahBlokKBM: number,
  adaUpacara: boolean,
  jedaSetelahBlok: number[] = [2]
): SlotJam[] {
  const slots: SlotJam[] = []
  let menit = 7 * 60 // 07:00

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
    // 1 Blok = 2 JP
    const jp1Start = menit
    const jp1End = jp1Start + durasiJP
    const jp2Start = jp1End
    const jp2End = jp2Start + durasiJP
    menit = jp2End

    slots.push({
      id: `B${b}`,
      tipe: 'kbm',
      label: '',
      waktu: [
        `${formatJam(jp1Start)}-${formatJam(jp1End)}`,
        `${formatJam(jp2Start)}-${formatJam(jp2End)}`
      ],
      jp: [currentJP, currentJP + 1]
    })
    currentJP += 2

    // Tambahkan istirahat jika di jadwal jeda
    if (jedaSetelahBlok.includes(b)) {
      const jedaEnd = menit + 20
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
  if (hariName === 'Jumat') {
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
  polaHari: 5 | 6 = 5
): StrukturWaktu {
  let durasi = 40
  let blokPerHari = 4 // 8 JP
  if (jenjang === 'SD') {
    durasi = 35
    blokPerHari = 3 // 6 JP
  } else if (jenjang === 'SMA' || jenjang === 'SMK') {
    durasi = 45
    blokPerHari = 5 // 10 JP
  }

  const hariList = polaHari === 6 ? HARI_6 : HARI_5
  const hariRecord: Record<string, HariKBM> = {}

  for (const h of hariList) {
    const isSenin = h === 'Senin'
    const isJumat = h === 'Jumat'
    const blok = isJumat ? Math.max(2, blokPerHari - 1) : blokPerHari

    hariRecord[h] = {
      aktif: true,
      judul: h.toUpperCase(),
      slots: buildHariSlots(h, durasi, blok, isSenin, [2])
    }
  }

  return {
    pola_hari: polaHari,
    durasi_jp_menit: durasi,
    hari: hariRecord
  }
}
