'use client'

import { useEffect, useRef } from 'react'

/**
 * Регистрация Service Worker.
 * Регистрирует SW автоматически при поддержке браузером.
 */
export function ServiceWorkerRegistration() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    const register = async () => {
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
    }

    register()
  }, [])

  return null
}
