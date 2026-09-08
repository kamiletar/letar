/**
 * Общие константы для экосистемы Animatrona
 */

/** Конфигурация статуса аниме — лейбл и цвет для бейджей */
export interface AnimeStatusInfo {
  label: string
  colorPalette: string
}

/**
 * Маппинг статусов аниме → лейбл + цвет.
 * Ключи в lowercase для единообразия.
 */
export const ANIME_STATUS_CONFIG: Record<string, AnimeStatusInfo> = {
  ongoing: { label: 'Выходит', colorPalette: 'green' },
  completed: { label: 'Завершён', colorPalette: 'blue' },
  released: { label: 'Вышел', colorPalette: 'blue' },
  announced: { label: 'Анонс', colorPalette: 'yellow' },
}

/**
 * Получить конфигурацию статуса с нормализацией (toLowerCase).
 * Для UPPER_CASE ключей (desktop) и lowercase (web/tracker).
 */
export function getAnimeStatusConfig(status: string | undefined | null): AnimeStatusInfo | null {
  if (!status) {
    return null
  }
  return ANIME_STATUS_CONFIG[status.toLowerCase()] ?? null
}

/** Тип связи между аниме — подпись и цвет бейджа */
export interface RelationKindInfo {
  label: string
  colorPalette: string
}

/**
 * Типы связей между аниме → подпись + цвет.
 *
 * Ключи в lowercase; UPPER_CASE-варианты (так их отдаёт desktop-БД) нормализуются
 * геттером — тот же приём, что у `getAnimeStatusConfig`. До появления этого словаря
 * копии жили в четырёх местах и разошлись: `sequel` переводился и «Сиквел», и
 * «Продолжение», `alternative_version` — и полностью, и как «Альт. версия», а `spin_off`
 * в одной из копий отсутствовал вовсе, из-за чего спин-оффы оставались без подписи.
 */
export const RELATION_KIND_CONFIG: Record<string, RelationKindInfo> = {
  sequel: { label: 'Сиквел', colorPalette: 'green' },
  prequel: { label: 'Приквел', colorPalette: 'blue' },
  side_story: { label: 'Побочная история', colorPalette: 'purple' },
  parent_story: { label: 'Основная история', colorPalette: 'orange' },
  summary: { label: 'Краткое содержание', colorPalette: 'gray' },
  full_story: { label: 'Полная версия', colorPalette: 'teal' },
  spin_off: { label: 'Спин-офф', colorPalette: 'red' },
  adaptation: { label: 'Адаптация', colorPalette: 'yellow' },
  character: { label: 'Общие персонажи', colorPalette: 'pink' },
  alternative_version: { label: 'Альтернативная версия', colorPalette: 'cyan' },
  alternative_setting: { label: 'Альтернативный сеттинг', colorPalette: 'cyan' },
  other: { label: 'Другое', colorPalette: 'gray' },
}

/** Подпись и цвет типа связи; регистр ключа не важен */
export function getRelationKindInfo(kind: string | undefined | null): RelationKindInfo | null {
  if (!kind) {
    return null
  }
  return RELATION_KIND_CONFIG[kind.toLowerCase()] ?? null
}

/** Тип аниме — подпись и цвет бейджа */
export interface AnimeKindInfo {
  label: string
  colorPalette: string
}

/**
 * Типы аниме → подпись + цвет. Ключи в lowercase, регистр нормализует геттер.
 * `special` раньше переводился и «Спешл», и «Спецвыпуск», `tv` — и «TV», и «TV Сериал».
 */
export const ANIME_KIND_CONFIG: Record<string, AnimeKindInfo> = {
  tv: { label: 'TV', colorPalette: 'blue' },
  movie: { label: 'Фильм', colorPalette: 'purple' },
  ova: { label: 'OVA', colorPalette: 'orange' },
  ona: { label: 'ONA', colorPalette: 'teal' },
  special: { label: 'Спецвыпуск', colorPalette: 'pink' },
  tv_special: { label: 'ТВ-спецвыпуск', colorPalette: 'pink' },
  music: { label: 'Клип', colorPalette: 'cyan' },
}

/** Подпись и цвет типа аниме; регистр ключа не важен */
export function getAnimeKindInfo(kind: string | undefined | null): AnimeKindInfo | null {
  if (!kind) {
    return null
  }
  return ANIME_KIND_CONFIG[kind.toLowerCase()] ?? null
}

/** Конфигурация статусов публикации на трекере */
export const PUBLISH_STATUS_CONFIG: Record<string, { label: string; colorPalette: string }> = {
  PUBLISHED: { label: 'Опубликован', colorPalette: 'green' },
  PENDING: { label: 'На модерации', colorPalette: 'yellow' },
  REJECTED: { label: 'Отклонён', colorPalette: 'red' },
  HIDDEN: { label: 'Скрыт', colorPalette: 'gray' },
}
