/**
 * Константы приложения Kami
 */

/**
 * Метки типов услуг
 */
export const SERVICE_TYPE_LABELS: Record<string, string> = {
  architecture: 'Архитектура',
  'code-review': 'Code Review',
  audit: 'Аудит',
  mentoring: 'Менторинг',
}

/**
 * Метки статусов заявок
 */
export const REQUEST_STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  contacted: 'Связались',
  scheduled: 'Назначено',
  completed: 'Выполнено',
  cancelled: 'Отменено',
}

/**
 * Цвета статусов заявок
 */
export const REQUEST_STATUS_COLORS: Record<string, string> = {
  new: 'blue',
  contacted: 'yellow',
  scheduled: 'purple',
  completed: 'green',
  cancelled: 'red',
}

/**
 * Настройки анимаций motion
 */
export const MOTION_DEFAULTS: {
  viewportMargin: string
  easingOut: string
  duration: number
  delay: number
} = {
  /** Отступ viewport для срабатывания */
  viewportMargin: '-50px',
  /** Easing для плавных анимаций */
  easingOut: 'easeOut',
  /** Длительность по умолчанию */
  duration: 0.5,
  /** Задержка по умолчанию */
  delay: 0,
}

/**
 * Контактная информация
 */
export const CONTACT = {
  email: 'kami@letar.best',
  telegram: '@husber',
} as const

/**
 * Размер страницы для пагинации в админке
 */
export const ADMIN_PAGE_SIZE = 20

/**
 * Glow эффекты для Matrix-стиля
 * Цвет: emerald-500 (#10B981)
 */
export const GLOW = {
  /** Основной цвет свечения (emerald-500) */
  color: '#10B981',
  /** Свечение текста */
  textShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
  /** Свечение кнопки (нормальное) */
  boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)',
  /** Свечение кнопки (hover) */
  boxShadowHover: '0 0 40px rgba(16, 185, 129, 0.6)',
  /** Свечение карточки */
  cardShadow: '0 0 20px rgba(16, 185, 129, 0.15)',
  /** Свечение карточки с тенью */
  cardShadowFull: '0 20px 40px rgba(0,0,0,0.1), 0 0 20px rgba(16, 185, 129, 0.15)',
} as const
