/**
 * Model data & types untuk Jadwal Sekolah (v2)
 * Pure TypeScript — 0 UI dependency
 */

export type TingkatTingkat = 'SD' | 'SMP' | 'SMA' | 'SMK' | 'LAINNYA'
export type SemesterTipe = 'GANJIL' | 'GENAP'
export type SlotTipe = 'kbm' | 'jeda' | 'upacara' | 'ibadah' | 'tutup'
export type MasalahTingkat = 'error' | 'warn' | 'info'
export type MasalahJenis =
  | 'bentrok'
  | 'tidak_bisa'
  | 'kode_asing'
  | 'beban_lebih'
  | 'beban_kurang'
  | 'kode_ganda'

export interface PejabatTtd {
  jabatan: string
  nama: string
  nip: string
}

export interface Metadata {
  nama_sekolah: string
  jenjang: TingkatTingkat
  semester: SemesterTipe
  tahun_pelajaran: string
  kota_tanggal: string
  pejabat_ttd: PejabatTtd
  kop_base64?: string
  ttd_base64?: string
}

export interface SlotJam {
  id: string // e.g. "B1", "UP", "JD1"
  tipe: SlotTipe
  label: string
  waktu: string[] // e.g. ["07.00-07.45", "07.45-08.30"]
  jp: number[] // e.g. [1, 2]
  warna?: string
}

export interface HariKBM {
  aktif: boolean
  judul: string // e.g. "SENIN"
  slots: SlotJam[]
}

export interface StrukturWaktu {
  pola_hari: 5 | 6
  durasi_jp_menit: number
  hari: Record<string, HariKBM>
}

export interface Guru {
  id: string
  nama: string
  nip_nuptk?: string
  nip?: string
  kode_prefiks?: string
  jabatan?: string
  warna_badge?: string
  warna?: string
  // permintaan jam: { hari: [slot_id, ...] }
  tidak_bisa: Record<string, string[]>
}

export interface Kelas {
  id: string
  nama: string
  tingkat?: number
  wali_guru_id?: string | null
  urutan?: number
}

export interface Penugasan {
  id: string
  guru_id: string
  guru_ids?: string[]
  kode: string
  mapel: string
  kelompok?: string
  kategori?: string
  warna_sel?: string
  warna?: string
  bbt_jam?: number
  merah?: boolean
  keterangan?: string
  // beban: { [kelas_id]: target_jp }
  beban: Record<string, number>
}

export interface ProyekMaster {
  kelas: Kelas[]
  guru: Guru[]
  penugasan: Penugasan[]
}

// jadwal[hari][slot_id][kelas_id] = [ [jp1_kodes], [jp2_kodes] ]
export type CellContent = string[][]
export type JadwalGrid = Record<string, Record<string, Record<string, CellContent>>>

export interface ProyekData {
  format_version: number
  app_version: string
  created_at: string
  updated_at: string
  meta: Metadata
  struktur_waktu: StrukturWaktu
  master: ProyekMaster
  jadwal: JadwalGrid
  seq?: number
}

// ------------------------------------------------------------- Validasi / Masalah
export type SelKoordinat = [string, string, string] // [hari, slot_id, kelas_id]

export interface Masalah {
  jenis: MasalahJenis
  tingkat: MasalahTingkat
  pesan: string
  ringkas: string
  sel: SelKoordinat[]
  guru_id?: string
  kode?: string
}

export interface HasilPemeriksaan {
  masalah: Masalah[]
  per_sel: Record<string, Masalah[]> // key: "hari:slot_id:kelas_id"
  terpasang: Record<string, number> // key: "KODE:kelas_id" -> jumlah JP
  jumlah: (tingkat: MasalahTingkat) => number
  adaError: () => boolean
}
