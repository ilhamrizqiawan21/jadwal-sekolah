import { describe, expect, it, vi } from 'vitest'
import { createAutoSaveController } from '../src/renderer/src/utils/auto-save'

describe('auto-save controller', () => {
  it('menyimpan perubahan pada interval dan mencegah penyimpanan ganda', async () => {
    vi.useFakeTimers()
    const save = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 10)))
    const states: string[] = []
    const controller = createAutoSaveController({
      intervalMs: 60_000,
      shouldSave: () => true,
      save,
      onStateChange: (state) => states.push(state)
    })

    controller.start()
    vi.advanceTimersByTime(60_000)
    vi.advanceTimersByTime(60_000)
    expect(save).toHaveBeenCalledTimes(1)

    controller.stop()
    await vi.runAllTimersAsync()
    expect(states).toEqual(['saving', 'clean'])
    vi.useRealTimers()
  })

  it('melaporkan error dan tidak mencoba menyimpan jika proyek belum punya path', async () => {
    const states: string[] = []
    const save = vi.fn().mockRejectedValue(new Error('disk penuh'))
    const controller = createAutoSaveController({
      shouldSave: () => false,
      save,
      onStateChange: (state) => states.push(state)
    })

    await expect(controller.trigger()).resolves.toBe(false)
    expect(save).not.toHaveBeenCalled()
    expect(states).toEqual([])

    const failing = createAutoSaveController({
      shouldSave: () => true,
      save,
      onStateChange: (state) => states.push(state)
    })
    await expect(failing.trigger()).resolves.toBe(false)
    expect(states.slice(-2)).toEqual(['saving', 'error'])
  })
})
