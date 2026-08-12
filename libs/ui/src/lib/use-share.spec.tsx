import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useShare } from './use-share'

describe('useShare', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // @ts-expect-error — убираем мок между тестами, чтобы typeof navigator.share не протёк
    delete navigator.share
  })

  it('вызывает navigator.share и возвращает "shared"', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { share: shareMock })

    const { result } = renderHook(() => useShare())

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.share({ title: 't', text: 'text', url: 'https://example.com' }, 'fallback')
    })

    expect(shareMock).toHaveBeenCalledWith({ title: 't', text: 'text', url: 'https://example.com' })
    expect(outcome).toBe('shared')
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
  })

  it('молча выходит при AbortError, без fallback-копирования', async () => {
    const abortError = new DOMException('cancelled', 'AbortError')
    Object.assign(navigator, { share: vi.fn().mockRejectedValue(abortError) })

    const { result } = renderHook(() => useShare())

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.share({ url: 'https://example.com' }, 'fallback')
    })

    expect(outcome).toBe('aborted')
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
  })

  it('копирует fallbackText, если navigator.share недоступен', async () => {
    const { result } = renderHook(() => useShare())

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.share({ url: 'https://example.com' }, 'fallback text')
    })

    expect(outcome).toBe('copied')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('fallback text')
  })

  it('копирует fallbackText, если navigator.share падает не с AbortError', async () => {
    Object.assign(navigator, { share: vi.fn().mockRejectedValue(new Error('boom')) })

    const { result } = renderHook(() => useShare())

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.share({ url: 'https://example.com' }, 'fallback text')
    })

    expect(outcome).toBe('copied')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('fallback text')
  })
})
