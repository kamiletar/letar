'use client'

import { useOfflineConsent } from '@letar/hooks'
import { useEffect, useRef } from 'react'

/**
 * Локали маршрута экспресса (localePrefix: 'as-needed' — ru без префикса).
 * Каждая — отдельный scope регистрации: у SW нет общего префикса короче '/',
 * а на '/' он перехватывал бы навигацию по всему сайту (был баг, см. ниже).
 */
const EXPRESS_SCOPES = ['/express', '/en/express']

/**
 * Регистрация Service Worker (этап 5.7, offline-first /express).
 *
 * SW регистрируется ТОЛЬКО после согласия пользователя (правило монорепо:
 * прекэш статики без спроса запрещён — см. .claude/docs/pwa-offline.md).
 * При отзыве согласия регистрация снимается. В dev Serwist отключён
 * (нет /sw.js), поэтому регистрация только в production.
 *
 * ⚠️ Scope регистрации ограничен `/express`/`/en/express`, а не `/` — при `scope: '/'`
 * SW получал контроль (`clientsClaim: true`) над всем доменом после одного согласия
 * на /express, хотя `runtimeCaching` в `sw.ts` целенаправленно кэширует только
 * express-маршруты, а остальные страницы полагались на generic `defaultCache`
 * (найдено 2026-07-28, см. PLAN.md).
 */
export function ServiceWorkerRegistration() {
  const { isAccepted } = useOfflineConsent('archetest-offline-consent')
  const registrationsRef = useRef<ServiceWorkerRegistration[]>([])

  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') {
      return
    }

    const handleRegistration = async () => {
      if (isAccepted) {
        try {
          const registrations = await Promise.all(
            EXPRESS_SCOPES.map((scope) => navigator.serviceWorker.register('/sw.js', { scope }))
          )
          registrationsRef.current = registrations
        } catch (error) {
          console.error('[SW] Ошибка регистрации:', error)
        }
      } else if (registrationsRef.current.length > 0) {
        // Пользователь отозвал согласие — снимаем все регистрации
        try {
          await Promise.all(registrationsRef.current.map((registration) => registration.unregister()))
          registrationsRef.current = []
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
