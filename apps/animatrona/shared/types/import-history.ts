/**
 * Типы для истории импортов
 */

/** Запись истории импорта */
export interface ImportHistoryEntry {
  /** Уникальный ID записи */
  id: string
  /** ID элемента очереди (для связи с шаблоном) */
  queueItemId: string
  /** Название аниме */
  animeName: string
  /** Русское название */
  animeNameRu?: string
  /** ID аниме в БД */
  animeId?: string
  /** Shikimori ID */
  shikimoriId?: number
  /** URL постера */
  posterUrl?: string
  /** Количество эпизодов */
  episodesCount: number
  /** Сезон */
  seasonNumber?: number
  /** Статус завершения */
  status: 'completed' | 'error' | 'cancelled'
  /** Сообщение об ошибке (если есть) */
  errorMessage?: string

  // === Статистика ===

  /** Время начала импорта (ISO string) */
  startedAt: string
  /** Время завершения импорта (ISO string) */
  completedAt: string
  /** Длительность импорта (мс) */
  durationMs: number
  /** Общий размер импортированных файлов (bytes) */
  totalSizeBytes?: number
  /** VMAF score (если подбирался CQ) */
  vmafScore?: number
  /** CQ значение */
  cqValue?: number
  /** Использовался ли CPU fallback */
  usedCpuFallback?: boolean

  // === Настройки для повторения ===

  /** ID шаблона (если использовался) */
  templateId?: string
  /** ID профиля кодирования */
  profileId?: string
  /** Путь к исходной папке */
  sourceFolderPath?: string
}

/** Данные для создания записи истории */
export interface ImportHistoryCreateData {
  queueItemId: string
  animeName: string
  animeNameRu?: string
  animeId?: string
  shikimoriId?: number
  posterUrl?: string
  episodesCount: number
  seasonNumber?: number
  status: 'completed' | 'error' | 'cancelled'
  errorMessage?: string
  startedAt: string
  completedAt: string
  durationMs: number
  totalSizeBytes?: number
  vmafScore?: number
  cqValue?: number
  usedCpuFallback?: boolean
  templateId?: string
  profileId?: string
  sourceFolderPath?: string
}

/** Фильтры для запроса истории */
export interface ImportHistoryFilter {
  /** Фильтр по статусу */
  status?: 'completed' | 'error' | 'cancelled'
  /** Поиск по названию */
  search?: string
  /** Минимальная дата */
  fromDate?: string
  /** Максимальная дата */
  toDate?: string
  /** Лимит записей */
  limit?: number
  /** Смещение */
  offset?: number
}

/** Статистика истории */
export interface ImportHistoryStats {
  /** Всего импортов */
  totalImports: number
  /** Успешных импортов */
  successfulImports: number
  /** Импортов с ошибками */
  failedImports: number
  /** Отменённых импортов */
  cancelledImports: number
  /** Общее время импортов (мс) */
  totalDurationMs: number
  /** Среднее время импорта (мс) */
  avgDurationMs: number
  /** Общий размер (bytes) */
  totalSizeBytes: number
  /** Средний VMAF score */
  avgVmafScore?: number
}
