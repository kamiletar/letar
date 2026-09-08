/**
 * Дисковый кэш результатов пробы медиафайла (`mediaInfoWasmProber.probe`) поверх
 * `@letar/electron-storage` — переживает перезапуск приложения, в отличие от in-memory
 * LRU-кэша рендерера (`libs/folder-player-react/src/lib/probe-cache.ts`).
 *
 * Ключ инвалидации — не TTL, а фактическое состояние файла: запись валидна, пока
 * совпадают `mtimeMs` и `size` на диске. Смена файла (перекодирование, замена раздачи
 * тем же именем) автоматически даёт промах и повторную пробу.
 */
import { createJsonStore } from '@letar/electron-storage'
import type { MediaInfo } from '@letar/folder-scan'
import { stat } from 'node:fs/promises'

interface ProbeCacheEntry {
  mtimeMs: number
  size: number
  data: MediaInfo
  probedAt: number
}

interface ProbeCacheState {
  entries: Record<string, ProbeCacheEntry>
}

/** Максимальное количество записей — эвикция самых старых по `probedAt` при превышении */
const MAX_ENTRIES = 500

const store = createJsonStore<ProbeCacheState>(
  'probe-cache.json',
  { entries: {} },
  // Большой TTL — на весь сеанс работы приложения отдаём из памяти без перечитывания
  // диска на каждый probe; свежее состояние получаем только при первом обращении.
  { cacheTtlMs: 24 * 60 * 60 * 1000, mergeDefaults: true, atomic: true },
)

function evictOldestIfNeeded(entries: Record<string, ProbeCacheEntry>): void {
  const keys = Object.keys(entries)
  if (keys.length <= MAX_ENTRIES) {
    return
  }
  const oldestKey = keys.reduce((oldest, key) => (entries[key].probedAt < entries[oldest].probedAt ? key : oldest))
  delete entries[oldestKey]
}

/**
 * Получить результат пробы из дискового кэша или выполнить `probeFn` и сохранить результат.
 */
export async function getCachedProbe(
  filePath: string,
  probeFn: (filePath: string) => Promise<MediaInfo>,
): Promise<MediaInfo> {
  const stats = await stat(filePath)
  const state = await store.load()
  const cached = state.entries[filePath]

  if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
    return cached.data
  }

  const data = await probeFn(filePath)

  const entries = { ...state.entries }
  entries[filePath] = { mtimeMs: stats.mtimeMs, size: stats.size, data, probedAt: Date.now() }
  evictOldestIfNeeded(entries)

  await store.save({ entries })

  return data
}
