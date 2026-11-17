import { CellContent, Guru, JadwalGrid, Kelas, Penugasan, ProyekData } from './types'
import { getPresetStrukturWaktu } from './default-presets'

interface DummyMapel {
  kode: string
  mapel: string
  guruIds: string[]
  kelompok: string
  kategori: string
  warna: string
  keterangan: string
}

interface DummyGuruSeed {
  id: string
  nama: string
  nip_nuptk: string
  kode_prefiks: string
  jabatan: string
  warna_badge: string
  tidak_bisa: Record<string, string[]>
}

const DUMMY_GURU: DummyGuruSeed[] = [
  {
    id: 'g1',
    nama: 'Drs. Ahmad Fauzi, M.Pd.',
    nip_nuptk: '197504122005011001',
    kode_prefiks: 'AF',
    jabatan: 'Waka Kurikulum & Guru Matematika',
    warna_badge: '#2563EB',
    tidak_bisa: { Sabtu: ['B1'] }
  },
  {
    id: 'g2',
    nama: 'Siti Rahmawati, S.Pd.',
    nip_nuptk: '198108172006042002',
    kode_prefiks: 'SR',
    jabatan: 'Wali Kelas VII B & Guru Bahasa Indonesia',
    warna_badge: '#16A34A',
    tidak_bisa: {}
  },
  {
    id: 'g3',
    nama: 'Budi Santoso, S.Pd.',
    nip_nuptk: '198302252008011003',
    kode_prefiks: 'BS',
    jabatan: 'Wali Kelas VIII A & Guru Bahasa Inggris',
    warna_badge: '#7C3AED',
    tidak_bisa: {}
  },
  {
    id: 'g4',
    nama: 'Dewi Lestari, M.Si.',
    nip_nuptk: '198411032009022004',
    kode_prefiks: 'DL',
    jabatan: 'Wali Kelas VIII B & Guru IPA',
    warna_badge: '#0891B2',
    tidak_bisa: {}
  },
  {
    id: 'g5',
    nama: 'Hendra Wijaya, S.Pd.',
    nip_nuptk: '198006142007011005',
    kode_prefiks: 'HW',
    jabatan: 'Wali Kelas IX A & Guru IPS',
    warna_badge: '#EA580C',
    tidak_bisa: {}
  },
  {
    id: 'g6',
    nama: 'Nurul Hidayah, S.Pd.',
    nip_nuptk: '198609212010012006',
    kode_prefiks: 'NH',
    jabatan: 'Wali Kelas IX B & Guru Pendidikan Pancasila',
    warna_badge: '#DC2626',
    tidak_bisa: {}
  },
  {
    id: 'g7',
    nama: 'Rizky Pratama, S.Or.',
    nip_nuptk: '198903102014021007',
    kode_prefiks: 'RP',
    jabatan: 'Pembina OSIS & Guru PJOK',
    warna_badge: '#CA8A04',
    tidak_bisa: {}
  },
  {
    id: 'g8',
    nama: 'Ratna Sari, S.Sn.',
    nip_nuptk: '198707192011012008',
    kode_prefiks: 'RS',
    jabatan: 'Guru Seni dan Prakarya',
    warna_badge: '#DB2777',
    tidak_bisa: {}
  },
  {
    id: 'g9',
    nama: 'M. Ridwan, S.Ag.',
    nip_nuptk: '197912052005011009',
    kode_prefiks: 'MR',
    jabatan: 'Guru Pendidikan Agama',
    warna_badge: '#4F46E5',
    tidak_bisa: { Senin: ['B1'] }
  },
  {
    id: 'g10',
    nama: 'Fajar Nugroho, S.Kom.',
    nip_nuptk: '199105282019031010',
    kode_prefiks: 'FN',
    jabatan: 'Kepala Lab & Guru Informatika',
    warna_badge: '#0F766E',
    tidak_bisa: {}
  },
  {
    id: 'g11',
    nama: 'Intan Permata, S.Psi.',
    nip_nuptk: '199001152015022011',
    kode_prefiks: 'IP',
    jabatan: 'Koordinator BK',
    warna_badge: '#9333EA',
    tidak_bisa: { Senin: ['B1', 'B2'] }
  },
  {
    id: 'g12',
    nama: 'Agus Setiawan, S.Pd.',
    nip_nuptk: '198504082010011012',
    kode_prefiks: 'AS',
    jabatan: 'Guru Muatan Lokal',
    warna_badge: '#65A30D',
    tidak_bisa: { Selasa: ['B1'] }
  }
]

