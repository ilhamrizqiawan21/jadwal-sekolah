import fs from 'fs'
import path from 'path'
import { ProyekData, InfoCadangan } from '../core/types'
import { getPresetStrukturWaktu } from '../core/default-presets'
import { pastikanProyekValid } from '../core/project-validator'

export const CURRENT_FORMAT_VERSION = 2
export const APP_VERSION = '2.0.0'
const DEFAULT_MAX_BACKUPS = 30
const MAX_MANUAL_SNAPSHOTS = 100
const MAX_FILE_BYTES = 64 * 1024 * 1024
const BACKUP_DIR_NAME = 'cadangan'

export interface SaveOptions {
  maxBackups?: number
  testDelayMs?: number
  /**
   * 'always'    : salin berkas lama ke cadangan setiap kali menimpa (simpan manual)
   * 'throttled' : salin hanya jika cadangan otomatis terakhir lebih tua dari backupIntervalMs
   * 'never'     : tanpa cadangan
   */
  backup?: 'always' | 'throttled' | 'never'
  backupIntervalMs?: number
}

export type BackupInfo = InfoCadangan

function formatDateStamp(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${y}${m}${d}-${hh}${mm}${ss}${ms}`
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function backupPattern(baseName: string): RegExp {
  return new RegExp(`^${escapeRegExp(baseName)}-(\\d{8})-(\\d{9})(-manual)?\\.jadwal$`)
}

function parseStamp(date: string, time: string): Date {
  return new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8)),
    Number(time.slice(0, 2)),
    Number(time.slice(2, 4)),
    Number(time.slice(4, 6)),
    Number(time.slice(6, 9))
  )
}

export function backupDirFor(filePath: string): string {
  return path.join(path.dirname(path.resolve(filePath)), BACKUP_DIR_NAME)
}

/** Daftar cadangan milik satu berkas proyek, terbaru lebih dulu. */
export async function listBackups(filePath: string): Promise<BackupInfo[]> {
  const dir = backupDirFor(filePath)
  const pattern = backupPattern(path.parse(filePath).name)
  let entries: string[]
  try {
    entries = await fs.promises.readdir(dir)
  } catch {
    return []
  }
  const result: BackupInfo[] = []
  for (const name of entries) {
    const m = pattern.exec(name)
    if (!m) continue
    try {
      const full = path.join(dir, name)
      const stat = await fs.promises.stat(full)
      result.push({
        name,
        path: full,
        size: stat.size,
        createdAt: parseStamp(m[1], m[2]).toISOString(),
        manual: Boolean(m[3])
      })
    } catch {
      // berkas hilang di tengah pembacaan; lewati
    }
  }
  return result.sort((a, b) => (a.name < b.name ? 1 : -1))
}

async function pruneBackups(filePath: string, maxBackups: number): Promise<void> {
  const all = await listBackups(filePath)
  const batas = [
    { items: all.filter((b) => !b.manual), max: maxBackups },
    { items: all.filter((b) => b.manual), max: MAX_MANUAL_SNAPSHOTS }
  ]
  for (const { items, max } of batas) {
    for (const old of items.slice(max)) {
      await fs.promises.unlink(old.path).catch(() => {})
    }
  }
}

async function writeFileDurable(target: string, content: string): Promise<void> {
  const handle = await fs.promises.open(target, 'w')
  try {
    await handle.writeFile(content, 'utf-8')
    await handle.sync()
  } finally {
    await handle.close()
  }
}

function serialize(data: ProyekData): string {
  const payload: ProyekData = {
    ...data,
    format_version: CURRENT_FORMAT_VERSION,
    app_version: APP_VERSION,
    updated_at: new Date().toISOString()
  }
  return JSON.stringify(payload, null, 2)
}

/**
 * Menyimpan data proyek secara atomik (tulis ke .tmp lalu rename)
 * disertai pencadangan bergilir otomatis ke folder `cadangan/`.
 */
export async function saveProject(
  filePath: string,
  data: ProyekData,
  options: SaveOptions = {}
): Promise<void> {
  const maxBackups = options.maxBackups ?? DEFAULT_MAX_BACKUPS
  const mode = options.backup ?? 'always'
  const folder = path.dirname(path.resolve(filePath))
  await fs.promises.mkdir(folder, { recursive: true })

  const jsonString = serialize(data)

  // Berkas sementara di direktori yang sama agar rename bersifat atomik
  const tmpPath = path.join(
    folder,
    `.${path.basename(filePath)}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  )

  try {
    await writeFileDurable(tmpPath, jsonString)

    if (fs.existsSync(filePath) && maxBackups > 0 && mode !== 'never') {
      try {
        let perluCadangan = true
        if (mode === 'throttled') {
          const terakhir = (await listBackups(filePath)).find((b) => !b.manual)
          const selang = options.backupIntervalMs ?? 10 * 60 * 1000
          if (terakhir && Date.now() - new Date(terakhir.createdAt).getTime() < selang) {
            perluCadangan = false
          }
        }
        if (perluCadangan) {
          const backupDir = backupDirFor(filePath)
          await fs.promises.mkdir(backupDir, { recursive: true })
          const stamp = formatDateStamp(new Date())
          const baseName = path.parse(filePath).name
          await fs.promises.copyFile(filePath, path.join(backupDir, `${baseName}-${stamp}.jadwal`))
          await pruneBackups(filePath, maxBackups)
        }
      } catch {
        // Jangan batalkan penyimpanan utama jika pembuatan cadangan gagal
      }
    }

    if (options.testDelayMs) {
      await new Promise((r) => setTimeout(r, options.testDelayMs))
    }

    await fs.promises.rename(tmpPath, filePath)
  } catch (error) {
    await fs.promises.unlink(tmpPath).catch(() => {})
    throw error
  }
}

