'use client'

import { LuCheck, LuCircle, LuClock, LuPause, LuPlay, LuRefreshCw, LuUserX, LuX } from 'react-icons/lu'

// Реэкспорт компонента из @letar/ui
export { StatusBadge, type StatusConfig } from '@letar/ui'

// Импорт типа для satisfies
import type { StatusConfig } from '@letar/ui'

// ============================================================================
// ПРЕДОПРЕДЕЛЁННЫЕ КОНФИГУРАЦИИ СТАТУСОВ (app-specific)
// ============================================================================

/**
 * Статусы занятий (Lessons)
 */
export const LESSON_STATUS_CONFIG = {
  PENDING: { label: 'Ожидает', colorPalette: 'yellow', icon: LuClock },
  CONFIRMED: { label: 'Подтверждено', colorPalette: 'blue', icon: LuCheck },
  COMPLETED: { label: 'Проведено', colorPalette: 'green', icon: LuCheck },
  CANCELLED: { label: 'Отменено', colorPalette: 'red', icon: LuX },
  NO_SHOW: { label: 'Неявка', colorPalette: 'orange', icon: LuUserX },
  NEEDS_RESCHEDULE: { label: 'Требует переноса', colorPalette: 'purple', icon: LuRefreshCw },
  RESCHEDULED: { label: 'Перенесено', colorPalette: 'gray', icon: LuRefreshCw },
} as const satisfies Record<string, StatusConfig>

/**
 * Статусы заявок на обучение (Enrollment Requests)
 */
export const ENROLLMENT_REQUEST_STATUS_CONFIG = {
  PENDING: { label: 'Ожидает', colorPalette: 'yellow', icon: LuClock },
  APPROVED: { label: 'Одобрена', colorPalette: 'green', icon: LuCheck },
  REJECTED: { label: 'Отклонена', colorPalette: 'red', icon: LuX },
  CANCELLED: { label: 'Отменена', colorPalette: 'gray', icon: LuX },
} as const satisfies Record<string, StatusConfig>

/**
 * Статусы экзаменов (Exam Sessions)
 */
export const EXAM_SESSION_STATUS_CONFIG = {
  SCHEDULED: { label: 'Запланирован', colorPalette: 'blue', icon: LuClock },
  IN_PROGRESS: { label: 'Идёт', colorPalette: 'green', icon: LuPlay },
  COMPLETED: { label: 'Завершён', colorPalette: 'gray', icon: LuCheck },
  CANCELLED: { label: 'Отменён', colorPalette: 'red', icon: LuX },
} as const satisfies Record<string, StatusConfig>

/**
 * Статусы теоретических занятий (Theory Lessons)
 */
export const THEORY_LESSON_STATUS_CONFIG = {
  SCHEDULED: { label: 'Запланировано', colorPalette: 'blue', icon: LuClock },
  IN_PROGRESS: { label: 'Идёт', colorPalette: 'green', icon: LuPlay },
  COMPLETED: { label: 'Завершено', colorPalette: 'gray', icon: LuCheck },
  CANCELLED: { label: 'Отменено', colorPalette: 'red', icon: LuX },
  RESCHEDULED: { label: 'Перенесено', colorPalette: 'orange', icon: LuRefreshCw },
} as const satisfies Record<string, StatusConfig>

/**
 * Статусы слотов расписания (Time Slots)
 */
export const TIME_SLOT_STATUS_CONFIG = {
  AVAILABLE: { label: 'Свободен', colorPalette: 'green', icon: LuCircle },
  BOOKED: { label: 'Занят', colorPalette: 'blue', icon: LuCheck },
  BLOCKED: { label: 'Заблокирован', colorPalette: 'gray', icon: LuX },
} as const satisfies Record<string, StatusConfig>

/**
 * Статусы подключения студентов (Connection Status)
 */
export const CONNECTION_STATUS_CONFIG = {
  ACTIVE: { label: 'Активен', colorPalette: 'green', icon: LuCheck },
  PAUSED: { label: 'Приостановлен', colorPalette: 'yellow', icon: LuPause },
  DISCONNECTED: { label: 'Отключён', colorPalette: 'gray', icon: LuUserX },
} as const satisfies Record<string, StatusConfig>

/**
 * Роли пользователей в школе (School Roles)
 */
export const SCHOOL_ROLE_CONFIG = {
  ADMIN: { label: 'Администратор', colorPalette: 'red' },
  MANAGER: { label: 'Менеджер', colorPalette: 'orange' },
  INSTRUCTOR: { label: 'Инструктор', colorPalette: 'blue' },
  THEORY_INSTRUCTOR: { label: 'Преподаватель теории', colorPalette: 'purple' },
  STUDENT: { label: 'Ученик', colorPalette: 'green' },
} as const satisfies Record<string, StatusConfig>

/**
 * Статусы тикетов поддержки
 */
export const TICKET_STATUS_CONFIG = {
  OPEN: { label: 'Открыт', colorPalette: 'blue', icon: LuCircle },
  IN_PROGRESS: { label: 'В работе', colorPalette: 'orange', icon: LuClock },
  RESOLVED: { label: 'Решён', colorPalette: 'green', icon: LuCheck },
  CLOSED: { label: 'Закрыт', colorPalette: 'gray', icon: LuX },
} as const satisfies Record<string, StatusConfig>

/**
 * Статусы API ключей
 */
export const API_KEY_STATUS_CONFIG = {
  ACTIVE: { label: 'Активен', colorPalette: 'green', icon: LuCheck },
  REVOKED: { label: 'Отозван', colorPalette: 'red', icon: LuX },
} as const satisfies Record<string, StatusConfig>

/**
 * Статусы Webhooks
 */
export const WEBHOOK_STATUS_CONFIG = {
  ACTIVE: { label: 'Активен', colorPalette: 'green', icon: LuCheck },
  PAUSED: { label: 'Приостановлен', colorPalette: 'yellow', icon: LuPause },
  DISABLED: { label: 'Отключён', colorPalette: 'red', icon: LuX },
} as const satisfies Record<string, StatusConfig>

// ============================================================================
// УТИЛИТЫ ДЛЯ HTTP СТАТУСОВ
// ============================================================================

type ColorPalette = 'green' | 'red' | 'blue' | 'yellow' | 'orange' | 'purple' | 'gray' | 'brand'

/**
 * Получить цвет для HTTP метода
 */
export function getHttpMethodColor(method: string): ColorPalette {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'blue'
    case 'POST':
      return 'green'
    case 'PUT':
    case 'PATCH':
      return 'orange'
    case 'DELETE':
      return 'red'
    default:
      return 'gray'
  }
}

/**
 * Получить цвет для HTTP статус-кода
 */
export function getHttpStatusColor(status: number): ColorPalette {
  if (status >= 200 && status < 300) {
    return 'green'
  }
  if (status >= 400 && status < 500) {
    return 'orange'
  }
  if (status >= 500) {
    return 'red'
  }
  return 'gray'
}
