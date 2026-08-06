/**
 * Service Worker для Kami.
 * Обеспечивает офлайн доступ к сайту-портфолио.
 */

// Версия подставляется скриптом update-sw-version.mjs
const SW_VERSION = '0.0.0'
const CACHE_NAME = `kami-${SW_VERSION}`

// Важные страницы для precache (без локали — будут добавлены динамически)
const BASE_URLS = [
  '/',
  '/offline/',
  '/about/',
  '/cv/',
  '/skills/',
  '/projects/',
  '/blog/',
  '/consulting/',
  '/learning/',
]

// Локали для precache
const LOCALES = ['ru', 'en']

// Генерируем URL для всех локалей
const PRECACHE_URLS = ['/', ...LOCALES.flatMap((locale) => BASE_URLS.map((url) => `/${locale}${url}`))]

// Устанавливаем SW и кэшируем важные страницы
self.addEventListener('install', (event) => {
  console.log(`[SW] Установка версии ${SW_VERSION}`)
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching pages...')
      // Используем Promise.allSettled для игнорирования ошибок отдельных URL
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to cache ${url}:`, err.message)
          })
        ),
      )
    }),
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
          .filter((name) => name.startsWith('kami-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          }),
      )
    }),
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

  // Пропускаем API запросы и Keystatic
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/keystatic/')) {
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
          // Пробуем найти оффлайн страницу для текущей локали
          const locale = url.pathname.split('/')[1]
          if (LOCALES.includes(locale)) {
            const offlinePage = await caches.match(`/${locale}/offline/`)
            if (offlinePage) {
              return offlinePage
            }
          }
          // Fallback на русскую локаль
          const fallbackPage = await caches.match('/ru/offline/')
          if (fallbackPage) {
            return fallbackPage
          }
        }

        return new Response('Нет подключения к сети', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }),
  )
})

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/',
      },
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Если есть открытое окно, фокусируемся на нём
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      // Иначе открываем новое окно
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
      return undefined
    }),
  )
})

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }
})
