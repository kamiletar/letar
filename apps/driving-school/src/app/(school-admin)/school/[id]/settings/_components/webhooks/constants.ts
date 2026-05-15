import type { WebhookEventType } from '@letar/driving-school-db/prisma'

/**
 * Константы для webhooks
 */

/** Доступные типы событий webhook */
export const EVENT_TYPES: { value: WebhookEventType; label: string }[] = [
  { value: 'LESSON_CONFIRMED', label: 'Занятие подтверждено' },
  { value: 'LESSON_CANCELLED', label: 'Занятие отменено' },
  { value: 'LESSON_COMPLETED', label: 'Занятие завершено' },
  { value: 'LESSON_NO_SHOW', label: 'Неявка на занятие' },
  { value: 'PAYMENT_RECEIVED', label: 'Оплата получена' },
  { value: 'ENROLLMENT_REQUEST_APPROVED', label: 'Заявка одобрена' },
  { value: 'ENROLLMENT_REQUEST_REJECTED', label: 'Заявка отклонена' },
  { value: 'STUDENT_TRANSFER_ACCEPTED', label: 'Передача принята' },
  { value: 'STUDENT_TRANSFER_REJECTED', label: 'Передача отклонена' },
  { value: 'REVIEW_CREATED', label: 'Отзыв создан' },
]

/** Получить label события по его value */
export function getEventLabel(eventType: WebhookEventType): string {
  return EVENT_TYPES.find((e) => e.value === eventType)?.label || eventType
}
