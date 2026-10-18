import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  saveProject,
  loadProject,
  cleanTempFiles,
  CURRENT_FORMAT_VERSION
} from '../src/main/storage'
import { ProyekData } from '../src/core/types'
import { getPresetStrukturWaktu } from '../src/core/default-presets'

function createSampleProyek(): ProyekData {
  return {
    format_version: CURRENT_FORMAT_VERSION,
    app_version: '2.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    meta: {
      nama_sekolah: 'SMA Test Storage',
      jenjang: 'SMA',
      semester: 'GANJIL',
      tahun_pelajaran: '2026/2027',
      kota_tanggal: 'Jakarta, 14 Juli 2026',
      pejabat_ttd: {
        jabatan: 'Kepala Sekolah',
        nama: 'Dr. H. Sulaiman',
        nip: '197203151998021002'
      }
    },
    struktur_waktu: getPresetStrukturWaktu('SMA', 5),
    master: {
      kelas: [{ id: 'c1', nama: 'X-1', urutan: 1 }],
      guru: [{ id: 'g1', nama: 'Guru Satu', tidak_bisa: {} }],
      penugasan: [
        {
          id: 'a1',
          guru_id: 'g1',
          kode: '1',
          mapel: 'Matematika',
          beban: { c1: 4 }
        }
      ]
    },
    jadwal: {
      Senin: {
        B1: {
          c1: [['1'], ['1']]
        }
      }
    }
  }
}

describe('Storage & Persistence Module (src/main/storage.ts)', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jadwal-storage-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('berhasil menyimpan dan memuat kembali berkas .jadwal secara identik', async () => {
    const filePath = path.join(tempDir, 'jadwal-semester-ganjil.jadwal')
    const proyek = createSampleProyek()

    await saveProject(filePath, proyek)
    expect(fs.existsSync(filePath)).toBe(true)

    const loaded = await loadProject(filePath)
    expect(loaded.format_version).toBe(CURRENT_FORMAT_VERSION)
    expect(loaded.meta.nama_sekolah).toBe('SMA Test Storage')
    expect(loaded.master.guru[0].nama).toBe('Guru Satu')
    expect(loaded.jadwal.Senin.B1.c1).toEqual([['1'], ['1']])
  })

  it('menerapkan atomic write: tidak meninggalkan file .tmp jika gagal', async () => {
    const filePath = path.join(tempDir, 'jadwal-atomic.jadwal')
    const proyek = createSampleProyek()

    // Simpan pertama kali
    await saveProject(filePath, proyek)
    expect(fs.existsSync(filePath)).toBe(true)

    // Simulasikan kegagalan saat rename dengan membuat target file read-only / mock error
    const spyRename = vitest.spyOn(fs.promises, 'rename').mockRejectedValueOnce(new Error('EACCES: permission denied'))

    await expect(saveProject(filePath, { ...proyek, meta: { ...proyek.meta, nama_sekolah: 'Gagal' } })).rejects.toThrow()

    // File asli harus tetap utuh dengan isi lama
    const unchanged = await loadProject(filePath)
    expect(unchanged.meta.nama_sekolah).toBe('SMA Test Storage')

    // File sementara .tmp harus sudah dibersihkan
    const files = fs.readdirSync(tempDir)
    const tmpFiles = files.filter((f) => f.endsWith('.tmp'))
    expect(tmpFiles).toHaveLength(0)

    spyRename.mockRestore()
  })

  it('membuat pencadangan bergilir otomatis (rotating backup) maksimal 30 snapshot', async () => {
    const filePath = path.join(tempDir, 'jadwal-backup.jadwal')
    const backupDir = path.join(tempDir, 'cadangan')
    const proyek = createSampleProyek()

    // Simpan berkas awal
    await saveProject(filePath, proyek)

    // Lakukan penyimpanan berulang sebanyak 35 kali dengan interval mikro
    for (let i = 1; i <= 35; i++) {
      proyek.meta.nama_sekolah = `Versi ${i}`
      await saveProject(filePath, proyek, { maxBackups: 30, testDelayMs: 2 })
    }

    expect(fs.existsSync(backupDir)).toBe(true)
    const backupFiles = fs.readdirSync(backupDir).filter((f) => f.endsWith('.jadwal'))

    // Jumlah backup tidak boleh melebihi batas maksimal 30
    expect(backupFiles.length).toBeLessThanOrEqual(30)
  })

  it('menolak berkas dengan format_version yang lebih tinggi dari aplikasi', async () => {
    const filePath = path.join(tempDir, 'jadwal-future.jadwal')
    const futureData = {
      ...createSampleProyek(),
      format_version: CURRENT_FORMAT_VERSION + 99
    }

    fs.writeFileSync(filePath, JSON.stringify(futureData), 'utf-8')

    await expect(loadProject(filePath)).rejects.toThrow(/versi aplikasi yang lebih baru/i)
  })

  it('mampu memigrasikan data versi lama (format_version 1 dari jadwal-mts) ke format_version 2', async () => {
    const filePath = path.join(tempDir, 'jadwal-v1-legacy.jadwal')
    const legacyV1Data = {
      format: 1,
      meta: {
        sekolah: 'MTs Lama',
        semester: 'GANJIL',
        tahun: '2025/2026',
        beban_ttd: { jabatan: 'Kepala Madrasah', nama: 'Dra. Siti', nip: '1970' }
      },
      kelas: [{ id: 'c1', nama: '7A' }],
      guru: [{ id: 'g1', nama: 'Guru Lama', tidak_bisa: {} }],
      penugasan: [{ id: 'a1', guru: 'g1', kode: '1', mapel: 'Fikih', beban: { c1: 2 } }],
      jadwal: {
        Senin: {
          B1: { c1: [['1'], ['1']] }
        }
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(legacyV1Data), 'utf-8')

    const migrated = await loadProject(filePath)
    expect(migrated.format_version).toBe(CURRENT_FORMAT_VERSION)
    expect(migrated.meta.nama_sekolah).toBe('MTs Lama')
    expect(migrated.master.guru[0].nama).toBe('Guru Lama')
    expect(migrated.master.penugasan[0].guru_id).toBe('g1')
    expect(migrated.struktur_waktu.pola_hari).toBe(5)
  })

  it('membersihkan file temporary (.tmp) basi saat startup', async () => {
    const staleTmp1 = path.join(tempDir, 'stale1.tmp')
    const staleTmp2 = path.join(tempDir, 'stale2.tmp')
    const normalFile = path.join(tempDir, 'data.jadwal')

    fs.writeFileSync(staleTmp1, 'dummy')
    fs.writeFileSync(staleTmp2, 'dummy')
    fs.writeFileSync(normalFile, '{}')

    await cleanTempFiles(tempDir)

    const remaining = fs.readdirSync(tempDir)
    expect(remaining).toContain('data.jadwal')
    expect(remaining).not.toContain('stale1.tmp')
    expect(remaining).not.toContain('stale2.tmp')
  })
})
