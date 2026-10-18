import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { daftarTerbaru, catatTerbaru, hapusSemuaTerbaru, jalurDariArgv } from '../src/main/recent-files'

let dir: string
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jadwal-recent-'))
})
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

function buat(n: string): string {
  const p = path.join(dir, n)
  fs.writeFileSync(p, '{}')
  return p
}

describe('berkas terbaru', () => {
  it('mencatat terbaru di atas tanpa duplikat dan membatasi jumlah', async () => {
    const a = buat('a.jadwal')
    for (let i = 0; i < 10; i++) await catatTerbaru(dir, buat(`f${i}.jadwal`))
    await catatTerbaru(dir, a)
    await catatTerbaru(dir, a)
    const list = await daftarTerbaru(dir)
    expect(list).toHaveLength(8)
    expect(list[0].filePath).toBe(a)
    expect(list.filter((r) => r.filePath === a)).toHaveLength(1)
  })

  it('membuang berkas yang sudah tidak ada', async () => {
    const a = buat('a.jadwal')
    await catatTerbaru(dir, a)
    fs.unlinkSync(a)
    expect(await daftarTerbaru(dir)).toEqual([])
  })

  it('tahan terhadap berkas daftar yang rusak dan bisa dikosongkan', async () => {
    fs.writeFileSync(path.join(dir, 'berkas-terbaru.json'), 'bukan json')
    expect(await daftarTerbaru(dir)).toEqual([])
    await catatTerbaru(dir, buat('b.jadwal'))
    await hapusSemuaTerbaru(dir)
    expect(await daftarTerbaru(dir)).toEqual([])
  })
})

describe('jalurDariArgv', () => {
  it('mengambil jalur .jadwal absolut dan mengabaikan flag', () => {
    const abs = path.resolve('/tmp/x.jadwal')
    expect(jalurDariArgv(['app.exe', '--flag', abs])).toBe(abs)
    expect(jalurDariArgv(['app.exe', 'relatif.jadwal'])).toBeNull()
    expect(jalurDariArgv(['app.exe', path.resolve('/tmp/x.txt')])).toBeNull()
  })
})
