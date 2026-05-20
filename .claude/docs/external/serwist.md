# Serwist — Документация

> Пакеты: `serwist`, `@serwist/next` | Docs: https://serwist.pages.dev
> PWA / Service Worker библиотека. В letar используется для offline-поддержки.

## Установка в Next.js

```bash
bun add @serwist/next serwist
```

---

## next.config.mjs — подключение плагина

```javascript
// next.config.mjs
import withSerwistInit from '@serwist/next'
import { spawnSync } from 'node:child_process'

const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ?? crypto.randomUUID()

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts', // исходник service worker
  swDest: 'public/sw.js', // собранный файл
  cacheOnNavigation: true, // кэшировать навигацию
  register: true, // автоматически регистрировать SW
  reloadOnOnline: true, // перезагрузить при восстановлении сети
  scope: '/',
  swUrl: '/sw.js',

  // Дополнительные файлы для прекэша
  additionalPrecacheEntries: [{ url: '/offline', revision }],

  // Отключить в dev-режиме
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import("next").NextConfig} */
const nextConfig = { reactStrictMode: true }

export default withSerwist(nextConfig)
```

---

## app/sw.ts — Service Worker

```typescript
// app/sw.ts
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST, // инжектится при сборке
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache, // оптимальные правила кэширования от @serwist/next

  // Offline fallback — страница /offline при недоступности сети
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

serwist.addEventListeners()
```

---

## Стратегии кэширования

```typescript
import {
  CacheableResponsePlugin,
  CacheFirst,
  CacheOnly,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from 'serwist'

// CacheFirst — сначала кэш, при промахе — сеть (для изображений, шрифтов)
const imageStrategy = new CacheFirst({
  cacheName: 'images-cache',
  plugins: [
    new ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 30 * 24 * 60 * 60, // 30 дней
    }),
    new CacheableResponsePlugin({ statuses: [0, 200] }),
  ],
})

// NetworkFirst — сначала сеть, fallback на кэш (для API)
const apiStrategy = new NetworkFirst({
  cacheName: 'api-responses',
  networkTimeoutSeconds: 10, // таймаут сети
  plugins: [
    new ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 5 * 60, // 5 минут
    }),
  ],
})

// StaleWhileRevalidate — сразу кэш + обновление в фоне (для статики)
const staticStrategy = new StaleWhileRevalidate({
  cacheName: 'static-assets',
  plugins: [
    new ExpirationPlugin({
      maxEntries: 64,
      maxAgeSeconds: 24 * 60 * 60,
    }),
  ],
})

// Использование в runtimeCaching
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: [
    {
      matcher: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: imageStrategy,
    },
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/'),
      handler: apiStrategy,
    },
    {
      matcher: /\.(?:js|css)$/i,
      handler: staticStrategy,
    },
  ],
})
```

---

## @serwist/window — управление SW из браузера

```typescript
// Регистрация и обновление
import { Serwist } from '@serwist/window'

const sw = new Serwist('/sw.js', { scope: '/' })
await sw.register()

// Уведомление о новой версии
sw.addEventListener('waiting', () => {
  if (confirm('Доступна новая версия. Обновить?')) {
    sw.messageSkipWaiting()
    window.location.reload()
  }
})

sw.addEventListener('controlling', (event) => {
  if (event.isUpdate) {
    window.location.reload()
  }
})

// Отправка сообщения в SW
sw.messageSW({ type: 'GET_VERSION' }).then((version) => {
  console.log('SW версия:', version)
})

// Ручная проверка обновлений
sw.update()
```

---

## Background Sync — очередь офлайн-запросов

```typescript
import { BackgroundSyncPlugin, NetworkOnly, Serwist } from 'serwist'

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: [
    {
      matcher: /\/api\/forms\/submit/,
      method: 'POST',
      handler: new NetworkOnly({
        plugins: [
          new BackgroundSyncPlugin('formSubmitQueue', {
            maxRetentionTime: 24 * 60, // повторять 24 часа (в минутах)
          }),
        ],
      }),
    },
  ],
})

serwist.addEventListeners()
```

---

## .gitignore

```gitignore
# Сгенерированные файлы SW — не коммитить
public/sw*
public/swe-worker*
```

---

## Паттерны в letar (pwa-offline)

```typescript
// В letar offline-поддержка через useOfflineForm из @letar/forms
// Документация: .claude/docs/pwa-offline.md
import { useOfflineForm } from '@letar/forms'

// SW настраивается по паттерну выше для каждого PWA-приложения
// Offline fallback страница создаётся в app/offline/page.tsx
export default function OfflinePage() {
  return (
    <div>
      <h1>Нет соединения</h1>
      <p>Проверьте подключение к интернету</p>
    </div>
  )
}
```

---

## Ссылки

- Docs: https://serwist.pages.dev
- GitHub: https://github.com/serwist/serwist
- Примеры: https://github.com/serwist/serwist/tree/main/examples
- letar PWA docs: `.claude/docs/pwa-offline.md`
