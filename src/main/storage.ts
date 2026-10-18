import fs from 'fs'
import path from 'path'
import { ProyekData } from '../core/types'
import { getPresetStrukturWaktu } from '../core/default-presets'

export const CURRENT_FORMAT_VERSION = 2
export const APP_VERSION = '2.0.0'
const DEFAULT_MAX_BACKUPS = 30

export interface SaveOptions {
  maxBackups?: number
  testDelayMs?: number
}

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

/**
 * Menyimpan data proyek secara atomik (tulis ke .tmp lalu rename)
 * disertai pencadangan bergilir otomatis (rotating backup) ke folder `cadangan/`.
 */
export async function saveProject(
  filePath: string,
  data: ProyekData,
  options: SaveOptions = {}
): Promise<void> {
  const maxBackups = options.maxBackups ?? DEFAULT_MAX_BACKUPS
  const folder = path.dirname(path.resolve(filePath))
  await fs.promises.mkdir(folder, { recursive: true })

  // Payload JSON siap simpan
  const payload: ProyekData = {
    ...data,
    format_version: CURRENT_FORMAT_VERSION,
    app_version: APP_VERSION,
    updated_at: new Date().toISOString()
  }
  const jsonString = JSON.stringify(payload, null, 2)

  // Buat berkas sementara di direktori yang sama agar rename bersifat atomik (same filesystem)
  const tmpPath = path.join(
    folder,
    `.${path.basename(filePath)}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  )

  try {
    await fs.promises.writeFile(tmpPath, jsonString, 'utf-8')

    // Jika berkas asli sudah ada, buat salinan cadangan sebelum menimpanya
    if (fs.existsSync(filePath) && maxBackups > 0) {
      const backupDir = path.join(folder, 'cadangan')
      await fs.promises.mkdir(backupDir, { recursive: true })

      const baseName = path.parse(filePath).name
      const stamp = formatDateStamp(new Date())
      const backupPath = path.join(backupDir, `${baseName}-${stamp}.jadwal`)

      try {
        await fs.promises.copyFile(filePath, backupPath)

        // Pangkas cadangan lama jika melebihi batas maxBackups
        const allFiles = await fs.promises.readdir(backupDir)
        const prefix = `${baseName}-`
        const relevantBackups = allFiles
          .filter((f) => f.startsWith(prefix) && f.endsWith('.jadwal'))
          .sort()

        if (relevantBackups.length > maxBackups) {
          const toDelete = relevantBackups.slice(0, relevantBackups.length - maxBackups)
          for (const oldFile of toDelete) {
            try {
              await fs.promises.unlink(path.join(backupDir, oldFile))
            } catch {
              // Abaikan kegagalan unlink cadangan lama
            }
          }
        }
      } catch {
        // Jangan batalkan penyimpanan utama jika pembuatan cadangan gagal
      }
    }

    if (options.testDelayMs) {
      await new Promise((r) => setTimeout(r, options.testDelayMs))
    }

    // Atomic replace
    await fs.promises.rename(tmpPath, filePath)
  } catch (error) {
    // Bersihkan file sementara jika terjadi error
    try {
      if (fs.existsSync(tmpPath)) {
        await fs.promises.unlink(tmpPath)
      }
    } catch {
      // Abaikan error unlink tmp
    }
    throw error
  }
}

/**
 * Memuat berkas proyek .jadwal dengan validasi skema format_version
 * dan migrasi otomatis dari format legacy (jadwal-mts v1).
 */
export async function loadProject(filePath: string): Promise<ProyekData> {
  const content = await fs.promises.readFile(filePath, 'utf-8')
  const raw = JSON.parse(content)

  const formatVer = raw.format_version ?? raw.format ?? 1

  if (typeof formatVer === 'number' && formatVer > CURRENT_FORMAT_VERSION) {
    throw new Error(
      `Berkas dibuat oleh versi aplikasi yang lebih baru (format ${formatVer}, aplikasi ini mendukung hingga ${CURRENT_FORMAT_VERSION}). Silakan perbarui aplikasi.`
    )
  }

  // Migrasi berkas legacy (v1 dari jadwal-mts) ke skema v2
  if (formatVer === 1) {
    return migrateV1ToV2(raw)
  }

  return raw as ProyekData
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
