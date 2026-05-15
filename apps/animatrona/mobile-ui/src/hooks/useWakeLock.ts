/**
 * useWakeLock — Screen Wake Lock API для предотвращения гашения экрана
 *
 * Когда видео воспроизводится, экран не будет выключаться.
 * Поддерживается в современных браузерах (Chrome, Edge, Safari 16.4+).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseWakeLockOptions {
  /** Автоматически активировать при воспроизведении */
  enabled?: boolean
}

export function useWakeLock(options: UseWakeLockOptions = {}) {
  const { enabled = true } = options

  const [isActive, setIsActive] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // Проверка поддержки
  useEffect(() => {
    setIsSupported('wakeLock' in navigator)
  }, [])

  // Запросить wake lock
  const requestWakeLock = useCallback(async () => {
    if (!isSupported || !enabled) {
      return
    }

    try {
      // Освобождаем предыдущий lock если есть
      if (wakeLockRef.current) {
        await wakeLockRef.current.release()
      }

      wakeLockRef.current = await navigator.wakeLock.request('screen')
      setIsActive(true)

      // Слушаем событие release
      wakeLockRef.current.addEventListener('release', () => {
        setIsActive(false)
        wakeLockRef.current = null
      })

      // Wake lock активирован
    } catch (err) {
      // Может не сработать если страница не visible
      console.warn('[useWakeLock] Не удалось запросить wake lock:', err)
      setIsActive(false)
    }
  }, [isSupported, enabled])

  // Освободить wake lock
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
        setIsActive(false)
        // Wake lock освобождён
      } catch (err) {
        console.warn('[useWakeLock] Failed to release wake lock:', err)
      }
    }
  }, [])

  // Автоматически переактивировать при возврате на страницу
  useEffect(() => {
    if (!isSupported || !enabled) {
      return
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && enabled && !wakeLockRef.current) {
        // Страница стала видимой — пытаемся восстановить lock
        await requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isSupported, enabled, requestWakeLock])

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => undefined)
      }
    }
  }, [])

  return {
    isActive,
    isSupported,
    requestWakeLock,
    releaseWakeLock,
  }
}