/**
 * Membuat cadangan manual (tidak ikut dipangkas oleh rotasi otomatis) dari data
 * yang sedang dikerjakan, tanpa menimpa berkas proyek.
 */
export async function createManualSnapshot(
  filePath: string,
  data: ProyekData
): Promise<BackupInfo> {
  const backupDir = backupDirFor(filePath)
  await fs.promises.mkdir(backupDir, { recursive: true })
  const baseName = path.parse(filePath).name
  const name = `${baseName}-${formatDateStamp(new Date())}-manual.jadwal`
  const target = path.join(backupDir, name)
  await writeFileDurable(target, serialize(data))
  await pruneBackups(filePath, DEFAULT_MAX_BACKUPS)
  const stat = await fs.promises.stat(target)
  const m = backupPattern(baseName).exec(name)!
  return {
    name,
    path: target,
    size: stat.size,
    createdAt: parseStamp(m[1], m[2]).toISOString(),
    manual: true
  }
}

/** Hanya berkas yang benar-benar terdaftar sebagai cadangan dari `filePath` boleh diakses. */
export async function resolveBackup(filePath: string, backupPath: string): Promise<BackupInfo> {
  const resolved = path.resolve(backupPath)
  const found = (await listBackups(filePath)).find((b) => path.resolve(b.path) === resolved)
  if (!found) throw new Error('Berkas cadangan tidak ditemukan atau bukan milik proyek ini')
  return found
}

export async function deleteBackup(filePath: string, backupPath: string): Promise<void> {
  const info = await resolveBackup(filePath, backupPath)
  await fs.promises.unlink(info.path)
}

// ------------------------------------------------------------------ Draf pemulihan
const DRAFT_NAME = 'draf-pemulihan.jadwal'

export async function saveDraft(dir: string, data: ProyekData): Promise<void> {
  await fs.promises.mkdir(dir, { recursive: true })
  const target = path.join(dir, DRAFT_NAME)
  const tmp = `${target}.${Date.now()}.tmp`
  try {
    await writeFileDurable(tmp, serialize(data))
    await fs.promises.rename(tmp, target)
  } catch (error) {
    await fs.promises.unlink(tmp).catch(() => {})
    throw error
  }
}

export async function loadDraft(
  dir: string
): Promise<{ data: ProyekData; savedAt: string } | null> {
  const target = path.join(dir, DRAFT_NAME)
  try {
    const stat = await fs.promises.stat(target)
    const data = await loadProject(target)
    return { data, savedAt: stat.mtime.toISOString() }
  } catch {
    return null
  }
}

