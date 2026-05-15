'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Состояние согласия на оффлайн режим.
 * - pending: ещё не спрашивали или время повторного показа настало
 * - accepted: пользователь согласился
 * - declined: пользователь отказался (показать снова через 7 дней)
 */
export type OfflineConsentState = 'pending' | 'accepted' | 'declined'

/**
 * Данные, хранящиеся в localStorage.
 */
interface ConsentData {
  state: OfflineConsentState
  declinedAt?: number // timestamp когда отказался
}

const DECLINE_REMIND_DAYS = 7 // Напомнить через 7 дней после отказа

/**
 * Кеш для предотвращения infinite loop в useSyncExternalStore.
 * Используем Map для поддержки нескольких storageKey.
 */
const cachedStates = new Map<string, { state: OfflineConsentState; json: string | null }>()

/**
 * Получает состояние согласия из localStorage.
 * Учитывает логику повторного показа через 7 дней.
 */
function getConsentState(storageKey: string): OfflineConsentState {
  if (typeof window === 'undefined') {
    return 'pending'
  }

  try {
    const stored = localStorage.getItem(storageKey)
    const cached = cachedStates.get(storageKey)

    // Возвращаем кеш если данные не изменились
    if (cached && stored === cached.json) {
      return cached.state
    }

    let result: OfflineConsentState = 'pending'

    if (stored) {
      const data: ConsentData = JSON.parse(stored)

      if (data.state === 'accepted') {
        result = 'accepted'
      } else if (data.state === 'declined' && data.declinedAt) {
        const daysSinceDeclined = (Date.now() - data.declinedAt) / (1000 * 60 * 60 * 24)
        result = daysSinceDeclined >= DECLINE_REMIND_DAYS ? 'pending' : 'declined'
      } else {
        result = data.state
      }
    }

    cachedStates.set(storageKey, { state: result, json: stored })
    return result
  } catch {
    cachedStates.set(storageKey, { state: 'pending', json: null })
    return 'pending'
  }
}

/**
 * Сохраняет состояние согласия в localStorage.
 */
function setConsentState(storageKey: string, state: OfflineConsentState): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const data: ConsentData = {
      state,
      ...(state === 'declined' && { declinedAt: Date.now() }),
    }
    localStorage.setItem(storageKey, JSON.stringify(data))
    // Уведомляем подписчиков
    window.dispatchEvent(new StorageEvent('storage', { key: storageKey }))
  } catch {
    // Игнорируем ошибки записи
  }
}

/**
 * Хук для управления согласием на оффлайн режим.
 *
 * Использует useSyncExternalStore для реактивности и синхронизации между вкладками.
 * Реализует логику повторного показа через 7 дней после отказа.
 *
 * @param storageKey — ключ в localStorage, уникальный для каждого приложения
 *
 * @example
 * ```tsx
 * function OfflineConsentBanner() {
 *   const { consent, accept, decline, shouldShowBanner } = useOfflineConsent('myapp-offline-consent')
 *
 *   if (!shouldShowBanner) return null
 *
 *   return (
 *     <Banner>
 *       <Button onClick={accept}>Включить оффлайн</Button>
 *       <Button onClick={decline}>Не сейчас</Button>
 *     </Banner>
 *   )
 * }
 * ```
 */
export function useOfflineConsent(storageKey: string) {
  const subscribe = useCallback(
    (callback: () => void) => {
      const handleStorage = (e: StorageEvent) => {
        if (e.key === storageKey || e.key === null) {
          callback()
        }
      }
      window.addEventListener('storage', handleStorage)
      return () => window.removeEventListener('storage', handleStorage)
    },
    [storageKey]
  )

  const getSnapshot = useCallback(() => getConsentState(storageKey), [storageKey])

  const consent = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => 'pending' as OfflineConsentState // SSR fallback
  )

  /** Принять оффлайн режим. */
  const accept = useCallback(() => {
    setConsentState(storageKey, 'accepted')
  }, [storageKey])

  /** Отклонить оффлайн режим (напомнить через 7 дней). */
  const decline = useCallback(() => {
    setConsentState(storageKey, 'declined')
  }, [storageKey])

  /** Сбросить состояние (для тестирования). */
  const reset = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey)
      window.dispatchEvent(new StorageEvent('storage', { key: storageKey }))
    }
  }, [storageKey])

  return {
    /** Текущее состояние согласия */
    consent,
    /** Пользователь согласился на оффлайн */
    isAccepted: consent === 'accepted',
    /** Нужно ли показывать banner */
    shouldShowBanner: consent === 'pending',
    /** Принять оффлайн режим */
    accept,
    /** Отклонить оффлайн режим */
    decline,
    /** Сбросить состояние (для тестирования) */
    reset,
  }
}
