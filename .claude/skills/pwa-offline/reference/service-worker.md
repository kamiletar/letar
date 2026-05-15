# Service Worker

Стратегии кэширования и роутинг запросов в Service Worker.

## Стратегии кэширования

### Network First — HTML страницы

Сначала пытаемся получить из сети, при ошибке — из кэша.

```javascript
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
```

### Cache First — статика (JS, CSS, шрифты)

Сначала из кэша, если нет — из сети.

```javascript
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
```

### Stale While Revalidate — изображения

Отдаём из кэша сразу, обновляем в фоне.

```javascript
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
```

---

## Роутинг запросов

```javascript
// public/sw.js

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const IMAGE_CACHE = `images-${CACHE_VERSION}`

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return
  }

  // Пропускаем auth и API (обрабатывается TanStack Query)
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) {
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
  if (url.pathname.startsWith('/uploads/') || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif)$/)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE))
    return
  }

  // Статика (JS, CSS, шрифты) — Cache First
  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Остальное — Network First
  event.respondWith(networkFirst(request, STATIC_CACHE))
})
```

---

## Precache

```javascript
const PRECACHE_URLS = ['/', '/offline', '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== STATIC_CACHE && name !== IMAGE_CACHE).map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})
```

---

## SW ↔ React коммуникация

### Prefetch изображений из React

```typescript
// В компоненте
const prefetchImages = (urls: string[]) => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_IMAGES',
      urls,
    })
  }
}

// При hover на карточку товара
<ProductCard onMouseEnter={() => prefetchImages(product.images.slice(0, 2))} />
```

### Обработка в SW

```javascript
self.addEventListener('message', async (event) => {
  if (event.data.type === 'CACHE_IMAGES') {
    const cache = await caches.open(IMAGE_CACHE)
    for (const url of event.data.urls) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          await cache.put(url, response)
        }
      } catch {
        // Игнорируем ошибки
      }
    }
  }
})
```

### Push-инвалидация кэша (SW → React)

```javascript
// SW: отправляем сообщение клиентам
self.addEventListener('push', (event) => {
  const data = event.data?.json()

  if (data?.type === 'NEW_PRODUCTS' || data?.type === 'SALE') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'INVALIDATE_PRODUCTS' })
        })
      })
    )
  }
})
```

```typescript
// React: слушаем сообщения от SW
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function useSWMessages() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'INVALIDATE_PRODUCTS') {
        queryClient.invalidateQueries({ queryKey: ['Product'] })
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
    }
  }, [queryClient])
}
```

---

## Версионирование (Next.js 16 + Turbopack)

Serwist не поддерживает Turbopack. Ручное решение:

### 1. Шаблон SW

```javascript
// public/sw.template.js
const SW_VERSION = '0.0.0' // Заменяется при билде
const CACHE_VERSION = `v${SW_VERSION}`
// ... остальной код SW
```

### 2. Скрипт обновления версии

```javascript
// scripts/update-sw-version.mjs
import fs from 'fs'
import path from 'path'

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const version = packageJson.version

const templatePath = path.join('public', 'sw.template.js')
const outputPath = path.join('public', 'sw.js')

const template = fs.readFileSync(templatePath, 'utf8')
const output = template.replace("SW_VERSION = '0.0.0'", `SW_VERSION = '${version}'`)

fs.writeFileSync(outputPath, output)
console.log(`Updated SW version to ${version}`)
```

### 3. Nx target

```json
// project.json
{
  "targets": {
    "update-sw-version": {
      "executor": "nx:run-commands",
      "options": {
        "command": "node scripts/update-sw-version.mjs"
      }
    },
    "build": {
      "dependsOn": ["update-sw-version"]
    }
  }
}
```

### 4. .gitignore

```gitignore
public/sw.js
```

---

## См. также

- [overview.md](overview.md) — Архитектура
- [tanstack-query-offline.md](tanstack-query-offline.md) — TanStack Query offline
- [testing.md](testing.md) — Тестирование SW
