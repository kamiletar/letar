'use client'

import { useOfflineConsent } from '@letar/hooks'
import { useEffect, useRef } from 'react'

/**
 * Регистрация Service Worker (этап 5.7, offline-first /express).
 *
 * SW регистрируется ТОЛЬКО после согласия пользователя (правило монорепо:
 * прекэш статики без спроса запрещён — см. .claude/docs/pwa-offline.md).
 * При отзыве согласия регистрация снимается. В dev Serwist отключён
 * (нет /sw.js), поэтому регистрация только в production.
 */
export function ServiceWorkerRegistration() {
  const { isAccepted } = useOfflineConsent('archetest-offline-consent')
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') {
      return
    }

    const handleRegistration = async () => {
      if (isAccepted) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
          registrationRef.current = registration
        } catch (error) {
          console.error('[SW] Ошибка регистрации:', error)
        }
      } else if (registrationRef.current) {
        // Пользователь отозвал согласие — снимаем регистрацию
        try {
          await registrationRef.current.unregister()
          registrationRef.current = null
        } catch (error) {
          console.error('[SW] Ошибка отмены регистрации:', error)
        }
      }
    }

    handleRegistration()
  }, [isAccepted])

  // Компонент не рендерит UI
  return null
}
