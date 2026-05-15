/**
 * Хелпер для конфигурации persistence форм.
 * Устраняет дублирование одинаковых настроек localStorage persistence.
 */

/**
 * Конфигурация persistence (соответствует FormPersistenceConfig из @letar/forms).
 */
export interface FormPersistenceOptions {
  /** Ключ для localStorage */
  key: string
  /** Задержка сохранения в ms */
  debounceMs?: number
  /** Заголовок диалога восстановления */
  dialogTitle?: string
  /** Описание диалога восстановления */
  dialogDescription?: string
  /** Текст кнопки восстановления */
  restoreButtonText?: string
  /** Текст кнопки сброса */
  discardButtonText?: string
}

/**
 * Создаёт конфигурацию persistence для формы.
 * @param entityType - Тип сущности (product, mandala, content-page)
 * @param entityId - ID сущности (undefined для создания новой)
 * @returns Конфигурация для prop `persistence` в MandalaForm
 */
export function createFormPersistence(entityType: string, entityId?: string): FormPersistenceOptions {
  return {
    key: entityId ? `${entityType}-form-${entityId}` : `${entityType}-form-new`,
    debounceMs: 500,
    dialogTitle: 'Восстановить данные?',
    dialogDescription: 'Найдены несохранённые изменения формы. Хотите продолжить редактирование?',
    restoreButtonText: 'Восстановить',
    discardButtonText: 'Начать заново',
  }
}
