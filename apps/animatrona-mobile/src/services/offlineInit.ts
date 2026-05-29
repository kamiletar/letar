/**
 * Инициализация оффлайн-системы
 *
 * Вызвать при старте приложения:
 * - Создаёт директории для файлов
 * - Подписывается на изменения offline store
 * - При восстановлении связи запускает синхронизацию прогресса
 * - Запускает download manager для незавершённых загрузок
 */

import { useOfflineStore } from '@/store/offline'
import { useServersStore } from '@/store/servers'
import { startDownloadManager } from './downloadManager'
import { ensureDirectories } from './fileStorage'
import { cachePostersForLibrary } from './posterCache'
import { processSyncQueue } from './progressSync'

/** Инициализация оффлайн-системы (вызвать один раз при старте) */
export async function initOfflineSystem(): Promise<void> {
  console.warn('[offlineInit] Инициализация оффлайн-системы')

  // Создать директории
  await ensureDirectories()

  // Подписаться на изменение доступности сервера
  let wasReachable = useOfflineStore.getState().isServerReachable

  useOfflineStore.subscribe((state) => {
    const isNowReachable = state.isServerReachable

    // Сервер стал доступен — синхронизируем прогресс и кэшируем постеры
    if (isNowReachable && !wasReachable) {
      console.warn('[offlineInit] Сервер стал доступен — синхронизация прогресса')
      processSyncQueue().catch((err) => {
        console.warn('[offlineInit] Ошибка синхронизации:', err)
      })
      // Фоновое кэширование постеров
      const { activeServerId } = useServersStore.getState()
      if (activeServerId) {
        import('@/services/cache')
          .then(({ getCachedLibrary }) =>
            getCachedLibrary(activeServerId).then((lib) => {
              if (lib) {
                cachePostersForLibrary(lib.map((a) => a.id)).catch(() => undefined)
              }
            })
          )
          .catch(() => undefined)
      }
    }

    wasReachable = isNowReachable
  })

  // Запустить download manager (подхватит незавершённые загрузки из очереди)
  startDownloadManager()

  console.warn('[offlineInit] Готово')
}
