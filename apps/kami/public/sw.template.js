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

// ========================================
// Офлайн-очередь Web Share Target (Фаза 10)
// ========================================
// Android шарит POST /share/ напрямую в этот SW (см. manifest.ts share_target). Если сети нет —
// не роняем шаринг, а складываем поля в IndexedDB и просим браузер синхронизировать через
// Background Sync API, когда сеть вернётся. Без npm-зависимостей — sw.template.js раздаётся как
// есть, не проходит через сборку.

const QUEUE_DB_NAME = 'kami-share-queue'
const QUEUE_STORE = 'pending'
const SYNC_TAG = 'kami-sync-share-queue'

const QUEUED_HTML = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Сохранено локально — Kami</title>
<style>body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#e5e5e5;display:flex;
align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
.box{max-width:360px}h1{font-size:1.25rem;margin-bottom:8px}p{color:#a3a3a3;font-size:.9rem}
a{color:#10B981}</style></head>
<body><div class="box"><h1>Сохранено локально</h1>
<p>Сети нет — ссылка сохранена на устройстве и синхронизируется автоматически, как только
подключение появится.</p><p><a href="/">На главную</a></p></div></body></html>`

/** Открывает (или создаёт при первом обращении) БД очереди */
function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function addToShareQueue(item) {
  const db = await openQueueDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    tx.objectStore(QUEUE_STORE).add(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getAllQueuedShares() {
  const db = await openQueueDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly')
    const req = tx.objectStore(QUEUE_STORE).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function removeFromShareQueue(id) {
  const db = await openQueueDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    tx.objectStore(QUEUE_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Пытается отправить все отложенные ссылки на реальный /share/ — останавливается на первой сетевой ошибке */
async function flushShareQueue() {
  let items
  try {
    items = await getAllQueuedShares()
  } catch {
    return
  }
  for (const item of items) {
    try {
      const body = new URLSearchParams({ title: item.title, text: item.text, url: item.url })
      const response = await fetch('/share/', { method: 'POST', body, credentials: 'same-origin' })
      // 3xx (редирект после сохранения) или ok — сервер принял; дальнейшую логику решает сам /share
      if (response.ok || response.redirected || (response.status >= 300 && response.status < 400)) {
        await removeFromShareQueue(item.id)
      }
    } catch {
      // Сеть снова недоступна на середине очереди — прерываемся, остаток попробуем в следующий раз
      break
    }
  }
}

/** Обрабатывает POST /share/ — онлайн передаёт как обычно, офлайн складывает в очередь */
async function handleShareSubmit(request) {
  const requestForQueue = request.clone()
  try {
    return await fetch(request)
  } catch {
    const formData = await requestForQueue.formData()
    await addToShareQueue({
      title: formData.get('title') || '',
      text: formData.get('text') || '',
      url: formData.get('url') || '',
      queuedAt: Date.now(),
    })
    if ('sync' in self.registration) {
      try {
        await self.registration.sync.register(SYNC_TAG)
      } catch {
        // Background Sync недоступен/отклонён — очередь всё равно синхронизируется при
        // следующем открытии приложения (см. opportunistic-флаш в основном fetch-обработчике)
      }
    }
    return new Response(QUEUED_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }
}

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
    }).then(() => flushShareQueue()), // на случай если очередь скопилась, пока SW обновлялся
  )
  self.clients.claim()
})

// Background Sync — браузер сам решает, когда повторить (при появлении сети), с backoff
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushShareQueue())
  }
})

// Стратегия: Network First с fallback на Cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // POST /share/ — Web Share Target, отдельная ветка с офлайн-очередью (см. выше)
  if (request.method === 'POST') {
    const postUrl = new URL(request.url)
    if (postUrl.pathname === '/share/' || postUrl.pathname === '/share') {
      event.respondWith(handleShareSubmit(request))
    }
    return
  }

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

        // Opportunistic-флаш очереди Share Target — на случай если Background Sync не
        // поддерживается браузером (например Firefox for Android): раз уж сеть точно есть
        // (иначе не дошли бы до этой точки), пробуем догрузить то, что скопилось в IndexedDB
        if (request.destination === 'document') {
          flushShareQueue()
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
