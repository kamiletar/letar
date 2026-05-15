'use client'

import { useOfflineConsent } from '@letar/hooks'
import { useEffect, useRef } from 'react'

/**
 * Компонент регистрации Service Worker.
 *
 * Регистрирует SW только после получения согласия пользователя.
 * Отменяет регистрацию если пользователь отказался.
 */
export function ServiceWorkerRegistration() {
  const { isAccepted } = useOfflineConsent('pravda-offline-consent')
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Проверяем поддержку Service Worker
    if (!('serviceWorker' in navigator)) {
      return
    }

    const handleRegistration = async () => {
      if (isAccepted) {
        // Регистрируем Service Worker
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          })
          registrationRef.current = registration
          // eslint-disable-next-line no-console -- информационный лог регистрации SW
          console.log('[SW] Service Worker зарегистрирован:', registration.scope)

          // Проверяем обновления
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // eslint-disable-next-line no-console -- информационный лог обновления SW
                  console.log('[SW] Новая версия доступна')
                }
              })
            }
          })
        } catch (error) {
          console.error('[SW] Ошибка регистрации:', error)
        }
      } else {
        // Отменяем регистрацию если пользователь отказался
        if (registrationRef.current) {
          try {
            await registrationRef.current.unregister()
            registrationRef.current = null
            // eslint-disable-next-line no-console -- информационный лог отмены SW
            console.log('[SW] Service Worker отменён')
          } catch (error) {
            console.error('[SW] Ошибка отмены регистрации:', error)
          }
        }
      }
    }

    handleRegistration()
  }, [isAccepted])

  // Компонент не рендерит UI
  return null
}
