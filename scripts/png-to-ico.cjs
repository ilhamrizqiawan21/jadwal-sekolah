const fs = require('fs')
const path = require('path')

const projectRoot = path.join(__dirname, '..')
const pngPath = path.join(projectRoot, 'resources', 'icon.png')
const icoPath = path.join(projectRoot, 'build', 'icon.ico')

if (!fs.existsSync(pngPath)) {
  throw new Error(`Ikon PNG tidak ditemukan: ${pngPath}`)
}

const png = fs.readFileSync(pngPath)
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(1, 4)

const entry = Buffer.alloc(16)
entry.writeUInt8(0, 0) // lebar 256px direpresentasikan dengan 0
entry.writeUInt8(0, 1) // tinggi 256px direpresentasikan dengan 0
entry.writeUInt8(0, 2) // jumlah warna pada palet
entry.writeUInt8(0, 3) // cadangan
entry.writeUInt16LE(1, 4) // planes
entry.writeUInt16LE(32, 6) // bits per pixel
entry.writeUInt32LE(png.length, 8)
entry.writeUInt32LE(22, 12)

fs.mkdirSync(path.dirname(icoPath), { recursive: true })
fs.writeFileSync(icoPath, Buffer.concat([header, entry, png]))
console.log(`Ikon Windows dibuat: ${icoPath}`)