export async function clearDraft(dir: string): Promise<void> {
  await fs.promises.unlink(path.join(dir, DRAFT_NAME)).catch(() => {})
}

/**
 * Memuat berkas proyek .jadwal dengan validasi skema format_version
 * dan migrasi otomatis dari format legacy (jadwal-mts v1).
 */
export async function loadProject(filePath: string): Promise<ProyekData> {
  const stat = await fs.promises.stat(filePath)
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error('Ukuran berkas terlalu besar untuk berkas jadwal')
  }

  const content = await fs.promises.readFile(filePath, 'utf-8')
  let raw: any
  try {
    raw = JSON.parse(content)
  } catch {
    throw new Error('Berkas bukan berkas jadwal yang valid atau isinya rusak')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Berkas bukan berkas jadwal yang valid atau isinya rusak')
  }

  const formatVer = raw.format_version ?? raw.format ?? 1

  if (typeof formatVer === 'number' && formatVer > CURRENT_FORMAT_VERSION) {
    throw new Error(
      `Berkas dibuat oleh versi aplikasi yang lebih baru (format ${formatVer}, aplikasi ini mendukung hingga ${CURRENT_FORMAT_VERSION}). Silakan perbarui aplikasi.`
    )
  }

  // Migrasi berkas legacy (v1 dari jadwal-mts) ke skema v2
  if (formatVer === 1) {
    return pastikanProyekValid(migrateV1ToV2(raw))
  }

  return pastikanProyekValid(raw)
}

/**
 * Konverter migrasi dari struktur jadwal-mts v1 ke format modern v2
 */
function migrateV1ToV2(v1: any): ProyekData {
  const jenjang = 'SMP'
  const preset = getPresetStrukturWaktu(jenjang, 5)

  return {
    format_version: CURRENT_FORMAT_VERSION,
    app_version: APP_VERSION,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    meta: {
      nama_sekolah: v1.meta?.sekolah || '',
      jenjang,
      semester: (v1.meta?.semester || 'GANJIL').toUpperCase(),
      tahun_pelajaran: v1.meta?.tahun || '',
      kota_tanggal: v1.meta?.beban_ttd?.tempat_tanggal || '',
      pejabat_ttd: {
        jabatan: v1.meta?.beban_ttd?.jabatan || 'Kepala Sekolah',
        nama: v1.meta?.beban_ttd?.nama || '',
        nip: v1.meta?.beban_ttd?.nip || ''
      },
      kop_base64: v1.meta?.kop_png || '',
      ttd_base64: v1.meta?.ttd_png || ''
    },
    struktur_waktu: preset,
    master: {
      kelas: (v1.kelas || []).map((k: any, i: number) => ({
        id: k.id,
        nama: k.nama,
        wali_guru_id: k.wali || null,
        urutan: i + 1
      })),
      guru: (v1.guru || []).map((g: any) => ({
        id: g.id,
        nama: g.nama,
        jabatan: g.ket || '',
        tidak_bisa: g.tidak_bisa || {}
      })),
      penugasan: (v1.penugasan || []).map((a: any) => ({
        id: a.id,
        guru_id: a.guru,
        kode: a.kode || '',
        mapel: a.mapel || a.keterangan || '',
        warna_sel: a.warna || '#FFFFFF',
        bbt_jam: a.bbt,
        merah: a.merah || false,
        keterangan: a.keterangan || '',
        beban: a.beban || {}
      }))
    },
    jadwal: v1.jadwal || {}
  }
}

/**
 * Membersihkan file-file .tmp yang tertinggal akibat crash sebelumnya
 */
export async function cleanTempFiles(dirPath: string): Promise<void> {
  try {
    if (!fs.existsSync(dirPath)) return
    const entries = await fs.promises.readdir(dirPath)
    for (const entry of entries) {
      if (entry.endsWith('.tmp')) {
        try {
          await fs.promises.unlink(path.join(dirPath, entry))
        } catch {
          // Abaikan jika file sedang terkunci
        }
      }
    }
  } catch {
    // Abaikan jika direktori tidak dapat dibaca
  }
}