const DUMMY_MAPEL: DummyMapel[] = [
  { kode: 'MAT', mapel: 'Matematika', guruIds: ['g1'], kelompok: 'Kelompok A (Umum)', kategori: 'Wajib', warna: '#2563EB', keterangan: 'Mata pelajaran wajib inti' },
  { kode: 'BIN', mapel: 'Bahasa Indonesia', guruIds: ['g2'], kelompok: 'Kelompok A (Umum)', kategori: 'Wajib', warna: '#16A34A', keterangan: 'Literasi dan bahasa nasional' },
  { kode: 'BIG', mapel: 'Bahasa Inggris', guruIds: ['g3'], kelompok: 'Kelompok A (Umum)', kategori: 'Wajib', warna: '#7C3AED', keterangan: 'Bahasa asing wajib' },
  { kode: 'IPA', mapel: 'Ilmu Pengetahuan Alam', guruIds: ['g4', 'g10'], kelompok: 'Kelompok A (Umum)', kategori: 'Wajib', warna: '#0891B2', keterangan: 'Tim pengajar teori dan praktikum lab' },
  { kode: 'IPS', mapel: 'Ilmu Pengetahuan Sosial', guruIds: ['g5'], kelompok: 'Kelompok A (Umum)', kategori: 'Wajib', warna: '#EA580C', keterangan: 'Kajian sosial dan sejarah' },
  { kode: 'PPK', mapel: 'Pendidikan Pancasila', guruIds: ['g6'], kelompok: 'Kelompok A (Umum)', kategori: 'Wajib', warna: '#DC2626', keterangan: 'Pendidikan karakter dan kewarganegaraan' },
  { kode: 'PJOK', mapel: 'Pendidikan Jasmani', guruIds: ['g7'], kelompok: 'Kelompok B (Keterampilan)', kategori: 'Wajib', warna: '#CA8A04', keterangan: 'Olahraga dan kebugaran jasmani' },
  { kode: 'SENI', mapel: 'Seni dan Prakarya', guruIds: ['g8'], kelompok: 'Kelompok B (Keterampilan)', kategori: 'Wajib', warna: '#DB2777', keterangan: 'Ekspresi seni rupa, musik, dan prakarya' },
  { kode: 'AGM', mapel: 'Pendidikan Agama', guruIds: ['g9'], kelompok: 'Kelompok A (Umum)', kategori: 'Wajib', warna: '#4F46E5', keterangan: 'Pembinaan iman dan akhlak' },
  { kode: 'INF', mapel: 'Informatika', guruIds: ['g10'], kelompok: 'Kelompok B (Keterampilan)', kategori: 'Wajib', warna: '#0F766E', keterangan: 'Literasi digital dan pemrograman dasar' },
  { kode: 'BK', mapel: 'Bimbingan Konseling', guruIds: ['g11'], kelompok: 'Layanan & Pengembangan', kategori: 'Pengembangan Diri', warna: '#9333EA', keterangan: 'Layanan bimbingan klasikal dan karier' },
  { kode: 'MUL', mapel: 'Muatan Lokal', guruIds: ['g12'], kelompok: 'Muatan Lokal', kategori: 'Muatan Lokal', warna: '#65A30D', keterangan: 'Bahasa dan budaya daerah' }
]

function makeGuru(seed: DummyGuruSeed): Guru {
  return {
    id: seed.id,
    nama: seed.nama,
    nip_nuptk: seed.nip_nuptk,
    kode_prefiks: seed.kode_prefiks,
    jabatan: seed.jabatan,
    warna_badge: seed.warna_badge,
    tidak_bisa: seed.tidak_bisa
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
  const guru = DUMMY_GURU.map(makeGuru)
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
    kelompok: item.kelompok,
    kategori: item.kategori,
    warna_sel: item.warna,
    bbt_jam: Object.values(beban[item.kode]).reduce((total, jp) => total + jp, 0),
    keterangan: item.keterangan,
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
