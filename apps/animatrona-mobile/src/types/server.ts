/**
 * Типы конфигурации серверов
 *
 * Поддерживаемые типы:
 * - desktop: Animatrona Desktop (локальный сервер в Wi-Fi)
 * - tracker: Animatrona Tracker (веб-платформа с IPFS каталогом)
 */

/** Тип сервера */
export type ServerType = 'desktop' | 'tracker'

/** Конфигурация подключения к серверу */
export interface ServerConfig {
  /** Уникальный ID (генерируется при создании) */
  id: string
  /** Отображаемое имя */
  name: string
  /** Тип сервера */
  type: ServerType
  /** URL сервера (http://192.168.1.100:3100 или https://animatrona-tracker.letar.best) */
  url: string
  /** API Key для Tracker (формат: at_xxx) */
  apiKey?: string
}

/** Иконки типов серверов */
export const SERVER_TYPE_ICONS: Record<ServerType, string> = {
  desktop: '💻',
  tracker: '🌐',
}

/** Названия типов серверов */
export const SERVER_TYPE_LABELS: Record<ServerType, string> = {
  desktop: 'Desktop',
  tracker: 'Tracker',
}
