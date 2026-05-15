/**
 * Модуль desktop-нотификаций для очереди импорта
 *
 * Отвечает только за показ системных уведомлений Electron.
 * Не зависит от состояния очереди — принимает готовые данные.
 */

import { Notification } from 'electron'

/**
 * Показать нотификацию о завершении импорта сериала
 */
export function notifyImportCompleted(animeName: string): void {
  if (!Notification.isSupported()) {
    return
  }

  new Notification({
    title: 'Импорт завершён',
    body: animeName,
    silent: false,
  }).show()
}

/**
 * Показать нотификацию о завершении с предупреждением (частичный успех)
 */
export function notifyImportWarning(animeName: string, warning: string): void {
  if (!Notification.isSupported()) {
    return
  }

  new Notification({
    title: '⚠ Импорт завершён с проблемами',
    body: `${animeName}: ${warning}`,
    silent: false,
  }).show()
}

/**
 * Показать нотификацию об ошибке импорта
 */
export function notifyImportError(animeName: string, error?: string): void {
  if (!Notification.isSupported()) {
    return
  }

  new Notification({
    title: 'Ошибка импорта',
    body: error ? `${animeName}: ${error}` : animeName,
    silent: false,
  }).show()
}

/**
 * Показать нотификацию о завершении всей очереди
 * @param completed - количество успешно завершённых items
 * @param errors - количество items с ошибками
 */
export function notifyQueueCompleted(completed: number, errors: number): void {
  if (!Notification.isSupported()) {
    return
  }

  let body = `Обработано: ${completed}`
  if (errors > 0) {
    body += `, ошибок: ${errors}`
  }

  new Notification({
    title: 'Очередь импорта завершена',
    body,
    silent: false,
  }).show()
}
