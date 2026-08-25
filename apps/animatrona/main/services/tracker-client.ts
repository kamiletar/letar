/**
 * TrackerClient — Клиент для публикации аниме на animatrona-tracker
 *
 * Отправляет directoryCid на tracker — трекер сам извлекает метаданные из IPFS.
 */

import type { StatsReportDelta } from '../../shared/types/stats'
import type {
  TrackerAddToLibraryResult,
  TrackerAnimeDetailResult,
  TrackerCatalogResult,
  TrackerDistribution,
  TrackerDistributionResult,
  TrackerLibraryItem,
  TrackerSyncItem,
  TrackerSyncResult,
  TrackerUserProfile,
  TrackerWatchProgressItem,
} from '../../shared/types/tracker'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('TrackerClient')

/** Тело ответа трекера при ошибке */
type TrackerErrorPayload = { error?: string }

/** Типизированный разбор JSON-ответа fetch */
async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

/** Конфигурация подключения к tracker */
export interface TrackerConfig {
  /** URL трекера (например, https://animatrona-tracker.letar.best) */
  baseUrl: string
  /** API ключ для аутентификации */
  apiKey: string
}

/** Собрать заголовки авторизации (пропускает пустой apiKey для публичных endpoints) */
function buildAuthHeaders(config: TrackerConfig): Record<string, string> {
  if (config.apiKey) {
    return { Authorization: `Bearer ${config.apiKey}` }
  }
  return {}
}

/** Результат публикации на tracker */
export interface TrackerPublishResult {
  success: boolean
  /** ID аниме на tracker */
  animeId?: string
  /** Статус (PENDING / PUBLISHED) */
  status?: string
  /** Количество эпизодов */
  episodeCount?: number
  /** Сообщение об ошибке */
  error?: string
  /** Является ли кандидатом на замену существующей раздачи */
  isReplacement?: boolean
  /** ID аниме, которое может быть заменено */
  replacesAnimeId?: string
}

/** Результат проверки подключения */
export interface TrackerConnectionResult {
  success: boolean
  message: string
  trackerName?: string
}

/**
 * Публикует аниме на tracker по directoryCid
 *
 * Трекер сам извлекает манифест, анимеинфо и эпизоды из IPFS-директории.
 *
 * @param config - Конфигурация подключения
 * @param directoryCid - CID корневой IPFS-директории аниме
 * @returns Результат публикации
 */
