/**
 * Очередь синхронизации прогресса просмотра
 *
 * Когда сервер недоступен, прогресс сохраняется в очередь.
 * При восстановлении связи — отправляется на сервер.
 * Стратегия конфликтов: last-write-wins (локальный timestamp).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import { saveProgress } from '@/api/client'

const QUEUE_KEY = '@animatrona/sync_queue'

/** Элемент очереди синхронизации */
interface SyncQueueItem {
  episodeId: string
  currentTime: number
  completed: boolean
  /** Длительность эпизода (для Tracker API) */
  duration: number
  /** Время записи (для last-write-wins) */
  timestamp: number
}

// --- Очередь ---

/** Получить всю очередь */
async function getQueue(): Promise<SyncQueueItem[]> {
  try {
    const json = await AsyncStorage.getItem(QUEUE_KEY)
    if (!json) {
      return []
    }
    return JSON.parse(json) as SyncQueueItem[]
  } catch {
    return []
  }
}

/** Сохранить очередь */
async function setQueue(queue: SyncQueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch (error) {
    console.warn('[progressSync] Ошибка сохранения очереди:', error)
  }
}

/** Добавить прогресс в очередь синхронизации */
export async function queueProgressSync(
  episodeId: string,
  data: { currentTime: number; completed?: boolean; duration?: number },
): Promise<void> {
  const queue = await getQueue()

  // Обновляем существующую запись или добавляем новую
  const existingIndex = queue.findIndex((item) => item.episodeId === episodeId)
  const item: SyncQueueItem = {
    episodeId,
    currentTime: data.currentTime,
    completed: data.completed ?? false,
    duration: data.duration ?? 0,
    timestamp: Date.now(),
  }

  if (existingIndex >= 0) {
    queue[existingIndex] = item
  } else {
    queue.push(item)
  }

  await setQueue(queue)
  console.warn('[progressSync] Добавлен в очередь:', episodeId, `(всего: ${queue.length})`)
}

/** Обработать очередь — отправить прогресс на сервер */
export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue()

  if (queue.length === 0) {
    return { synced: 0, failed: 0 }
  }

  console.warn('[progressSync] Синхронизация очереди:', queue.length, 'элементов')

  let synced = 0
  const failed: SyncQueueItem[] = []

  for (const item of queue) {
    try {
      await saveProgress(item.episodeId, {
        currentTime: item.currentTime,
        completed: item.completed,
        duration: item.duration,
      })
      synced++
    } catch (error) {
      console.warn('[progressSync] Ошибка синхронизации:', item.episodeId, error)
      failed.push(item)
    }
  }

  // Сохраняем только неудачные попытки
  await setQueue(failed)

  console.warn('[progressSync] Синхронизировано:', synced, '/ Ошибок:', failed.length)
  return { synced, failed: failed.length }
}

/** Размер очереди */
export async function getSyncQueueSize(): Promise<number> {
  const queue = await getQueue()
  return queue.length
}

/** Очистить очередь */
export async function clearSyncQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY)
}
