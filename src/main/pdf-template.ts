import { ProyekData } from '../core/types'
import { renggangkanLabel } from '../core/label-format'
import { cellTextJP } from '../core/cell-parser'

/**
 * Menghasilkan markup HTML dokumen resmi siap cetak ke PDF dengan kop surat,
 * matriks jadwal pelajaran, dan lembar beban mengajar guru.
 */
export function generateSchedulePrintHtml(data: ProyekData): string {
  const hasCustomLogo = Boolean(data.meta.logo_base64)
  const safeLogoUrl = hasCustomLogo ? sanitizeImageDataUrl(data.meta.logo_base64 || '') : null
  const isBannerKop = !hasCustomLogo && Boolean(data.meta.kop_base64)
  const safeKopBannerUrl = isBannerKop ? sanitizeImageDataUrl(data.meta.kop_base64 || '') : null
  const safeTtdUrl = sanitizeImageDataUrl(data.meta.ttd_base64 || '')
  const kelasList = data.master.kelas
  const guruMap = new Map(data.master.guru.map((g) => [g.id, g.nama]))

  // Helper render Kop Surat Resmi
  const renderKopHtml = () => {
    if (safeKopBannerUrl) {
      return `
        <div class="kop-banner-container">
          <img src="${safeKopBannerUrl}" class="kop-banner-img" alt="Kop Surat Resmi" />
        </div>
      `
    }
    return `
      <div class="kop-container">
        ${
          safeLogoUrl
            ? `<div class="kop-logo-wrapper">
                 <img src="${safeLogoUrl}" class="kop-logo" alt="Logo" />
               </div>`
            : ''
        }
        <div class="kop-text">
          ${data.meta.notaris ? `<div class="kop-notaris">${escapeHtml(data.meta.notaris)}</div>` : ''}
          <div class="kop-nama-sekolah">${escapeHtml((data.meta.nama_sekolah || 'SEKOLAH').toUpperCase())}</div>
          ${
            data.meta.alamat_sekolah
              ? `<div class="kop-alamat">${escapeHtml(data.meta.alamat_sekolah)}</div>`
              : ''
          }
        </div>
        ${safeLogoUrl ? '<div class="kop-spacer"></div>' : ''}
      </div>
      <div class="garis-kop"></div>
    `
  }

  // Helper render Tanda Tangan Pengesahan
  const rawNip = data.meta.pejabat_ttd?.nip || ''
  const nipFormatted = !rawNip || rawNip === '-' ? '-' : (rawNip.startsWith('NIP') ? rawNip : `NIP. ${rawNip}`)

  const renderTtdHtml = () => `
    <div class="ttd-section">
      <div class="ttd-box">
        <div class="ttd-tanggal">${escapeHtml(data.meta.kota_tanggal || 'Tanggal: ....................')}</div>
        <div class="ttd-jabatan">${escapeHtml(data.meta.pejabat_ttd?.jabatan || 'Kepala Sekolah')},</div>
        <div class="ttd-space">
          ${
            safeTtdUrl
              ? `<img src="${safeTtdUrl}" class="ttd-image" alt="Tanda Tangan" />`
              : ''
          }
        </div>
        <div class="ttd-nama">${escapeHtml(data.meta.pejabat_ttd?.nama || '........................................')}</div>
        <div class="ttd-nip">${escapeHtml(nipFormatted)}</div>
      </div>
    </div>
  `

  // -------------------------------------------------------------
  // Halaman 1: Matriks Jadwal Pelajaran Utama
  // -------------------------------------------------------------
  let jadwalRowsHtml = ''
  for (const [hari, hariKbm] of Object.entries(data.struktur_waktu.hari)) {
    if (!hariKbm.aktif) continue

    hariKbm.slots.forEach((slot, sIdx) => {
      const isKbm = slot.tipe === 'kbm'
      const jamKeLabel = isKbm ? (slot.jp.length > 0 ? slot.jp.join('-') : slot.label) : '—'
      const waktuLabel = formatSlotWaktu(slot.waktu)
      let cellsHtml = ''

      if (isKbm) {
        kelasList.forEach((k) => {
          const cell = data.jadwal[hari]?.[slot.id]?.[k.id]
          if (cell && cell.length > 0) {
            const a = cell[0] ? cell[0].join('/') : ''
            const b = cell.length > 1 ? (cell[1] ? cell[1].join('/') : '') : a
            const isSplit = cell.length > 1 && a !== b
            if (isSplit) {
              cellsHtml += `<td class="cell-kbm cell-kbm-split font-bold"><div class="split-wrapper"><span class="split-col split-left">${escapeHtml(a)}</span><span class="split-col split-right">${escapeHtml(b)}</span></div></td>`
            } else if (a || b) {
              cellsHtml += `<td class="cell-kbm font-bold">${escapeHtml(a || b)}</td>`
            } else {
              cellsHtml += `<td class="cell-empty"></td>`
            }
          } else {
            cellsHtml += `<td class="cell-empty"></td>`
          }
        })
      } else {
        const labelFormatted = `— ${renggangkanLabel(slot.label || '')} —`
        cellsHtml = `<td colspan="${kelasList.length}" class="cell-nonkbm-merged font-bold tracking-widest">${escapeHtml(labelFormatted)}</td>`
      }

      // Rowspan untuk kolom Hari
      const hariCell =
        sIdx === 0
          ? `<td rowspan="${hariKbm.slots.length}" class="cell-hari">${escapeHtml(hari)}</td>`
          : ''

      const isLastSlotOfDay = sIdx === hariKbm.slots.length - 1
      jadwalRowsHtml += `
        <tr class="${isKbm ? '' : 'row-nonkbm'} ${isLastSlotOfDay ? 'row-end-of-day' : ''}">
          ${hariCell}
          <td class="cell-jam font-bold">${escapeHtml(jamKeLabel)}</td>
          <td class="cell-waktu">${escapeHtml(waktuLabel)}</td>
          ${cellsHtml}
        </tr>
      `
    })
  }

  // -------------------------------------------------------------
  // Halaman 2: Lembar Beban Mengajar Guru
  // -------------------------------------------------------------
  let bebanRowsHtml = ''
  data.master.penugasan.forEach((p, idx) => {
    const guruNama =
      p.guru_ids && p.guru_ids.length > 0
        ? p.guru_ids.map((id) => guruMap.get(id) || '?').join(' & ')
        : guruMap.get(p.guru_id) || '?'

    let kelasJpHtml = ''
    kelasList.forEach((k) => {
      const jp = p.beban[k.id] || ''
      kelasJpHtml += `<td class="text-center">${escapeHtml(jp)}</td>`
    })

    const totalJp = Object.values(p.beban).reduce((sum, v) => sum + (v || 0), 0)

    bebanRowsHtml += `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-left font-semibold">${escapeHtml(guruNama)}</td>
        <td class="text-center font-bold text-emerald-800">${escapeHtml(p.kode)}</td>
        <td class="text-left">${escapeHtml(p.mapel)}</td>
        ${kelasJpHtml}
        <td class="text-center font-bold">${totalJp || ''}</td>
      </tr>
    `
  })

  // Baris Total JP Footer
  let totalPerKelasHtml = ''
  kelasList.forEach((k) => {
    const sumK = data.master.penugasan.reduce((acc, p) => acc + (p.beban[k.id] || 0), 0)
    totalPerKelasHtml += `<td class="text-center font-bold">${sumK || ''}</td>`
  })
  const grandTotalJP = data.master.penugasan.reduce((acc, p) => {
    return acc + Object.values(p.beban).reduce((s, v) => s + (v || 0), 0)
  }, 0)

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Cetak Dokumen Resmi Jadwal Sekolah</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm 10mm 10mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 9pt;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.25;
    }

    .page-break {
      page-break-before: always;
      break-before: page;
    }

    /* KOP SURAT */
    .kop-banner-container {
      text-align: center;
      margin-bottom: 6px;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
    }
    .kop-banner-img {
      width: 100%;
      max-height: 105px;
      object-fit: contain;
    }

    .kop-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .kop-logo-wrapper {
      width: 70px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .kop-logo {
      max-width: 65px;
      max-height: 65px;
      object-fit: contain;
    }
    .kop-text {
      flex: 1;
      text-align: center;
      padding: 0 10px;
    }
    .kop-notaris {
      font-size: 8.5pt;
      font-style: italic;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .kop-nama-sekolah {
      font-size: 15pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .kop-alamat {
      font-size: 8pt;
      color: #475569;
      margin-top: 3px;
    }
    .kop-spacer {
      width: 70px;
      flex-shrink: 0;
    }
    .garis-kop {
      border-top: 2px solid #000;
      border-bottom: 1px solid #000;
      height: 4px;
      margin: 4px 0 10px 0;
    }

    /* JUDUL DOKUMEN */
    .judul-box {
      text-align: center;
      margin-bottom: 8px;
    }
    .judul-utama {
      font-size: 11pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #0f172a;
    }
    .subjudul {
      font-size: 9pt;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* TABEL DOKUMEN */
    table.doc-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      margin-top: 4px;
    }
    table.doc-table th, table.doc-table td {
      border: 1px solid #64748b;
      padding: 3px 4px;
      font-size: 8pt;
    }
    table.doc-table th {
      background-color: #0f766e;
      color: #ffffff;
      font-weight: 700;
      text-align: center;
      vertical-align: middle;
    }
    table.doc-table td.cell-hari {
      background-color: #f8fafc;
      font-weight: 800;
      text-align: center;
      vertical-align: middle;
      font-size: 8.5pt;
      width: 55px;
    }
    table.doc-table td.cell-jam {
      text-align: center;
      font-weight: 600;
      width: 40px;
    }
    table.doc-table td.cell-waktu {
      text-align: center;
      font-size: 7.5pt;
      font-family: monospace;
      color: #334155;
      width: 82px;
      white-space: nowrap;
    }
    table.doc-table td.cell-kbm {
      text-align: center;
      font-size: 8.5pt;
      height: 22px;
    }
    table.doc-table td.cell-kbm-split {
      padding: 0;
      height: 22px;
    }
    .split-wrapper {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: stretch;
    }
    .split-col {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 1px;
      font-size: 7.5pt;
    }
    .split-left {
      border-right: 1px solid #64748b;
    }
    table.doc-table td.cell-empty {
      background-color: #ffffff;
    }
    table.doc-table tr.row-nonkbm td {
      background-color: #f1f5f9;
      color: #64748b;
      font-style: italic;
      text-align: center;
      font-size: 7.5pt;
    }
    table.doc-table td.cell-nonkbm-merged {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 700;
      letter-spacing: 2px;
      text-align: center;
      font-size: 8pt;
      padding: 3px 0;
    }
    table.doc-table tr.row-end-of-day td {
      border-bottom: 2px solid #0f172a;
    }

    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }

    /* BLOK TANDA TANGAN */
    .ttd-section {
      margin-top: 14px;
      display: flex;
      justify-content: flex-end;
      page-break-inside: avoid;
    }
    .ttd-box {
      width: 250px;
      text-align: center;
    }
    .ttd-tanggal {
      font-size: 8.5pt;
      margin-bottom: 2px;
    }
    .ttd-jabatan {
      font-size: 8.5pt;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .ttd-space {
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ttd-image {
      max-height: 48px;
      max-width: 140px;
      object-fit: contain;
    }
    .ttd-nama {
      font-size: 9pt;
      font-weight: 700;
      text-decoration: underline;
    }
    .ttd-nip {
      font-size: 8pt;
      color: #334155;
      margin-top: 1px;
    }
  </style>
</head>
<body>

  <!-- ========================================================= -->
  <!-- HALAMAN 1: MATRIKS JADWAL PELAJARAN UTAMA -->
  <!-- ========================================================= -->
  <div class="page-container">
    ${renderKopHtml()}

    <div class="judul-box">
      <div class="judul-utama">JADWAL PELAJARAN UTAMA</div>
      <div class="subjudul">SEMESTER ${escapeHtml(data.meta.semester || '-')} - TAHUN PELAJARAN ${escapeHtml(data.meta.tahun_pelajaran || '-')}</div>
    </div>

    <table class="doc-table">
      <thead>
        <tr>
          <th>Hari</th>
          <th>Jam Ke</th>
          <th>Waktu</th>
          ${kelasList.map((k) => `<th>${escapeHtml(k.nama)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${jadwalRowsHtml}
      </tbody>
    </table>

    ${renderTtdHtml()}
  </div>

  <!-- ========================================================= -->
  <!-- HALAMAN 2: DAFTAR BEBAN MENGAJAR GURU -->
  <!-- ========================================================= -->
  <div class="page-container page-break">
    ${renderKopHtml()}

    <div class="judul-box">
      <div class="judul-utama">DAFTAR PEMBAGIAN TUGAS DAN BEBAN MENGAJAR GURU</div>
      <div class="subjudul">TAHUN PELAJARAN ${escapeHtml(data.meta.tahun_pelajaran || '-')} - SEMESTER ${escapeHtml(data.meta.semester || '-')}</div>
    </div>

    <table class="doc-table">
      <thead>
        <tr>
          <th style="width: 30px;">No</th>
          <th>Nama Guru & Gelar</th>
          <th style="width: 45px;">Kode</th>
          <th>Mata Pelajaran</th>
          ${kelasList.map((k) => `<th>${escapeHtml(k.nama)}</th>`).join('')}
          <th style="width: 55px;">Total JP</th>
        </tr>
      </thead>
      <tbody>
        ${bebanRowsHtml}
        <tr style="background-color: #f8fafc; font-weight: bold;">
          <td colspan="4" class="text-center font-bold">TOTAL ALOKASI JAM PER KELAS</td>
          ${totalPerKelasHtml}
          <td class="text-center font-bold">${grandTotalJP || ''}</td>
        </tr>
      </tbody>
    </table>

    ${renderTtdHtml()}
  </div>

</body>
</html>
  `
}

function escapeHtml(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function sanitizeImageDataUrl(dataUrl: string): string | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null
  const trimmed = dataUrl.trim()
  if (/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return trimmed
  }
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 20) {
    return `data:image/jpeg;base64,${trimmed}`
  }
  return null
}

function formatSlotWaktu(waktuList: string[]): string {
  if (!waktuList || waktuList.length === 0) return '—'
  if (waktuList.length === 1) return waktuList[0].replace('-', ' - ')
  const first = waktuList[0].split('-')[0].trim()
  const last =
    waktuList[waktuList.length - 1].split('-')[1]?.trim() ||
    waktuList[waktuList.length - 1].split('-')[0].trim()
  return `${first} - ${last}`
}
