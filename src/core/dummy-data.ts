import { CellContent, Guru, JadwalGrid, Kelas, Penugasan, ProyekData } from './types'
import { getPresetStrukturWaktu } from './default-presets'

interface DummyMapel {
  kode: string
  mapel: string
  guruIds: string[]
  kategori: string
  warna: string
}

const DUMMY_MAPEL: DummyMapel[] = [
  { kode: 'MAT', mapel: 'Matematika', guruIds: ['g1'], kategori: 'Wajib', warna: '#2563EB' },
  { kode: 'BIN', mapel: 'Bahasa Indonesia', guruIds: ['g2'], kategori: 'Wajib', warna: '#16A34A' },
  { kode: 'BIG', mapel: 'Bahasa Inggris', guruIds: ['g3'], kategori: 'Wajib', warna: '#7C3AED' },
  { kode: 'IPA', mapel: 'Ilmu Pengetahuan Alam', guruIds: ['g4', 'g10'], kategori: 'Wajib', warna: '#0891B2' },
  { kode: 'IPS', mapel: 'Ilmu Pengetahuan Sosial', guruIds: ['g5'], kategori: 'Wajib', warna: '#EA580C' },
  { kode: 'PPK', mapel: 'Pendidikan Pancasila', guruIds: ['g6'], kategori: 'Wajib', warna: '#DC2626' },
  { kode: 'PJOK', mapel: 'Pendidikan Jasmani', guruIds: ['g7'], kategori: 'Wajib', warna: '#CA8A04' },
  { kode: 'SENI', mapel: 'Seni dan Prakarya', guruIds: ['g8'], kategori: 'Wajib', warna: '#DB2777' },
  { kode: 'AGM', mapel: 'Pendidikan Agama', guruIds: ['g9'], kategori: 'Wajib', warna: '#4F46E5' },
  { kode: 'INF', mapel: 'Informatika', guruIds: ['g10'], kategori: 'Wajib', warna: '#0F766E' },
  { kode: 'BK', mapel: 'Bimbingan Konseling', guruIds: ['g11'], kategori: 'Pengembangan Diri', warna: '#9333EA' },
  { kode: 'MUL', mapel: 'Muatan Lokal', guruIds: ['g12'], kategori: 'Muatan Lokal', warna: '#65A30D' }
]

function makeGuru(id: string, index: number): Guru {
  return {
    id,
    nama: `Guru ${index}`,
    nip_nuptk: `DEMO-${String(index).padStart(4, '0')}`,
    kode_prefiks: `G${String(index).padStart(2, '0')}`,
    jabatan: 'Pendidik',
    warna_badge: ['#2563EB', '#16A34A', '#7C3AED', '#0891B2'][index % 4],
    tidak_bisa: id === 'g1' ? { Sabtu: ['B1'] } : {}
  }
}

export function createDummyProject(): ProyekData {
  const strukturWaktu = getPresetStrukturWaktu('SMP', 6, { jpPerSesi: 2 })
  const kelas: Kelas[] = [
    { id: 'c7a', nama: 'VII A', tingkat: 7, wali_guru_id: 'g1', urutan: 1 },
    { id: 'c7b', nama: 'VII B', tingkat: 7, wali_guru_id: 'g2', urutan: 2 },
    { id: 'c8a', nama: 'VIII A', tingkat: 8, wali_guru_id: 'g3', urutan: 3 },
    { id: 'c8b', nama: 'VIII B', tingkat: 8, wali_guru_id: 'g4', urutan: 4 },
    { id: 'c9a', nama: 'IX A', tingkat: 9, wali_guru_id: 'g5', urutan: 5 },
    { id: 'c9b', nama: 'IX B', tingkat: 9, wali_guru_id: 'g6', urutan: 6 }
  ]
  const guru = Array.from({ length: 12 }, (_, index) => makeGuru(`g${index + 1}`, index + 1))
  const beban: Record<string, Record<string, number>> = Object.fromEntries(
    DUMMY_MAPEL.map((item) => [item.kode, {}])
  )
  const jadwal: JadwalGrid = {}
  const hariAktif = Object.entries(strukturWaktu.hari).filter(([, hari]) => hari.aktif)

  for (const [hariIndex, [hariName, hari]] of hariAktif.entries()) {
    jadwal[hariName] = {}
    const sesiKbm = hari.slots.filter((slot) => slot.tipe === 'kbm')
    for (const [slotIndex, slot] of sesiKbm.entries()) {
      jadwal[hariName][slot.id] = {}
      for (const [kelasIndex, rombel] of kelas.entries()) {
        const mapel = DUMMY_MAPEL[(hariIndex + slotIndex + kelasIndex) % DUMMY_MAPEL.length]
        const cell: CellContent = [[mapel.kode], [mapel.kode]]
        jadwal[hariName][slot.id][rombel.id] = cell
        beban[mapel.kode][rombel.id] = (beban[mapel.kode][rombel.id] || 0) + slot.jp.length
      }
    }
  }

  const penugasan: Penugasan[] = DUMMY_MAPEL.map((item) => ({
    id: `a-${item.kode.toLowerCase()}`,
    guru_id: item.guruIds[0],
    guru_ids: item.guruIds.length > 1 ? item.guruIds : undefined,
    kode: item.kode,
    mapel: item.mapel,
    kategori: item.kategori,
    warna_sel: item.warna,
    bbt_jam: Object.values(beban[item.kode]).reduce((total, jp) => total + jp, 0),
    beban: beban[item.kode]
  }))
  const now = new Date().toISOString()

  return {
    format_version: 2,
    app_version: '2.0.0',
    created_at: now,
    updated_at: now,
    meta: {
      nama_sekolah: 'Lembaga Pendidikan Demo',
      jenis_lembaga: 'Lembaga Pendidikan',
      jenjang: 'SMP',
      jenjang_custom: '',
      semester: 'GANJIL',
      tahun_pelajaran: '2026/2027',
      kota_tanggal: 'Kota Demo, 1 Juli 2026',
      alamat_sekolah: 'Jl. Pendidikan No. 1, Kota Demo',
      notaris: 'Yayasan Pendidikan · SK DEMO-0001',
      pejabat_ttd: {
        jabatan: 'Pimpinan Lembaga',
        nama: 'Pimpinan Lembaga',
        nip: 'NIP-DEMO-0001'
      }
    },
    struktur_waktu: strukturWaktu,
    master: { kelas, guru, penugasan },
    jadwal
  }
}
