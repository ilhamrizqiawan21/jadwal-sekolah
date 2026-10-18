import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  saveProject,
  loadProject,
  listBackups,
  createManualSnapshot,
  resolveBackup,
  deleteBackup,
  saveDraft,
  loadDraft,
  clearDraft
} from '../src/main/storage'
import { buatProyekContoh } from '../src/core/sample-data'

let dir: string
let file: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jadwal-backup-'))
  file = path.join(dir, 'sekolah.jadwal')
})
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

async function simpanBeberapaKali(n: number, opsi = {}) {
  for (let i = 0; i < n; i++) {
    const p = buatProyekContoh()
    p.meta.nama_sekolah = `Versi ${i}`
    await saveProject(file, p, opsi)
    await new Promise((r) => setTimeout(r, 3))
  }
}

describe('cadangan bergilir', () => {
  it('menyimpan versi sebelumnya dan membatasi jumlahnya', async () => {
    await simpanBeberapaKali(8, { maxBackups: 3 })
    const daftar = await listBackups(file)
    expect(daftar).toHaveLength(3)
    expect(daftar[0].name > daftar[1].name).toBe(true)
    const terbaru = await loadProject(daftar[0].path)
    expect(terbaru.meta.nama_sekolah).toBe('Versi 6')
  })

  it('mode throttled tidak membuat cadangan baru bila terlalu rapat', async () => {
    await simpanBeberapaKali(6, { backup: 'throttled', backupIntervalMs: 60_000 })
    expect(await listBackups(file)).toHaveLength(1)
  })

  it('mode never tidak membuat cadangan', async () => {
    await simpanBeberapaKali(3, { backup: 'never' })
    expect(await listBackups(file)).toHaveLength(0)
  })

  it('cadangan manual tidak ikut terpangkas rotasi otomatis', async () => {
    await simpanBeberapaKali(1)
    const manual = await createManualSnapshot(file, buatProyekContoh())
    expect(manual.manual).toBe(true)
    await simpanBeberapaKali(6, { maxBackups: 2 })
    const daftar = await listBackups(file)
    expect(daftar.filter((b) => b.manual)).toHaveLength(1)
    expect(daftar.filter((b) => !b.manual)).toHaveLength(2)
  })

  it('tidak mencampur cadangan berkas lain yang namanya berawalan sama', async () => {
    await simpanBeberapaKali(2)
    const lain = path.join(dir, 'sekolah-b.jadwal')
    await saveProject(lain, buatProyekContoh())
    await saveProject(lain, buatProyekContoh())
    expect(await listBackups(file)).toHaveLength(1)
    expect(await listBackups(lain)).toHaveLength(1)
  })

  it('resolveBackup menolak jalur di luar daftar cadangan', async () => {
    await simpanBeberapaKali(2)
    const luar = path.join(dir, 'rahasia.jadwal')
    fs.writeFileSync(luar, '{}')
    await expect(resolveBackup(file, luar)).rejects.toThrow(/tidak ditemukan/)
    await expect(resolveBackup(file, path.join(dir, 'cadangan', '..', 'rahasia.jadwal'))).rejects.toThrow()
  })

  it('deleteBackup menghapus cadangan yang sah', async () => {
    await simpanBeberapaKali(2)
    const [satu] = await listBackups(file)
    await deleteBackup(file, satu.path)
    expect(await listBackups(file)).toHaveLength(0)
  })
})

describe('validasi saat memuat', () => {
  it('menolak berkas JSON rusak dengan pesan jelas', async () => {
    fs.writeFileSync(file, '{ bukan json')
    await expect(loadProject(file)).rejects.toThrow(/rusak/)
  })

  it('menolak berkas yang strukturnya tidak lengkap', async () => {
    fs.writeFileSync(file, JSON.stringify({ format_version: 2, meta: {} }))
    await expect(loadProject(file)).rejects.toThrow(/tidak valid/)
  })
})

describe('draf pemulihan', () => {
  it('menyimpan, memuat, dan menghapus draf', async () => {
    const draf = path.join(dir, 'pemulihan')
    expect(await loadDraft(draf)).toBeNull()
    await saveDraft(draf, buatProyekContoh())
    const hasil = await loadDraft(draf)
    expect(hasil?.data.meta.nama_sekolah).toBe('SMP Contoh Nusantara')
    await clearDraft(draf)
    expect(await loadDraft(draf)).toBeNull()
  })
})
