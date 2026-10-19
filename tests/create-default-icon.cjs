const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    webPreferences: {
      offscreen: true
    }
  })

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;overflow:hidden;background:transparent;">
  <canvas id="c" width="256" height="256"></canvas>
  <script>
    const canvas = document.getElementById('c')
    const ctx = canvas.getContext('2d')
    const size = 256

    // Gradien Emerald
    const radius = 56
    const grad = ctx.createLinearGradient(0, 0, size, size)
    grad.addColorStop(0, '#0F766E')
    grad.addColorStop(0.5, '#0D9488')
    grad.addColorStop(1, '#14B8A6')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(8, 8, size - 16, size - 16, radius)
    ctx.fill()
    ctx.strokeStyle = '#FDE047'
    ctx.lineWidth = 6
    ctx.stroke()

    // Kalender Jadwal
    const calX = 48, calY = 48, calW = 160, calH = 152, calR = 20
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.roundRect(calX + 4, calY + 8, calW, calH, calR)
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.roundRect(calX, calY, calW, calH, calR)
    ctx.fill()

    ctx.fillStyle = '#115E59'
    ctx.beginPath()
    ctx.roundRect(calX, calY, calW, 44, [calR, calR, 0, 0])
    ctx.fill()

    // Rings
    ctx.fillStyle = '#E2E8F0'
    ctx.strokeStyle = '#64748B'
    ctx.lineWidth = 3
    for (const rx of [calX + 32, calX + 80, calX + 128]) {
      ctx.beginPath()
      ctx.roundRect(rx - 6, calY - 12, 12, 24, 6)
      ctx.fill()
      ctx.stroke()
    }

    // Grid KBM
    ctx.fillStyle = '#0F766E'
    ctx.fillRect(calX + 20, calY + 60, 52, 12)
    ctx.fillRect(calX + 88, calY + 60, 52, 12)

    ctx.fillStyle = '#94A3B8'
    ctx.fillRect(calX + 20, calY + 84, 36, 10)
    ctx.fillRect(calX + 68, calY + 84, 36, 10)
    ctx.fillRect(calX + 116, calY + 84, 24, 10)

    ctx.fillStyle = '#CBD5E1'
    ctx.fillRect(calX + 20, calY + 104, 36, 10)
    ctx.fillRect(calX + 68, calY + 104, 36, 10)
    ctx.fillRect(calX + 116, calY + 104, 24, 10)

    ctx.fillStyle = '#CBD5E1'
    ctx.fillRect(calX + 20, calY + 124, 36, 10)
    ctx.fillRect(calX + 68, calY + 124, 36, 10)
    ctx.fillRect(calX + 116, calY + 124, 24, 10)

    // Badge JS
    const bSize = 68, bX = size - bSize - 16, bY = size - bSize - 16
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.arc(bX + bSize/2 + 2, bY + bSize/2 + 4, bSize/2, 0, Math.PI * 2)
    ctx.fill()

    const bGrad = ctx.createLinearGradient(bX, bY, bX + bSize, bY + bSize)
    bGrad.addColorStop(0, '#F59E0B')
    bGrad.addColorStop(1, '#D97706')
    ctx.fillStyle = bGrad
    ctx.beginPath()
    ctx.arc(bX + bSize/2, bY + bSize/2, bSize/2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#FEF3C7'
    ctx.lineWidth = 4
    ctx.stroke()

    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 30px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('JS', bX + bSize/2, bY + bSize/2 + 2)
  </script>
</body>
</html>`

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  await new Promise((r) => setTimeout(r, 400))

  const image = await win.webContents.capturePage()
  const pngBuffer = image.toPNG()

  const resourcesDir = path.join(__dirname, '../resources')
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true })
  }
  fs.writeFileSync(path.join(resourcesDir, 'icon.png'), pngBuffer)
  console.log('SUCCESS: resources/icon.png created, size:', pngBuffer.length)
  app.quit()
})

