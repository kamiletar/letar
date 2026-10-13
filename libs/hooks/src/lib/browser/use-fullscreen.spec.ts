import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useFullscreen } from './use-fullscreen'

function stubDocument(enabled: boolean, element: Element | null = null) {
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: enabled })
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: element, writable: true })
}

afterEach(() => {
  stubDocument(false)
  vi.restoreAllMocks()
})

describe('useFullscreen', () => {
  it('без поддержки браузера supported = false', () => {
    stubDocument(false)
    expect(renderHook(() => useFullscreen()).result.current.supported).toBe(false)
  })

  it('с поддержкой supported = true, пока не в полном экране', () => {
    stubDocument(true)
    const { result } = renderHook(() => useFullscreen())
    expect(result.current).toMatchObject({ supported: true, isFullscreen: false })
  })

  it('toggle запрашивает полный экран, когда он выключен', async () => {
    stubDocument(true)
    const request = vi.fn().mockResolvedValue(undefined)
    document.documentElement.requestFullscreen = request
    const { result } = renderHook(() => useFullscreen())
    await act(async () => {
      await result.current.toggle()
    })
    expect(request).toHaveBeenCalledWith({ navigationUI: 'hide' })
  })

  it('toggle выходит из полного экрана, когда он включён', async () => {
    stubDocument(true, document.documentElement)
    const exit = vi.fn().mockResolvedValue(undefined)
    document.exitFullscreen = exit
    const { result } = renderHook(() => useFullscreen())
    expect(result.current.isFullscreen).toBe(true)
    await act(async () => {
      await result.current.toggle()
    })
    expect(exit).toHaveBeenCalled()
  })

  it('отказ браузера не роняет хук', async () => {
    stubDocument(true)
    document.documentElement.requestFullscreen = vi.fn().mockRejectedValue(new Error('нужен жест'))
    const { result } = renderHook(() => useFullscreen())
    await expect(act(async () => {
      await result.current.toggle()
    })).resolves.not.toThrow()
  })

  it('событие fullscreenchange обновляет состояние', () => {
    stubDocument(true)
    const { result } = renderHook(() => useFullscreen())
    act(() => {
      ;(document as { fullscreenElement: Element | null }).fullscreenElement = document.documentElement
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.isFullscreen).toBe(true)
  })
})
