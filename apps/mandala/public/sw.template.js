/* eslint-disable no-console -- Service Worker uses console for debugging */
/**
 * Service Worker для Mandala.
 * Обеспечивает оффлайн доступ к галерее мандал.
 *
 * Стратегия прекеширования:
 * - Статические страницы (/, /gallery/, /shop/ и т.д.)
 * - Динамические страницы из БД (/mandalas/[slug], /shop/[slug])
 * - Изображения из БД (/api/files/...)
 */

// Версия подставляется скриптом update-sw-version.mjs
const SW_VERSION = '0.0.0'
const CACHE_NAME = `mandala-${SW_VERSION}`

// Статические страницы (всегда доступны, кешируются первыми)
// Роуты соответствуют [locale]/(main)/* структуре
const STATIC_PAGES = ['/', '/offline/', '/mandalas/', '/shop/', '/about-elfafeya/', '/about-mandalas/', '/contacts/']

/**
 * Установка Service Worker.
 * 1. Кешируем статические страницы
 * 2. Запрашиваем динамический манифест из API
 * 3. Кешируем страницы мандал и товаров
 * 4. Кешируем изображения
 */
self.addEventListener('install', (event) => {
  console.log(`[SW] Установка версии ${SW_VERSION}`)

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)

      // 1. Кешируем статические страницы (по одной, чтобы не падать при ошибке)
      console.log('[SW] Precaching static pages...')
      for (const page of STATIC_PAGES) {
        try {
          await cache.add(page)
        } catch (e) {
          console.warn(`[SW] Failed to cache static page: ${page}`, e)
        }
      }

      // 2. Запрашиваем динамический манифест
      try {
        console.log('[SW] Fetching precache manifest...')
        const response = await fetch('/api/precache-manifest')

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const manifest = await response.json()
        console.log(`[SW] Manifest loaded: ${manifest.stats?.pagesCount} pages, ${manifest.stats?.imagesCount} images`)

        // 3. Кешируем динамические страницы (мандалы, товары)
        const dynamicPages = manifest.pages.filter((p) => !STATIC_PAGES.includes(p))
        if (dynamicPages.length > 0) {
          console.log(`[SW] Precaching ${dynamicPages.length} dynamic pages...`)
          // Кешируем по одной, чтобы не падать при ошибке одной страницы
          for (const page of dynamicPages) {
            try {
              await cache.add(page)
            } catch (e) {
              console.warn(`[SW] Failed to cache page: ${page}`, e)
            }
          }
        }

        // 4. Кешируем изображения
        if (manifest.images && manifest.images.length > 0) {
          console.log(`[SW] Precaching ${manifest.images.length} images...`)
          // Кешируем по одной, чтобы не падать при ошибке одного изображения
          for (const image of manifest.images) {
            try {
              await cache.add(image)
            } catch (e) {
              console.warn(`[SW] Failed to cache image: ${image}`, e)
            }
          }
        }

        console.log('[SW] Precaching complete!')
      } catch (e) {
        console.warn('[SW] Failed to fetch precache manifest:', e)
        // Продолжаем работу со статическими страницами
      }
    })()
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
          .filter((name) => name.startsWith('mandala-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

/**
 * Стратегия: Network First с fallback на Cache
 * Особенности:
 * - /api/files/* кешируются (изображения)
 * - Остальные /api/* НЕ кешируются
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Пропускаем non-GET запросы
  if (request.method !== 'GET') {
    return
  }

  // Пропускаем chrome-extension и другие non-http
  if (!request.url.startsWith('http')) {
    return
  }

  // Пропускаем API запросы, КРОМЕ /api/files/* (изображения из БД)
  if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/files/')) {
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
