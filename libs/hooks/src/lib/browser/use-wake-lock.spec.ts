import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useWakeLock } from './use-wake-lock'

function stubWakeLock() {
  const release = vi.fn().mockResolvedValue(undefined)
  const request = vi.fn().mockResolvedValue({ release })
  vi.stubGlobal('navigator', { wakeLock: { request } })
  return { request, release }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useWakeLock', () => {
  it('API нет — молчит и не падает', () => {
    vi.stubGlobal('navigator', {})
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow()
  })

  it('active = false — блокировку не берёт', () => {
    const { request } = stubWakeLock()
    renderHook(() => useWakeLock(false))
    expect(request).not.toHaveBeenCalled()
  })

  it('active = true — берёт блокировку экрана', async () => {
    const { request } = stubWakeLock()
    renderHook(() => useWakeLock(true))
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))
  })

  it('active стал false — блокировка снята', async () => {
    const { request, release } = stubWakeLock()
    const { rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: true } })
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    // Даём промису request записать блокировку до снятия.
    await Promise.resolve()
    rerender({ active: false })
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1))
  })

  it('вкладка вернулась — блокировка берётся заново', async () => {
    const { request } = stubWakeLock()
    renderHook(() => useWakeLock(true))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
  })

  it('отказ браузера не роняет хук', async () => {
    const request = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    vi.stubGlobal('navigator', { wakeLock: { request } })
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow()
    await waitFor(() => expect(request).toHaveBeenCalled())
  })
})
