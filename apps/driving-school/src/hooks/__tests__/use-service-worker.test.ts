// globals: true — describe, expect, it, beforeEach, afterEach доступны глобально
import { act, renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useServiceWorker } from '../use-service-worker'

describe('useServiceWorker', () => {
  const mockPostMessage = vi.fn()
  const mockRegister = vi.fn()
  const swAddEventListener = vi.fn()
  const swRemoveEventListener = vi.fn()
  const regAddEventListener = vi.fn()

  // Сохраняем оригиналы
  const origEnv = process.env.NEXT_PUBLIC_DISABLE_SERVICE_WORKER

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.NEXT_PUBLIC_DISABLE_SERVICE_WORKER

    // Мокаем Service Worker API
    const mockRegistration = {
      scope: '/',
      addEventListener: regAddEventListener,
      waiting: null,
      active: { postMessage: mockPostMessage },
      installing: null,
    }

    mockRegister.mockResolvedValue(mockRegistration)

    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
        controller: {
          postMessage: mockPostMessage,
        },
        addEventListener: swAddEventListener,
        removeEventListener: swRemoveEventListener,
        ready: Promise.resolve(mockRegistration),
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_DISABLE_SERVICE_WORKER = origEnv
  })

  it('должен зарегистрировать Service Worker', async () => {
    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.status).toBe('registered')
    })

    expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })

  it('должен иметь registration после успешной регистрации', async () => {
    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.registration).not.toBeNull()
    })
  })

  it('должен вернуть unsupported если Service Worker не поддерживается', async () => {
    // Заменяем navigator целиком (без свойства serviceWorker)
    const origNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: origNavigator.userAgent },
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.status).toBe('unsupported')
    })

    // Восстанавливаем navigator
    Object.defineProperty(global, 'navigator', {
      value: origNavigator,
      writable: true,
      configurable: true,
    })
  })

  it('должен вернуть unsupported если disabled=true', async () => {
    const { result } = renderHook(() => useServiceWorker({ disabled: true }))

    await waitFor(() => {
      expect(result.current.status).toBe('unsupported')
    })

    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('должен вернуть unsupported если env DISABLE_SERVICE_WORKER=true', async () => {
    process.env.NEXT_PUBLIC_DISABLE_SERVICE_WORKER = 'true'

    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.status).toBe('unsupported')
    })

    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('должен обработать ошибку регистрации', async () => {
    mockRegister.mockRejectedValue(new Error('Registration failed'))

    const { result } = renderHook(() => useServiceWorker())

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.error?.message).toBe('Registration failed')
  })

  describe('методы отправки сообщений', () => {
    it('sendMessage должен отправлять сообщение в SW', async () => {
      const { result } = renderHook(() => useServiceWorker())

      await waitFor(() => {
        expect(result.current.status).toBe('registered')
      })

      act(() => {
        result.current.sendMessage({ type: 'TEST', data: 'test' })
      })

      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'TEST', data: 'test' })
    })

    it('prefetchPages должен отправлять сообщение PREFETCH', async () => {
      const { result } = renderHook(() => useServiceWorker())

      await waitFor(() => {
        expect(result.current.status).toBe('registered')
      })

      act(() => {
        result.current.prefetchPages(['/schedule', '/lessons'])
      })

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'PREFETCH',
        urls: ['/schedule', '/lessons'],
      })
    })

    it('cacheSchedule должен отправлять сообщение CACHE_SCHEDULE', async () => {
      const { result } = renderHook(() => useServiceWorker())

      await waitFor(() => {
        expect(result.current.status).toBe('registered')
      })

      const schedule = { slots: [], lessons: [] }
      act(() => {
        result.current.cacheSchedule(schedule)
      })

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'CACHE_SCHEDULE',
        schedule,
      })
    })

    it('cacheImages должен отправлять сообщение CACHE_IMAGES', async () => {
      const { result } = renderHook(() => useServiceWorker())

      await waitFor(() => {
        expect(result.current.status).toBe('registered')
      })

      act(() => {
        result.current.cacheImages(['/img/1.jpg', '/img/2.jpg'])
      })

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'CACHE_IMAGES',
        urls: ['/img/1.jpg', '/img/2.jpg'],
      })
    })

    it('clearCache должен отправлять сообщение CLEAR_CACHE', async () => {
      const { result } = renderHook(() => useServiceWorker())

      await waitFor(() => {
        expect(result.current.status).toBe('registered')
      })

      act(() => {
        result.current.clearCache()
      })

      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'CLEAR_CACHE' })
    })
  })

  describe('без активного controller', () => {
    it('sendMessage не должен вызывать ошибку если controller отсутствует', async () => {
      const mockRegistrationNoController = {
        scope: '/',
        addEventListener: regAddEventListener,
        waiting: null,
        active: null,
        installing: null,
      }
      mockRegister.mockResolvedValue(mockRegistrationNoController)

      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          register: mockRegister,
          controller: null,
          addEventListener: swAddEventListener,
          removeEventListener: swRemoveEventListener,
          ready: Promise.resolve(mockRegistrationNoController),
        },
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useServiceWorker())

      await waitFor(() => {
        expect(result.current.status).toBe('registered')
      })

      // Не должен вызвать ошибку
      expect(() => {
        act(() => {
          result.current.sendMessage({ type: 'TEST' })
        })
      }).not.toThrow()

      expect(mockPostMessage).not.toHaveBeenCalled()
    })
  })
})
