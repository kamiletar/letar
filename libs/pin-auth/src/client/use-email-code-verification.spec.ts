/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEmailCodeVerification } from './use-email-code-verification'

class MockEventSource {
  static instances: MockEventSource[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  listeners: Record<string, ((event: MessageEvent | Event) => void)[]> = {}
  closed = false

  constructor(public url: string) {
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: (event: MessageEvent | Event) => void) {
    this.listeners[type] ??= []
    this.listeners[type].push(listener)
    if (type === 'open') {
      listener(new Event('open'))
    }
  }

  removeEventListener() {}

  close() {
    this.closed = true
  }

  emit(type: string, data?: unknown) {
    for (const listener of this.listeners[type] ?? []) {
      listener({ data: JSON.stringify(data ?? {}) } as MessageEvent)
    }
  }
}

beforeEach(() => {
  MockEventSource.instances = []
  // @ts-expect-error — мок глобального EventSource для теста
  global.EventSource = MockEventSource
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useEmailCodeVerification', () => {
  it('закрывает поток ДО verify — успех не прилетает как verifiedElsewhere', async () => {
    const onVerified = vi.fn()
    const verify = vi.fn().mockResolvedValue({ ok: true })
    const { result } = renderHook(() =>
      useEmailCodeVerification({ verify, resend: vi.fn(), onVerified, streamUrl: '/stream' })
    )

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1))
    const source = MockEventSource.instances[0]

    await act(async () => {
      await result.current.submitCode('123456')
    })

    expect(source.closed).toBe(true)
    expect(result.current.status).toBe('verified')
    expect(onVerified).toHaveBeenCalledTimes(1)
  })

  it('verifiedElsewhere по событию потока', async () => {
    const onVerifiedInOtherTab = vi.fn()
    const { result } = renderHook(() =>
      useEmailCodeVerification({
        verify: vi.fn(),
        resend: vi.fn(),
        onVerified: vi.fn(),
        onVerifiedInOtherTab,
        streamUrl: '/stream',
      })
    )

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1))
    const source = MockEventSource.instances[0]

    act(() => {
      source.emit('message', { verified: true })
    })

    await waitFor(() => expect(result.current.status).toBe('verifiedElsewhere'))
    expect(onVerifiedInOtherTab).toHaveBeenCalledTimes(1)
  })

  it('ошибка проверки → перевод сообщения, статус возвращается в idle', async () => {
    const verify = vi.fn().mockResolvedValue({ ok: false, code: 'INVALID_OTP' })
    const { result } = renderHook(() =>
      useEmailCodeVerification({ verify, resend: vi.fn(), onVerified: vi.fn(), streamUrl: '/stream' })
    )

    await act(async () => {
      await result.current.submitCode('000000')
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBe('Неверный код')
  })

  it('resend сбрасывает отсчёт и увеличивает formKey', async () => {
    const resend = vi.fn().mockResolvedValue({ ok: true })
    const { result } = renderHook(() =>
      useEmailCodeVerification({ verify: vi.fn(), resend, onVerified: vi.fn(), streamUrl: '/stream' })
    )

    const formKeyBefore = result.current.formKey

    await act(async () => {
      await result.current.resendCode()
    })

    expect(result.current.formKey).toBe(formKeyBefore + 1)
    expect(result.current.canResend).toBe(false)
  })

  it('двойной submitCode не зовёт verify дважды', async () => {
    let resolveVerify: (v: { ok: true }) => void = () => {}
    const verify = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVerify = resolve
        }),
    )
    const { result } = renderHook(() =>
      useEmailCodeVerification({ verify, resend: vi.fn(), onVerified: vi.fn(), streamUrl: '/stream' })
    )

    let firstCall: Promise<void>
    act(() => {
      firstCall = result.current.submitCode('123456')
    })
    await act(async () => {
      await result.current.submitCode('123456')
    })

    expect(verify).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveVerify({ ok: true })
      await firstCall!
    })
  })

  it('NEXT_REDIRECT пробрасывается, не глотается', async () => {
    const redirectError = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;push;/next;307;' })
    const verify = vi.fn().mockRejectedValue(redirectError)
    const { result } = renderHook(() =>
      useEmailCodeVerification({ verify, resend: vi.fn(), onVerified: vi.fn(), streamUrl: '/stream' })
    )

    await expect(
      act(async () => {
        await result.current.submitCode('123456')
      }),
    ).rejects.toThrow('NEXT_REDIRECT')
  })
})
