/**
 * Generator Ikon Resmi Aplikasi Jadwal Sekolah (128x128 PNG)
 * 100% offline via HTML5 Canvas tanpa dependensi eksternal.
 */
let cachedDefaultAppIcon: string | null = null

const DEFAULT_APP_ICON_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0F766E"/>
      <stop offset="50%" stop-color="#0D9488"/>
      <stop offset="100%" stop-color="#14B8A6"/>
    </linearGradient>
    <linearGradient id="badge" x1="86" y1="86" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="120" height="120" rx="28" fill="url(#bg)" stroke="#FDE047" stroke-width="3"/>
  <rect x="24" y="24" width="80" height="76" rx="10" fill="#FFFFFF"/>
  <path d="M24 34 a10 10 0 0 1 10 -10 h60 a10 10 0 0 1 10 10 v14 h-80 z" fill="#115E59"/>
  <rect x="37" y="18" width="6" height="12" rx="3" fill="#E2E8F0" stroke="#64748B" stroke-width="1.5"/>
  <rect x="61" y="18" width="6" height="12" rx="3" fill="#E2E8F0" stroke="#64748B" stroke-width="1.5"/>
  <rect x="85" y="18" width="6" height="12" rx="3" fill="#E2E8F0" stroke="#64748B" stroke-width="1.5"/>
  <rect x="34" y="54" width="26" height="6" rx="1" fill="#0F766E"/>
  <rect x="68" y="54" width="26" height="6" rx="1" fill="#0F766E"/>
  <rect x="34" y="66" width="18" height="5" rx="1" fill="#94A3B8"/>
  <rect x="58" y="66" width="18" height="5" rx="1" fill="#94A3B8"/>
  <rect x="82" y="66" width="12" height="5" rx="1" fill="#94A3B8"/>
  <rect x="34" y="76" width="18" height="5" rx="1" fill="#CBD5E1"/>
  <rect x="58" y="76" width="18" height="5" rx="1" fill="#CBD5E1"/>
  <rect x="82" y="76" width="12" height="5" rx="1" fill="#CBD5E1"/>
  <rect x="34" y="86" width="18" height="5" rx="1" fill="#CBD5E1"/>
  <rect x="58" y="86" width="18" height="5" rx="1" fill="#CBD5E1"/>
  <rect x="82" y="86" width="12" height="5" rx="1" fill="#CBD5E1"/>
  <circle cx="103" cy="103" r="17" fill="url(#badge)" stroke="#FEF3C7" stroke-width="2"/>
  <text x="103" y="108" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF" text-anchor="middle">JS</text>
</svg>`
  )

export function getDefaultAppIcon(): string {
  if (cachedDefaultAppIcon) return cachedDefaultAppIcon

  if (typeof document === 'undefined') {
    return DEFAULT_APP_ICON_SVG
  }

  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return DEFAULT_APP_ICON_SVG

  // 1. Background Rounded Rectangle dengan Gradien Emerald ke Teal
  const radius = 28
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#0F766E') // Emerald 700
  gradient.addColorStop(0.5, '#0D9488') // Teal 600
  gradient.addColorStop(1, '#14B8A6') // Teal 500

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.roundRect(4, 4, size - 8, size - 8, radius)
  ctx.fill()

  // Border emas halus
  ctx.strokeStyle = '#FDE047' // Yellow 300
  ctx.lineWidth = 3
  ctx.stroke()

  // 2. Kalender Jadwal (Lembar Putih dengan Header Merah/Gold)
  const calX = 24
  const calY = 24
  const calW = 80
  const calH = 76
  const calRadius = 10

  // Bayangan kalender
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.beginPath()
  ctx.roundRect(calX + 2, calY + 4, calW, calH, calRadius)
  ctx.fill()

  // Badan kalender putih
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.roundRect(calX, calY, calW, calH, calRadius)
  ctx.fill()

  // Header Kalender (Emerald Gelap)
  ctx.fillStyle = '#115E59'
  ctx.beginPath()
  ctx.roundRect(calX, calY, calW, 22, [calRadius, calRadius, 0, 0])
  ctx.fill()

  // Cincin Gantungan Kalender (Binder Rings)
  ctx.fillStyle = '#E2E8F0'
  ctx.strokeStyle = '#64748B'
  ctx.lineWidth = 1.5

  const ringPositions = [calX + 16, calX + 40, calX + 64]
  for (const rx of ringPositions) {
    ctx.beginPath()
    ctx.roundRect(rx - 3, calY - 6, 6, 12, 3)
    ctx.fill()
    ctx.stroke()
  }

  // 3. Grid Garis-Garis Jadwal Pelajaran (Matriks KBM)
  ctx.fillStyle = '#0F766E'
  ctx.fillRect(calX + 10, calY + 30, 26, 6)
  ctx.fillRect(calX + 44, calY + 30, 26, 6)

  ctx.fillStyle = '#94A3B8'
  ctx.fillRect(calX + 10, calY + 42, 18, 5)
  ctx.fillRect(calX + 34, calY + 42, 18, 5)
  ctx.fillRect(calX + 58, calY + 42, 12, 5)

  ctx.fillStyle = '#CBD5E1'
  ctx.fillRect(calX + 10, calY + 52, 18, 5)
  ctx.fillRect(calX + 34, calY + 52, 18, 5)
  ctx.fillRect(calX + 58, calY + 52, 12, 5)

  ctx.fillStyle = '#CBD5E1'
  ctx.fillRect(calX + 10, calY + 62, 18, 5)
  ctx.fillRect(calX + 34, calY + 62, 18, 5)
  ctx.fillRect(calX + 58, calY + 62, 12, 5)

  // 4. Badge Monogram "JS" di pojok kanan bawah
  const badgeSize = 34
  const badgeX = size - badgeSize - 8
  const badgeY = size - badgeSize - 8

  // Bayangan badge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.beginPath()
  ctx.arc(badgeX + badgeSize / 2 + 1, badgeY + badgeSize / 2 + 2, badgeSize / 2, 0, Math.PI * 2)
  ctx.fill()

  // Lingkaran emas badge
  const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeSize, badgeY + badgeSize)
  badgeGrad.addColorStop(0, '#F59E0B') // Amber 500
  badgeGrad.addColorStop(1, '#D97706') // Amber 600
  ctx.fillStyle = badgeGrad
  ctx.beginPath()
  ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#FEF3C7'
  ctx.lineWidth = 2
  ctx.stroke()

  // Teks "JS"
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('JS', badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 1)

  cachedDefaultAppIcon = canvas.toDataURL('image/png')
  return cachedDefaultAppIcon
}

export function formatWindowTitle(namaSekolah?: string): string {
  const trimmed = namaSekolah?.trim()
  if (trimmed && trimmed !== 'Sekolah Baru') {
    return `${trimmed} - Jadwal Sekolah`
  }
  return 'Jadwal Sekolah'
}