export async function publishToTracker(config: TrackerConfig, directoryCid: string): Promise<TrackerPublishResult> {
  log.info('Публикация на tracker', {
    baseUrl: config.baseUrl,
    directoryCid,
  })

  try {
    const payload = { directoryCid }

    const response = await fetch(`${config.baseUrl}/api/anime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await readJson<TrackerErrorPayload>(response).catch(() => ({ error: response.statusText }))
      const errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error)

      log.error('Ошибка публикации', {
        status: response.status,
        error: errorMessage,
      })

      return {
        success: false,
        error: `${response.status}: ${errorMessage}`,
      }
    }

    const result = await readJson<{
      anime?: {
        id?: string
        status?: string
        episodeCount?: number
        isReplacement?: boolean
        replacesAnimeId?: string
      }
    }>(response)

    log.info('Успешная публикация', {
      animeId: result.anime?.id,
      status: result.anime?.status,
      isReplacement: result.anime?.isReplacement,
    })

    return {
      success: true,
      animeId: result.anime?.id,
      status: result.anime?.status,
      episodeCount: result.anime?.episodeCount,
      isReplacement: result.anime?.isReplacement,
      replacesAnimeId: result.anime?.replacesAnimeId,
    }
  } catch (error) {
    // TypeError: terminated — соединение прервано
    if (error instanceof TypeError && error.message === 'terminated') {
      log.warn('Соединение прервано при публикации')
      return {
        success: false,
        error: 'Соединение прервано',
      }
    }

    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка сети при публикации', { error: message })

    return {
      success: false,
      error: `Ошибка сети: ${message}`,
    }
  }
}

/**
 * Проверяет подключение к tracker
 *
 * @param config - Конфигурация подключения
 * @returns Результат проверки
 */
export async function testTrackerConnection(config: TrackerConfig): Promise<TrackerConnectionResult> {
  log.info('Проверка подключения к tracker', { baseUrl: config.baseUrl })

  try {
    // Пробуем получить список аниме (публичный эндпоинт)
    const response = await fetch(`${config.baseUrl}/api/anime?limit=1`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    })

    if (response.status === 401) {
      await response.body?.cancel().catch(() => {
        /* игнорируем */
      })
      return {
        success: false,
        message: 'Неверный API ключ',
      }
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => {
        /* игнорируем */
      })
      return {
        success: false,
        message: `Ошибка сервера: ${response.status}`,
      }
    }

    return {
      success: true,
      message: 'Подключение успешно',
      trackerName: new URL(config.baseUrl).hostname,
    }
  } catch (error) {
    // TypeError: terminated — соединение прервано
    if (error instanceof TypeError && error.message === 'terminated') {
      return {
        success: false,
        message: 'Соединение прервано',
      }
    }

    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка подключения к tracker', { error: message })

    return {
      success: false,
      message: `Не удалось подключиться: ${message}`,
    }
  }
}

/**
 * Зарегистрировать раздачу на трекере (POST /api/distributions)
 *
 * Desktop вызывает при старте сидирования CID.
 * Upsert — если раздача с таким cid+peerId уже есть, обновляет heartbeat.
 */
export async function registerDistribution(
  config: TrackerConfig,
  params: { cid: string; peerId: string; animeId?: string; size?: number },
): Promise<TrackerDistributionResult> {
  try {
    const response = await fetch(`${config.baseUrl}/api/distributions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorData = await readJson<TrackerErrorPayload>(response).catch(() => ({ error: response.statusText }))
      return { success: false, error: `${response.status}: ${errorData.error || response.statusText}` }
    }

    const result = await readJson<{ data?: TrackerDistribution }>(response)
    return { success: true, distribution: result.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка регистрации раздачи', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Обновить раздачу на трекере (PATCH /api/distributions/[id])
 *
 * Используется для heartbeat и обновления статуса.
 */
export async function updateDistribution(
  config: TrackerConfig,
  distributionId: string,
  params: { status?: 'ACTIVE' | 'PAUSED' | 'OFFLINE' },
): Promise<TrackerDistributionResult> {
  try {
    const response = await fetch(`${config.baseUrl}/api/distributions/${distributionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorData = await readJson<TrackerErrorPayload>(response).catch(() => ({ error: response.statusText }))
      return { success: false, error: `${response.status}: ${errorData.error || response.statusText}` }
    }

    const result = await readJson<{ data?: TrackerDistribution }>(response)
    return { success: true, distribution: result.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка обновления раздачи', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Отправить статистику раздач на трекер (POST /api/distributions/stats)
 *
 * Отправляет дельту с момента последнего отчёта.
 */
export async function reportStats(
  config: TrackerConfig,
  peerId: string,
  delta: StatsReportDelta,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${config.baseUrl}/api/distributions/stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ peerId, ...delta }),
    })

    if (!response.ok) {
      const errorData = await readJson<TrackerErrorPayload>(response).catch(() => ({ error: response.statusText }))
      return { success: false, error: `${response.status}: ${errorData.error || response.statusText}` }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка отправки статистики', { error: message })
    return { success: false, error: message }
  }
}

// ============================================================================
// Cloud Library — Облачная библиотека
// ============================================================================

/**
 * Получить каталог аниме с трекера (GET /api/anime)
 */
export async function fetchTrackerCatalog(
  config: TrackerConfig,
  params?: { page?: number; limit?: number; q?: string },
): Promise<TrackerCatalogResult> {
  try {
    const url = new URL(`${config.baseUrl}/api/anime`)
    if (params?.page) {
      url.searchParams.set('page', String(params.page))
    }
    if (params?.limit) {
      url.searchParams.set('limit', String(params.limit))
    }
    if (params?.q) {
      url.searchParams.set('search', params.q)
    }

    // Каталог — публичный endpoint, Auth опционален
    log.info('Запрос каталога', { url: url.toString() })
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildAuthHeaders(config),
      signal: AbortSignal.timeout(15_000),
    })

    log.info('Ответ каталога', { status: response.status })

    if (!response.ok) {
      return { success: false, error: `${response.status}: ${response.statusText}` }
    }

    const result = await readJson<{
      data?: TrackerCatalogResult['data']
      pagination?: { total?: number }
      total?: number
    }>(response)
    log.info('Каталог загружен', { count: result.data?.length ?? 0, total: result.pagination?.total ?? 0 })
    return {
      success: true,
      data: result.data ?? [],
      total: result.pagination?.total ?? result.total ?? 0,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка загрузки каталога', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Получить детали аниме с трекера (GET /api/anime/{id})
 */
export async function fetchTrackerAnimeDetail(
  config: TrackerConfig,
  animeId: string,
): Promise<TrackerAnimeDetailResult> {
  try {
    // Детали аниме — публичный endpoint, Auth опционален
    const response = await fetch(`${config.baseUrl}/api/anime/${animeId}`, {
      method: 'GET',
      headers: buildAuthHeaders(config),
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Аниме не найдено' }
      }
      return { success: false, error: `${response.status}: ${response.statusText}` }
    }

    const result = await readJson<{ data?: TrackerAnimeDetailResult['data'] }>(response)
    return { success: true, data: result.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка загрузки деталей аниме', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Получить библиотеку пользователя с трекера (GET /api/user/library)
 */
export async function fetchLibraryFromTracker(
  config: TrackerConfig,
): Promise<{ success: boolean; data?: TrackerLibraryItem[]; error?: string }> {
  try {
    const response = await fetch(`${config.baseUrl}/api/user/library`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })

    if (!response.ok) {
      return { success: false, error: `${response.status}: ${response.statusText}` }
    }

    const result = await readJson<{ data?: TrackerLibraryItem[] }>(response)
    return { success: true, data: result.data ?? [] }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка загрузки библиотеки с трекера', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Синхронизировать библиотеку на трекер (POST /api/user/library/sync)
 *
 * Bidirectional sync: отправляет локальные данные + syncedSince,
 * получает serverItems с изменениями на сервере.
 */
export async function syncLibraryToTracker(
  config: TrackerConfig,
  items: TrackerSyncItem[],
  syncedSince?: string,
): Promise<TrackerSyncResult> {
  try {
    const response = await fetch(`${config.baseUrl}/api/user/library/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ items, syncedSince }),
    })

    if (!response.ok) {
      const errorData = await readJson<TrackerErrorPayload>(response).catch(() => ({ error: response.statusText }))
      return { success: false, error: `${response.status}: ${errorData.error || response.statusText}` }
    }

    return await readJson<TrackerSyncResult>(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка синхронизации библиотеки', { error: message })
    return { success: false, error: message }
  }
}

// ============================================================================
// Watch Progress — Прогресс просмотра
// ============================================================================

/**
 * Отправить прогресс просмотра на трекер (POST /api/watch-progress)
 */
export async function pushWatchProgress(
  config: TrackerConfig,
  params: {
    animeId: string
    episodeNumber: number
    currentTime: number
    duration: number
    completed?: boolean
    updatedAt?: string
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${config.baseUrl}/api/watch-progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorData = await readJson<TrackerErrorPayload>(response).catch(() => ({ error: response.statusText }))
      return { success: false, error: `${response.status}: ${errorData.error || response.statusText}` }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка отправки прогресса', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Получить обновлённый прогресс с трекера (GET /api/user/watch-progress?since=...)
 */
export async function fetchWatchProgressSince(
  config: TrackerConfig,
  since?: string,
): Promise<{ success: boolean; items?: TrackerWatchProgressItem[]; error?: string }> {
  try {
    const url = new URL(`${config.baseUrl}/api/user/watch-progress`)
    if (since) {
      url.searchParams.set('since', since)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })

    if (!response.ok) {
      return { success: false, error: `${response.status}: ${response.statusText}` }
    }

    const result = await readJson<{ items?: TrackerWatchProgressItem[] }>(response)
    return { success: true, items: result.items ?? [] }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка получения прогресса с трекера', { error: message })
    return { success: false, error: message }
  }
}

// ============================================================================
// User Profile — Профиль пользователя
// ============================================================================

/**
 * Получить профиль пользователя с трекера (GET /api/profile/settings)
 */
export async function fetchProfile(
  config: TrackerConfig,
): Promise<{ success: boolean; data?: TrackerUserProfile; error?: string }> {
  try {
    const response = await fetch(`${config.baseUrl}/api/profile/settings`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })

    if (!response.ok) {
      return { success: false, error: `${response.status}: ${response.statusText}` }
    }

    const result = await readJson<{ data?: TrackerUserProfile }>(response)
    return { success: true, data: result.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка получения профиля', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Обновить профиль пользователя на трекере (PATCH /api/profile/settings)
 */
export async function updateProfile(
  config: TrackerConfig,
  updates: Partial<TrackerUserProfile>,
): Promise<{ success: boolean; data?: TrackerUserProfile; error?: string }> {
  try {
    const response = await fetch(`${config.baseUrl}/api/profile/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const errorData = await readJson<TrackerErrorPayload>(response).catch(() => ({ error: response.statusText }))
      return { success: false, error: `${response.status}: ${errorData.error || response.statusText}` }
    }

    const result = await readJson<{ data?: TrackerUserProfile }>(response)
    return { success: true, data: result.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка обновления профиля', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Добавить аниме в библиотеку через трекер (POST /api/user/library/add)
 */
export async function addToLibraryViaTracker(
  config: TrackerConfig,
  animeId: string,
): Promise<TrackerAddToLibraryResult> {
  try {
    const response = await fetch(`${config.baseUrl}/api/user/library/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ animeId }),
    })

    if (!response.ok) {
      const errorData = await readJson<TrackerErrorPayload>(response).catch(() => ({ error: response.statusText }))
      return { success: false, error: `${response.status}: ${errorData.error || response.statusText}` }
    }

    return await readJson<TrackerAddToLibraryResult>(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Ошибка добавления в библиотеку', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Получить публичный список pin-серверов для sync Kubo peering/bootstrap.
 *
 * Endpoint: GET /api/pin-servers/public (без auth, публичный).
 * Cache-Control: public, max-age=300 (5 мин).
 *
 * @param baseUrl Базовый URL трекера (например, https://animatrona-tracker.letar.best)
 */
export async function fetchPinServers(baseUrl: string): Promise<import('./kubo/peer-sync-types').PinServerResponse> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/pin-servers/public`
  log.debug('fetchPinServers', { url })

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok) {
    throw new Error(`fetchPinServers failed: HTTP ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as import('./kubo/peer-sync-types').PinServerResponse
}
