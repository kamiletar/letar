/**
 * Типы для шаблонов импорта
 *
 * Шаблоны позволяют сохранять и переиспользовать настройки
 * кодирования для быстрого импорта сериалов.
 */

/**
 * Шаблон импорта
 */
export interface ImportTemplate {
  /** Уникальный идентификатор */
  id: string

  /** Название шаблона */
  name: string

  /** ID профиля кодирования */
  profileId: string

  /** Настройки VMAF подбора CQ */
  vmafSettings: {
    /** Включён ли VMAF подбор */
    enabled: boolean
    /** Целевой VMAF score */
    targetVmaf: number
  }

  /** Максимальное количество одновременных аудио задач */
  audioMaxConcurrent: number

  /** Максимальное количество одновременных видео задач */
  videoMaxConcurrent: number

  /** Дата создания */
  createdAt: string

  /** Дата последнего использования */
  lastUsedAt?: string
}

/**
 * Данные для создания шаблона
 */
export type ImportTemplateCreateData = Omit<ImportTemplate, 'id' | 'createdAt' | 'lastUsedAt'>

/**
 * Данные для обновления шаблона
 */
export type ImportTemplateUpdateData = Partial<ImportTemplateCreateData>
