import { describe, expect, it } from 'vitest'
import { reactive, isReactive } from 'vue'
import { createDummyProject } from '../src/core/dummy-data'
import { getProjectSnapshot } from '../src/renderer/src/utils/project-snapshot'

describe('project snapshot untuk IPC', () => {
  it('mengubah proyek reaktif menjadi plain object yang dapat diserialisasi', () => {
    const project = reactive(createDummyProject())
    const snapshot = getProjectSnapshot(project)

    expect(isReactive(snapshot)).toBe(false)
    expect(snapshot).toEqual(JSON.parse(JSON.stringify(project)))
    expect(snapshot).not.toBe(project)
  })
})
