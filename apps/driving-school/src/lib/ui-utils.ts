/**
 * Утилиты для UI компонентов
 */

import type { AuditAction } from '@letar/driving-school-db/prisma'

// ============================================================================
// API СТАТУСЫ
// ============================================================================

/**
 * Возвращает цвет для HTTP статус-кода
 */
export function getApiStatusColor(status: number): string {
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

/**
 * Возвращает цвет для HTTP метода
 */
export function getMethodColor(method: string): string {
  switch (method) {
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
 * Форматирует время ответа API
 */
export function formatResponseTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}мс`
  }
  return `${(ms / 1000).toFixed(2)}с`
}

// ============================================================================
// АУДИТ ДЕЙСТВИЙ
// ============================================================================

/**
 * Возвращает читаемое название действия аудита
 */
export function getAuditActionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    USER_REGISTER: 'Регистрация',
    USER_LOGIN: 'Вход',
    LESSON_CREATE: 'Создание занятия',
    LESSON_CONFIRM: 'Подтверждение занятия',
    LESSON_CANCEL: 'Отмена занятия',
    LESSON_RESCHEDULE: 'Перенос занятия',
    LESSON_COMPLETE: 'Завершение занятия',
    PENALTY_CHARGE: 'Начисление штрафа',
    PENALTY_PAY: 'Оплата штрафа',
    PENALTY_CANCEL: 'Отмена штрафа',
    SCHEDULE_UPDATE: 'Обновление расписания',
    STUDENT_TRANSFER: 'Передача ученика',
    ADMIN_ACTION: 'Действие админа',
    OWNER_USER_BLOCK: 'Блокировка пользователя',
    OWNER_USER_UNBLOCK: 'Разблокировка пользователя',
    OWNER_USER_ROLE_CHANGE: 'Изменение роли',
    OWNER_SCHOOL_MODERATE: 'Модерация школы',
    OWNER_REVIEW_HIDE: 'Скрытие отзыва',
    OWNER_TICKET_ASSIGN: 'Назначение тикета',
    OWNER_TICKET_RESOLVE: 'Решение тикета',
  }

  return labels[action] || action
}

/**
 * Возвращает цвет для действия аудита
 */
export function getAuditActionColor(action: AuditAction): string {
  // Действия владельца - красный
  if (action.startsWith('OWNER_')) {
    return 'red'
  }

  // Штрафы - оранжевый
  if (action.startsWith('PENALTY_')) {
    return 'orange'
  }

  // Занятия - синий
  if (action.startsWith('LESSON_')) {
    return 'blue'
  }

  // Пользователи - зелёный
  if (action.startsWith('USER_')) {
    return 'green'
  }

  // Остальное - серый
  return 'gray'
}
