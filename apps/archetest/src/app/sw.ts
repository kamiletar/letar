/**
 * Service Worker для archetest PWA (этап 5.7, фестивальный режим).
 *
 * Serwist: precache статики + runtime-кэш (defaultCache) + офлайн-прекэш
 * документов /express. Wi-Fi на выставке ненадёжен — экспресс-тест должен
 * открываться и работать без сети: гостевой флоу целиком клиентский
 * (подсчёт баллов, localStorage, QR из бандла).
 */

/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import { NetworkFirst, Serwist } from 'serwist'

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<{ url: string; revision: string | null }>
}

/** Кэш документов экспресса — общий для install-прекэша и runtime-стратегии */
const EXPRESS_CACHE = 'express-pages'

/** Обе локали маршрута (localePrefix: 'as-needed' — ru без префикса) */
const EXPRESS_URLS = ['/express', '/en/express']

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Документы /express — NetworkFirst в тот же кэш, куда кладёт install-прекэш:
    // онлайн всегда свежая выборка вопросов, офлайн — последняя успешная копия
    {
      matcher: ({ request, url }) => request.mode === 'navigate' && EXPRESS_URLS.includes(url.pathname),
      handler: new NetworkFirst({ cacheName: EXPRESS_CACHE, networkTimeoutSeconds: 5 }),
    },
    ...defaultCache,
  ],
})

// Прекэш документов экспресса при установке SW: маршрут доступен офлайн сразу
// после согласия, даже если пользователь ещё не переходил по нему повторно.
// Ошибки не валят установку (страница может быть недоступна в момент install).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(EXPRESS_CACHE)
      .then((cache) => cache.addAll(EXPRESS_URLS))
      .catch(() => undefined),
  )
})

serwist.addEventListeners()
