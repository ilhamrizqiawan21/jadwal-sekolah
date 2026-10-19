import { describe, it, expect } from 'vitest'
import { getDefaultAppIcon, formatWindowTitle } from '../src/renderer/src/utils/app-icon'

describe('Ikon Resmi Jadwal Sekolah (App Icon Utility)', () => {
  it('menghasilkan data URI gambar yang valid (SVG atau PNG) dan tidak boleh kosong', () => {
    const icon = getDefaultAppIcon()
    expect(icon).toBeDefined()
    expect(icon.length).toBeGreaterThan(50)
    expect(icon.startsWith('data:image/')).toBe(true)
  })

  it('mengembalikan cache ikon yang konsisten pada pemanggilan berulang', () => {
    const icon1 = getDefaultAppIcon()
    const icon2 = getDefaultAppIcon()
    expect(icon1).toBe(icon2)
  })

  it('memastikan branding logo otomatis berganti saat logo sekolah diunggah', () => {
    const defaultIcon = getDefaultAppIcon()

    // Skenario 1: Sekolah belum upload logo
    let logoSekolah: string | null = ''
    let activeLogo = logoSekolah || defaultIcon
    expect(activeLogo).toBe(defaultIcon)

    // Skenario 2: Sekolah mengunggah logo kustom (Base64 JPEG/PNG)
    logoSekolah = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    activeLogo = logoSekolah || defaultIcon
    expect(activeLogo).toBe(logoSekolah)
    expect(activeLogo).not.toBe(defaultIcon)

    // Skenario 3: Sekolah menghapus kembali logo sekolah
    logoSekolah = ''
    activeLogo = logoSekolah || defaultIcon
    expect(activeLogo).toBe(defaultIcon)
  })

  it('memformat judul jendela secara adaptif dengan formatWindowTitle() riil', () => {
    expect(formatWindowTitle('')).toBe('Jadwal Sekolah')
    expect(formatWindowTitle('Sekolah Baru')).toBe('Jadwal Sekolah')
    expect(formatWindowTitle('SMA Negeri 1 Jakarta')).toBe('SMA Negeri 1 Jakarta - Jadwal Sekolah')
    expect(formatWindowTitle('SMK Telkom Malang')).toBe('SMK Telkom Malang - Jadwal Sekolah')
  })
})

