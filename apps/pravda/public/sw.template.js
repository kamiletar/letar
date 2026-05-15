/* eslint-disable no-console -- Service Worker, нет альтернативы console */
/**
 * Service Worker для Pravda.
 * Обеспечивает полноценный оффлайн доступ к документам законодательства.
 */

// Версия подставляется скриптом update-sw-version.mjs
const SW_VERSION = '0.0.0'
const CACHE_NAME = `pravda-${SW_VERSION}`

// Важные страницы для precache
const PRECACHE_URLS = [
  '/',
  '/offline/',
  '/constitution/',
  '/pravda/',
  '/codes/',
  '/statutes/',
  '/regulations/',
  '/bookmarks/',
  '/search/',
]

// Устанавливаем SW и кэшируем важные страницы
self.addEventListener('install', (event) => {
  console.log(`[SW] Установка версии ${SW_VERSION}`)
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching pages...')
      return cache.addAll(PRECACHE_URLS)
    })
  )
  self.skipWaiting()
})

// Активируем SW и удаляем старые кэши
self.addEventListener('activate', (event) => {
  console.log(`[SW] Активация версии ${SW_VERSION}`)
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('pravda-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

// Стратегия: Network First с fallback на Cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Пропускаем non-GET запросы
  if (request.method !== 'GET') {
    return
  }

  // Пропускаем chrome-extension и другие non-http
  if (!request.url.startsWith('http')) {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Не кэшируем ошибки
        if (!response.ok) {
          return response
        }

        // Клонируем ответ для кэша
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone)
        })

        return response
      })
      .catch(async () => {
        // Fallback на кэш
        const cachedResponse = await caches.match(request)
        if (cachedResponse) {
          return cachedResponse
        }

        // Для навигации — показываем оффлайн страницу
        if (request.destination === 'document') {
          const offlinePage = await caches.match('/offline/')
          if (offlinePage) {
            return offlinePage
          }
        }

        return new Response('Нет подключения к сети', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      })
  )
})

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }
})
