'use client'

import { useEffect } from 'react'

/**
 * Не даёт экрану гаснуть, пока `active` = true (Screen Wake Lock API).
 * Браузер снимает блокировку сам, когда вкладка уходит в фон, — поэтому берём её заново
 * при возвращении. Где API нет (старые браузеры, часть iOS), хук молча ничего не делает.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return
    }

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void lock.release()
          return
        }
        sentinel = lock
      } catch {
        // отказ (например, экономия заряда) — не критично, чтение работает и так
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void acquire()
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      void sentinel?.release()
    }
  }, [active])
}
