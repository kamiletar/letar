/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePinVerification } from './use-pin-verification'

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

function baseConfig(overrides: Partial<Parameters<typeof usePinVerification>[0]> = {}) {
  return {
    email: 'user@example.com',
    sseEndpoint: '/api/auth/verification-stream/token123',
    verifyAction: vi.fn(),
    resendAction: vi.fn(),
    onVerified: vi.fn(),
    sseEvents: { completedField: 'verified' },
    ...overrides,
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

describe('usePinVerification', () => {
  it('закрывает SSE ДО onVerified — успех не прилетает как completedInOtherTab', async () => {
    const onVerified = vi.fn()
    const verifyAction = vi.fn().mockResolvedValue({ success: true, token: 'auto-login-token' })
    const { result } = renderHook(() => usePinVerification(baseConfig({ verifyAction, onVerified })))

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1))
    const source = MockEventSource.instances[0]

    await act(async () => {
      await result.current.handleVerify('123456')
    })

    expect(source.closed).toBe(true)
    expect(result.current.isVerified).toBe(true)
    expect(onVerified).toHaveBeenCalledWith({ token: 'auto-login-token', resetToken: undefined })
  })

  it('completedInOtherTab по событию потока (регистрация)', async () => {
    const { result } = renderHook(() => usePinVerification(baseConfig()))

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1))
    const source = MockEventSource.instances[0]

    act(() => {
      source.emit('message', { verified: true })
    })

    await waitFor(() => expect(result.current.completedInOtherTab).toBe(true))
    expect(source.closed).toBe(true)
  })

  it('openedInOtherTab по отдельному полю события (сброс пароля)', async () => {
    const { result } = renderHook(() =>
      usePinVerification(baseConfig({ sseEvents: { completedField: 'reset', openedField: 'opened' } }))
    )

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1))
    const source = MockEventSource.instances[0]

    act(() => {
      source.emit('message', { opened: true })
    })

    await waitFor(() => expect(result.current.openedInOtherTab).toBe(true))
    // «открыто» не закрывает поток — «завершено» всё ещё может прийти следом
    expect(source.closed).toBe(false)
    expect(result.current.completedInOtherTab).toBe(false)
  })

  it('неверный код — понятная ошибка, состояние сбрасывается для повторного ввода', async () => {
    const verifyAction = vi.fn().mockResolvedValue({ success: false, error: 'INVALID_PIN' })
    const { result } = renderHook(() => usePinVerification(baseConfig({ verifyAction })))

    await act(async () => {
      await result.current.handleVerify('000000')
    })

    expect(result.current.error).toBe('Неверный код')
    expect(result.current.isVerifying).toBe(false)
    expect(result.current.isVerified).toBe(false)
  })

  it('PIN_EXPIRED форсирует canResend, не дожидаясь отсчёта', async () => {
    const verifyAction = vi.fn().mockResolvedValue({ success: false, error: 'PIN_EXPIRED' })
    const { result } = renderHook(() => usePinVerification(baseConfig({ verifyAction })))

    expect(result.current.canResend).toBe(false)

    await act(async () => {
      await result.current.handleVerify('123456')
    })

    expect(result.current.canResend).toBe(true)
  })

  it('короткий код — локальная валидация без вызова verifyAction', async () => {
    const verifyAction = vi.fn()
    const { result } = renderHook(() => usePinVerification(baseConfig({ verifyAction })))

    await act(async () => {
      await result.current.handleVerify('123')
    })

    expect(verifyAction).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Введите 6-значный код')
  })

  it('resend сбрасывает отсчёт до 60 и увеличивает formKey', async () => {
    vi.useFakeTimers()
    try {
      const resendAction = vi.fn().mockResolvedValue({ success: true })
      const { result } = renderHook(() => usePinVerification(baseConfig({ resendAction })))

      const formKeyBefore = result.current.formKey

      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(result.current.resendCountdown).toBeLessThan(60)

      await act(async () => {
        await result.current.handleResend()
      })

      expect(result.current.formKey).toBe(formKeyBefore + 1)
      expect(result.current.resendCountdown).toBe(60)
      expect(result.current.canResend).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('RATE_LIMITED при resend — сообщение, без сброса отсчёта', async () => {
    const resendAction = vi.fn().mockResolvedValue({ success: false, error: 'RATE_LIMITED' })
    const { result } = renderHook(() => usePinVerification(baseConfig({ resendAction })))

    await act(async () => {
      await result.current.handleResend()
    })

    expect(result.current.error).toBe('Подождите перед повторной отправкой')
  })

  it('NEXT_REDIRECT из onVerified пробрасывается, не глотается', async () => {
    const redirectError = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;push;/next;307;' })
    const verifyAction = vi.fn().mockResolvedValue({ success: true, token: 't' })
    const onVerified = vi.fn().mockRejectedValue(redirectError)
    const { result } = renderHook(() => usePinVerification(baseConfig({ verifyAction, onVerified })))

    await expect(
      act(async () => {
        await result.current.handleVerify('123456')
      }),
    ).rejects.toThrow('NEXT_REDIRECT')
  })
})
