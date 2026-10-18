import { ProyekData, Guru, Kelas, Penugasan, JadwalGrid } from './types'
import { getPresetStrukturWaktu } from './default-presets'

/**
 * Data contoh sepenuhnya fiktif untuk mencoba aplikasi.
 * Tidak berisi identitas sekolah, guru, atau pejabat yang nyata.
 */

interface MapelContoh {
  nama: string
  jp: number
  warna: string
}

const MAPEL_CONTOH: MapelContoh[] = [
  { nama: 'Matematika', jp: 4, warna: '#FDE68A' },
  { nama: 'Bahasa Indonesia', jp: 4, warna: '#BFDBFE' },
  { nama: 'Bahasa Inggris', jp: 4, warna: '#C7D2FE' },
  { nama: 'IPA', jp: 4, warna: '#BBF7D0' },
  { nama: 'IPS', jp: 4, warna: '#FBCFE8' },
  { nama: 'Pendidikan Agama', jp: 4, warna: '#DDD6FE' },
  { nama: 'PPKn', jp: 4, warna: '#FED7AA' },
  { nama: 'PJOK', jp: 4, warna: '#A7F3D0' },
  { nama: 'Seni Budaya', jp: 2, warna: '#FECDD3' },
  { nama: 'Informatika', jp: 2, warna: '#BAE6FD' },
  { nama: 'Prakarya', jp: 2, warna: '#E9D5FF' }
]

const NAMA_KELAS = ['7A', '7B', '8A', '8B', '9A', '9B']

export function buatProyekContoh(): ProyekData {
  const struktur = getPresetStrukturWaktu('SMP', 5)
  const kelas: Kelas[] = NAMA_KELAS.map((nama, i) => ({
    id: `c${i + 1}`,
    nama,
    tingkat: 7 + Math.floor(i / 2),
    wali_guru_id: null,
    urutan: i + 1
  }))

  const guru: Guru[] = MAPEL_CONTOH.map((m, i) => ({
    id: `g${i + 1}`,
    nama: `Guru ${m.nama}`,
    jabatan: `Pengampu ${m.nama}`,
    tidak_bisa: {}
  }))

  const penugasan: Penugasan[] = MAPEL_CONTOH.map((m, i) => ({
    id: `a${i + 1}`,
    guru_id: `g${i + 1}`,
    kode: String(i + 1),
    mapel: m.nama,
    warna_sel: m.warna,
    beban: Object.fromEntries(kelas.map((k) => [k.id, m.jp]))
  }))

  // Satu blok = 2 JP. Urutan item disebar agar mapel yang sama tidak berdekatan.
  const urutan: string[] = []
  const salinan = MAPEL_CONTOH.map((m, i) => ({ kode: String(i + 1), blok: m.jp / 2 }))
  for (let putaran = 0; salinan.some((s) => s.blok > putaran); putaran++) {
    for (const s of salinan) if (s.blok > putaran) urutan.push(s.kode)
  }

  const slotKbm: Array<{ hari: string; slotId: string }> = []
  for (const [hari, def] of Object.entries(struktur.hari)) {
    for (const s of def.slots) if (s.tipe === 'kbm') slotKbm.push({ hari, slotId: s.id })
  }

  // Geseran 3 antar kelas menjamin guru yang sama tidak berada di dua kelas pada slot yang sama.
  const jadwal: JadwalGrid = {}
  const total = slotKbm.length
  kelas.forEach((k, ki) => {
    slotKbm.forEach(({ hari, slotId }, si) => {
      const kode = urutan[(si + ki * 3) % total]
      jadwal[hari] ??= {}
      jadwal[hari][slotId] ??= {}
      jadwal[hari][slotId][k.id] = [[kode], [kode]]
    })
  })

  const sekarang = new Date().toISOString()
  return {
    format_version: 2,
    app_version: '2.0.0',
    created_at: sekarang,
    updated_at: sekarang,
    meta: {
      nama_sekolah: 'SMP Contoh Nusantara',
      jenjang: 'SMP',
      semester: 'GANJIL',
      tahun_pelajaran: '2026/2027',
      kota_tanggal: 'Kota Contoh, 13 Juli 2026',
      pejabat_ttd: { jabatan: 'Kepala Sekolah', nama: 'Nama Kepala Sekolah', nip: '-' }
    },
    struktur_waktu: struktur,
    master: { kelas, guru, penugasan },
    jadwal
  }
}
