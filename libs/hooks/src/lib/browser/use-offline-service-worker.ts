'use client'

import { useEffect } from 'react'
import { useOfflineConsent } from './use-offline-consent'

export interface UseOfflineServiceWorkerOptions {
  /** Ключ согласия в localStorage — тот же, что у `OfflineConsentBanner`, например `'mandala-offline-consent'` */
  consentKey: string
  /** Путь к воркеру @default '/sw.js' */
  swUrl?: string
  /**
   * Scope'ы регистрации. Один воркер на каждый scope: у SW нет общего префикса короче `/`,
   * поэтому приложение, кэширующее только часть маршрутов, регистрирует их поимённо
   * (`['/express', '/en/express']`), а не забирает себе весь домен.
   * @default ['/']
   */
  scopes?: string[]
  /** Выключатель на стороне приложения (например «в dev воркера не собирают») @default true */
  enabled?: boolean
}

/**
 * Регистрирует Service Worker только после согласия пользователя ({@link useOfflineConsent}),
 * а при отсутствии согласия — снимает регистрации и чистит кеши.
 * См. `.claude/docs/pwa-offline.md`.
 *
 * ⚠️ Снятие идёт по `getRegistrations()`, а не по ref с текущей загрузки страницы: воркер,
 * зарегистрированный в прошлой сессии браузера (или до внедрения консент-гейта), в ref не
 * попадает — и выключение оффлайн-режима не делало ничего. Ровно этот баг жил в четырёх
 * копиях компонента, ради дедупликации которых хук и вынесен сюда.
 *
 * ⚠️ `unregister()` у воркера, застрявшего в `installing`, **не резолвится вообще** — промис
 * висит, пока очередь заданий Service Worker не сдвинет что-то другое, и только тогда отдаёт
 * `false`, хотя регистрацию снимает. Отсюда `void` вместо `await`: очистка кеша ниже не должна
 * зависеть от этого промиса.
 *
 * ⚠️ Если воркер приложения сам пишет в кеш на каждый `fetch` (например `cache.put` в
 * рукописном `sw.js`, как у mandala/pravda — в отличие от serwist-приложений, где рантайм-кеш
 * настраивается декларативно), он может пересоздать запись уже после нашей чистки: снятая
 * регистрация продолжает контролировать текущую страницу, пока её не сменит следующая
 * навигация. Это ограничение самого API Service Worker, не этого хука — лечится следующей
 * загрузкой страницы, когда воркер контроль уже потерял.
 *
 * ⚠️ Проверять только на прод-сборке и только той командой, что стоит в `project.json`
 * приложения: у приложений на serwist он отключён в development, а голый `next build`
 * (Turbopack) отдаёт протухший `public/sw.js` от прошлой сборки — см.
 * `.claude/docs/serwist-turbopack-stale-sw-artifact.md`.
 */
export function useOfflineServiceWorker({
  consentKey,
  swUrl = '/sw.js',
  scopes = ['/'],
  enabled = true,
}: UseOfflineServiceWorkerOptions): void {
  const { isAccepted } = useOfflineConsent(consentKey)
  // Литерал массива меняет ссылку на каждом рендере — в зависимости эффекта идёт строка.
  // '|' в пути scope не встречается, поэтому склейка обратима.
  const scopeKey = scopes.join('|')

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const handleRegistration = async () => {
      try {
        if (isAccepted) {
          await Promise.all(
            scopeKey.split('|').map((scope) => navigator.serviceWorker.register(swUrl, { scope })),
          )
          return
        }

        const registrations = await navigator.serviceWorker.getRegistrations()
        if (registrations.length === 0) {
          return
        }

        // Запрос на снятие не ожидаем: у воркера, застрявшего в `installing`, промис не
        // резолвится (см. предупреждение выше) — браузер всё равно ставит снятие в очередь,
        // а очистка кеша не должна от этого зависеть.
        for (const registration of registrations) {
          void registration.unregister()
        }

        // сам кеш воркер за собой не убирает — иначе страницы продолжат открываться из него
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map((key) => caches.delete(key)))
        }
      } catch (error) {
        console.error('[SW] Ошибка регистрации:', error)
      }
    }

    handleRegistration()
  }, [isAccepted, enabled, swUrl, scopeKey])
}
