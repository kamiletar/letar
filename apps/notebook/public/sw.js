// Service worker Блокнота Ками. Без зависимостей: приложению нужны три вещи.
// 1. Открыть страницы без сети: HTML — сначала сеть (с таймаутом), при отказе последняя сохранённая копия.
// 2. Быстро отдавать статику Next (`/_next/static`, имена с хешем): сначала кэш.
// 3. Показать страницу «нет сети», если нужной страницы в кэше нет.
// Серверные действия (POST) и API не кэшируем. Правки офлайн хранит сам редактор в IndexedDB.

const VERSION = 'v1'
const PAGES = `notebook-pages-${VERSION}`
const STATIC = `notebook-static-${VERSION}`
const OFFLINE_URL = '/offline.html'
const NETWORK_TIMEOUT_MS = 4000

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => ![PAGES, STATIC].includes(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim()),
  )
})

/** Запрос к сети, который сдаётся через таймаут: на плохой мобильной связи лучше показать копию */
function fetchWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS)
    fetch(request).then(
      (response) => {
        clearTimeout(timer)
        resolve(response)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function handleNavigation(request) {
  const cache = await caches.open(PAGES)
  try {
    const response = await fetchWithTimeout(request)
    // Редиректы (например, на /login) не сохраняем: иначе страница заметки подменится формой входа
    if (response.ok && !response.redirected) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return (await cache.match(request)) ?? (await cache.match(OFFLINE_URL)) ?? Response.error()
  }
}

async function handleStatic(request) {
  const cache = await caches.open(STATIC)
  const cached = await cache.match(request)
  if (cached) {
    return cached
  }
  const response = await fetch(request)
  if (response.ok) {
    cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') {
    return
  }
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return
  }
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStatic(request))
  }
})
