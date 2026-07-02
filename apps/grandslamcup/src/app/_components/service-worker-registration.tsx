'use client'

import { useOfflineConsent } from '@letar/hooks'
import { useEffect, useRef } from 'react'

/**
 * Регистрация Service Worker.
 *
 * Регистрирует SW только после согласия пользователя (см. OfflineConsentBanner) —
 * SW прекачивает статику и может занять десятки МБ, ставить это без спроса нельзя.
 */
export function ServiceWorkerRegistration() {
  const { isAccepted } = useOfflineConsent('grandslamcup-offline-consent')
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    const handleRegistration = async () => {
      if (isAccepted) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
          registrationRef.current = registration

          // Проверяем обновления
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.warn('[SW] Новая версия доступна')
                }
              })
            }
          })
        } catch (error) {
          console.error('[SW] Ошибка регистрации:', error)
        }
      } else if (registrationRef.current) {
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

  return null
}
