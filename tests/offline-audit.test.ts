import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

function getFilesRecursively(dir: string, extensions: string[]): string[] {
  let results: string[] = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, extensions))
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      results.push(fullPath)
    }
  }
  return results
}

describe('Offline Integrity & Security Guard Rail (Fase 8 NFR)', () => {
  it('memastikan aplikasi 100% offline tanpa panggilan fetch, axios, atau URL remote di src/', () => {
    const srcDir = path.resolve(__dirname, '../src')
    const files = getFilesRecursively(srcDir, ['.ts', '.vue', '.js'])

    const forbiddenPatterns = [
      /fetch\s*\(/i,
      /axios\./i,
      /https?:\/\/(?!localhost|127\.0\.0\.1)/i,
      /WebSocket\s*\(/i
    ]

    const violations: Array<{ file: string; match: string }> = []

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8')
      for (const pattern of forbiddenPatterns) {
        const match = content.match(pattern)
        if (match) {
          violations.push({
            file: path.relative(srcDir, filePath),
            match: match[0]
          })
        }
      }
    }

    expect(violations).toEqual([])
  })
})
