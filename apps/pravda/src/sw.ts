import { defaultCache } from '@serwist/next/worker'
import { type PrecacheEntry, Serwist, type SerwistGlobalConfig } from 'serwist'

/**
 * Service Worker для Pravda.
 *
 * Обеспечивает оффлайн доступ к документам законодательства.
 * Регистрируется только после получения согласия пользователя.
 */

// Декларация глобальных переменных, инжектируемых Serwist
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  // Precache манифест, автоматически генерируемый при сборке
  precacheEntries: self.__SW_MANIFEST,
  // Пропускаем ожидание и активируем сразу
  skipWaiting: true,
  // Берём контроль над страницами сразу
  clientsClaim: true,
  // Предзагрузка для навигации
  navigationPreload: true,
  // Стратегии кэширования (по умолчанию от Serwist)
  runtimeCaching: defaultCache,
  // Fallback страница при отсутствии сети
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
})

serwist.addEventListeners()
