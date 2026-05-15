// Service Worker для PWA
// Premium Rosstil
// Версия: 2.0 — добавлено кэширование для оффлайн режима

// ============================================
// КОНФИГУРАЦИЯ КЭШИРОВАНИЯ
// ============================================

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const IMAGE_CACHE = `images-${CACHE_VERSION}`

// Статические ресурсы для precache при установке
const PRECACHE_URLS = ['/', '/offline', '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png']

// ============================================
// СТРАТЕГИИ КЭШИРОВАНИЯ
// ============================================

// Network First — для HTML страниц (актуальный контент, fallback из кэша)
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || caches.match('/offline')
  }
}

// Cache First — для статики (JS, CSS, шрифты)
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

// Stale While Revalidate — для изображений (показать сразу, обновить в фоне)
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cached)

  return cached || fetchPromise
}

// ============================================
// УСТАНОВКА SERVICE WORKER
// ============================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Precache основных ресурсов, игнорируя ошибки отдельных файлов
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Не удалось закэшировать ${url}:`, err)
          })
        )
      )
    })
  )
  self.skipWaiting()
})

// ============================================
// АКТИВАЦИЯ — ОЧИСТКА СТАРЫХ КЭШЕЙ
// ============================================

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('static-') || key.startsWith('images-'))
          .filter((key) => !key.includes(CACHE_VERSION))
          .map((key) => {
            console.log(`[SW] Удаляю старый кэш: ${key}`)
            return caches.delete(key)
          })
      )
    })
  )
  event.waitUntil(clients.claim())
})

// ============================================
// FETCH — РОУТИНГ ЗАПРОСОВ
// ============================================

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return
  }

  // Пропускаем auth (авторизация должна быть онлайн)
  if (url.pathname.startsWith('/auth/')) {
    return
  }

  // Пропускаем API (обрабатывается TanStack Query)
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Пропускаем внешние запросы
  if (url.origin !== self.location.origin) {
    return
  }

  // HTML страницы — Network First
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, STATIC_CACHE))
    return
  }

  // Изображения — Stale While Revalidate
  if (url.pathname.startsWith('/uploads/') || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico)$/i)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE))
    return
  }

  // Статика (JS, CSS, шрифты) — Cache First
  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/i) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Остальное — Network First
  event.respondWith(networkFirst(request, STATIC_CACHE))
})

// ============================================
// PUSH-УВЕДОМЛЕНИЯ
// ============================================

self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      tag: data.tag || 'default',
      renotify: true,
      data: {
        url: data.url || '/',
        dateOfArrival: Date.now(),
      },
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если есть открытая вкладка — фокусируемся на ней
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen)
          return client.focus()
        }
      }
      // Иначе открываем новую вкладку
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// ============================================
// ОБРАБОТКА СООБЩЕНИЙ ОТ КЛИЕНТА
// ============================================

self.addEventListener('message', async (event) => {
  // Prefetch страниц
  if (event.data.type === 'PREFETCH') {
    const cache = await caches.open(STATIC_CACHE)
    for (const url of event.data.urls) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          await cache.put(url, response)
          console.log(`[SW] Prefetch: ${url}`)
        }
      } catch {
        // Игнорируем ошибки предзагрузки
      }
    }
  }

  // Кэширование изображений
  if (event.data.type === 'CACHE_IMAGES') {
    const cache = await caches.open(IMAGE_CACHE)
    for (const url of event.data.urls) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          await cache.put(url, response)
          console.log(`[SW] Cached image: ${url}`)
        }
      } catch {
        // Игнорируем ошибки
      }
    }
  }

  // Очистка кэша (для отладки)
  if (event.data.type === 'CLEAR_CACHE') {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
    console.log('[SW] Все кэши очищены')
  }
})
