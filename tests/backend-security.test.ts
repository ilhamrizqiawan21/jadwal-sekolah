import { describe, it, expect } from 'vitest'
import { assertProjectData } from '../src/main/storage'
import { createFileGrants, isSafeExternalUrl } from '../src/main/security'

describe('backend security boundaries', () => {
  it('rejects malformed projects including legacy-looking empty objects', () => {
    for (const value of [null, {}, { jadwal: { Senin: 42 } }]) {
      expect(() => assertProjectData(value)).toThrow(/valid|rusak/i)
    }
  })
  it('requires an explicit grant per window and extension', () => {
    const grants = createFileGrants()
    grants.allow(1, 'C:/data/a.jadwal')
    expect(() => grants.require(1, 'C:/data/a.jadwal', '.jadwal')).not.toThrow()
    expect(() => grants.require(2, 'C:/data/a.jadwal', '.jadwal')).toThrow()
    expect(() => grants.require(1, 'C:/data/b.jadwal', '.jadwal')).toThrow()
    expect(() => grants.require(1, 'C:/data/a.jadwal', '.pdf')).toThrow()
  })
  it('allows only web links to external applications', () => {
    expect(isSafeExternalUrl('https://example.com')).toBe(true)
    for (const url of ['file:///C:/Windows/a.exe', 'javascript:alert(1)', 'custom:run', 'bad']) {
      expect(isSafeExternalUrl(url)).toBe(false)
    }
  })
})
