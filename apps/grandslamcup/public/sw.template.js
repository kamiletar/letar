/* eslint-disable no-console -- Service Worker uses console for debugging */
/**
 * Service Worker для Кубка Большого Слэма.
 * Обеспечивает оффлайн доступ к таблицам, расписанию и результатам.
 *
 * Стратегия: Network First с fallback на Cache.
 * Изображения из /api/files/* кешируются отдельно.
 */

// Версия подставляется скриптом update-sw-version.mjs
const SW_VERSION = '0.0.0'
const CACHE_NAME = `grandslamcup-${SW_VERSION}`

// Статические страницы для прекеширования
const STATIC_PAGES = ['/', '/offline', '/standings', '/schedule', '/teams', '/players', '/news', '/rules', '/donate']

/**
 * Установка: кешируем статические страницы
 */
self.addEventListener('install', (event) => {
  console.log(`[SW] Установка версии ${SW_VERSION}`)

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)

      for (const page of STATIC_PAGES) {
        try {
          await cache.add(page)
        } catch (e) {
          console.warn(`[SW] Не удалось закешировать: ${page}`, e)
        }
      }

      console.log('[SW] Прекеширование завершено')
    })(),
  )

  self.skipWaiting()
})

/**
 * Активация: удаляем старые кэши
 */
self.addEventListener('activate', (event) => {
  console.log(`[SW] Активация версии ${SW_VERSION}`)
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('grandslamcup-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Удаление старого кэша:', name)
            return caches.delete(name)
          }),
      )
    }),
  )
  self.clients.claim()
})

/**
 * Fetch: Network First с fallback на Cache.
 * /api/files/* — кешируются (фото матчей)
 * Остальные /api/* — не кешируются (динамические данные)
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Пропускаем non-GET
  if (request.method !== 'GET') return

  // Пропускаем non-http
  if (!request.url.startsWith('http')) return

  // Пропускаем API (кроме /api/files/ — изображения)
  if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/files/')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response.ok) return response

        // Кешируем ответ
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone)
        })

        return response
      })
      .catch(async () => {
        // Fallback на кэш
        const cached = await caches.match(request)
        if (cached) return cached

        // Для навигации — offline страница
        if (request.destination === 'document') {
          const offlinePage = await caches.match('/offline')
          if (offlinePage) return offlinePage
        }

        return new Response('Нет подключения к сети', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }),
  )
})

// Обработка сообщений
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }
})
