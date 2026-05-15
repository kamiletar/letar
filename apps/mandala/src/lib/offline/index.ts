/**
 * Offline функциональность для Mandala
 *
 * Типы действий синхронизации для оффлайн форм.
 * Реализация хуков в @letar/forms/offline
 */

/**
 * Типы действий синхронизации для Mandala
 *
 * - CREATE_ORDER — создание заказа из checkout формы
 * - SEND_CONTACT — отправка контактной формы
 */
export type MandalaActionType = 'CREATE_ORDER' | 'SEND_CONTACT'
