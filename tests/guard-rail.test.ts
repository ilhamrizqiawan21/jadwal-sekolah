import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Guard Rail: Core Domain Engine Isolation', () => {
  it('memastikan tidak ada import vue, pinia, atau electron di dalam src/core/**', () => {
    const coreDir = path.resolve(__dirname, '../src/core')
    const files = fs.readdirSync(coreDir).filter((f) => f.endsWith('.ts'))

    const forbiddenPackages = ['vue', 'pinia', 'electron', '@renderer', 'window']

    for (const file of files) {
      const content = fs.readFileSync(path.join(coreDir, file), 'utf-8')
      for (const forbidden of forbiddenPackages) {
        const regex = new RegExp(`from\\s+['"]${forbidden}['"]|import\\s+['"]${forbidden}['"]`)
        expect(
          regex.test(content),
          `Pelanggaran arsitektur: berkas src/core/${file} tidak boleh mengimpor "${forbidden}" (ADR-0003)`
        ).toBe(false)
      }
    }
  })
})
