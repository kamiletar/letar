/**
 * LRU кэш для результатов ffmpeg.probe
 *
 * Уменьшает количество IPC вызовов при навигации между эпизодами.
 * Результаты probe редко меняются — можно безопасно кэшировать.
 */

import type { MediaInfo, OperationResult } from '../../../../shared/types'

/** Тип результата ffmpeg.probe */
export type ProbeResult = OperationResult & { data?: MediaInfo }

/** Максимальное количество записей в кэше */
const MAX_CACHE_SIZE = 100

/** Время жизни записи в кэше (30 минут) */
const CACHE_TTL_MS = 30 * 60 * 1000

interface CacheEntry {
  result: ProbeResult
  timestamp: number
}

/** LRU кэш для probe результатов */
const probeCache = new Map<string, CacheEntry>()

/**
 * Получить результат probe из кэша или выполнить IPC вызов
 */
export async function getCachedProbe(filePath: string): Promise<ProbeResult> {
  // Проверяем кэш
  const cached = probeCache.get(filePath)
  if (cached) {
    // Проверяем TTL
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      // Перемещаем в конец для LRU (удаляем и добавляем заново)
      probeCache.delete(filePath)
      probeCache.set(filePath, cached)
      return cached.result
    }
    // TTL истёк — удаляем
    probeCache.delete(filePath)
  }

  // Выполняем IPC вызов
  if (!window.electronAPI) {
    return { success: false, error: 'electronAPI недоступен' }
  }

  const result = await window.electronAPI.ffmpeg.probe(filePath)

  // Кэшируем только успешные результаты
  if (result.success) {
    // Проверяем размер кэша
    if (probeCache.size >= MAX_CACHE_SIZE) {
      // Удаляем самую старую запись (первую в Map)
      const oldestKey = probeCache.keys().next().value
      if (oldestKey) {
        probeCache.delete(oldestKey)
      }
    }

    probeCache.set(filePath, {
      result,
      timestamp: Date.now(),
    })
  }

  return result
}

/**
 * Очистить кэш для конкретного файла
 * Полезно если файл был изменён
 */
export function invalidateProbeCache(filePath: string): void {
  probeCache.delete(filePath)
}

/**
 * Полностью очистить кэш
 */
export function clearProbeCache(): void {
  probeCache.clear()
}

/**
 * Получить статистику кэша (для отладки)
 */
export function getProbeCacheStats(): { size: number; maxSize: number } {
  return {
    size: probeCache.size,
    maxSize: MAX_CACHE_SIZE,
  }
}
