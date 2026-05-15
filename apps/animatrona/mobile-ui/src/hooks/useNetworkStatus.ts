/**
 * useNetworkStatus — хук для отслеживания статуса соединения
 *
 * Отслеживает:
 * 1. Статус браузера (navigator.onLine)
 * 2. Соединение с desktop приложением (периодический ping)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface NetworkStatus {
  /** Браузер online */
  isOnline: boolean
  /** Desktop приложение доступно */
  isDesktopConnected: boolean
  /** Последняя успешная проверка */
  lastCheck: Date | null
  /** Количество неудачных попыток */
  failedAttempts: number
}

export interface UseNetworkStatusOptions {
  /** Интервал проверки в мс (по умолчанию 10000 — 10 сек) */
  pingInterval?: number
  /** URL для ping (по умолчанию /api/status) */
  pingUrl?: string
  /** Количество неудачных попыток для offline статуса (по умолчанию 2) */
  failThreshold?: number
  /** Таймаут ping запроса в мс (по умолчанию 5000) */
  pingTimeout?: number
}

export function useNetworkStatus(options: UseNetworkStatusOptions = {}): NetworkStatus {
  const { pingInterval = 10000, pingUrl = '/api/status', failThreshold = 2, pingTimeout = 5000 } = options

  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isDesktopConnected: true, // Оптимистично считаем connected
    lastCheck: null,
    failedAttempts: 0,
  })

  const failedAttemptsRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Ping desktop приложения
  const pingDesktop = useCallback(async () => {
    // Отменяем предыдущий запрос если есть
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), pingTimeout)

    try {
      const response = await fetch(pingUrl, {
        method: 'GET',
        signal: abortControllerRef.current.signal,
        cache: 'no-store',
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        failedAttemptsRef.current = 0
        setStatus((prev) => ({
          ...prev,
          isDesktopConnected: true,
          lastCheck: new Date(),
          failedAttempts: 0,
        }))
      } else {
        throw new Error('Non-OK response')
      }
    } catch (error) {
      clearTimeout(timeoutId)

      // Игнорируем abort ошибки
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      failedAttemptsRef.current += 1
      const isDisconnected = failedAttemptsRef.current >= failThreshold

      setStatus((prev) => ({
        ...prev,
        isDesktopConnected: !isDisconnected,
        lastCheck: new Date(),
        failedAttempts: failedAttemptsRef.current,
      }))
    }
  }, [pingUrl, pingTimeout, failThreshold])

  // Обработчики online/offline событий браузера
  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }))
      // Сразу проверяем desktop при восстановлении связи
      pingDesktop()
    }

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false, isDesktopConnected: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [pingDesktop])

  // Периодический ping
  useEffect(() => {
    // Первоначальный ping
    pingDesktop()

    const intervalId = setInterval(pingDesktop, pingInterval)

    return () => {
      clearInterval(intervalId)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [pingDesktop, pingInterval])

  // Ping при visibility change (когда пользователь возвращается на вкладку)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pingDesktop()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pingDesktop])

  return status
}
