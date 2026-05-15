/**
 * Централизованные сообщения об ошибках для driving-school
 *
 * Используйте эти константы вместо захардкоженных строк:
 * - Единообразие сообщений во всём приложении
 * - Упрощённая локализация
 * - Централизованное управление текстами
 */

/**
 * Общие сообщения об ошибках
 */
export const ERROR_MESSAGES = {
  // Загрузка данных
  LOAD_FAILED: 'Не удалось загрузить данные',
  LOAD_CHATS_FAILED: 'Не удалось загрузить чаты',
  LOAD_MESSAGES_FAILED: 'Не удалось загрузить сообщения',
  LOAD_LESSONS_FAILED: 'Не удалось загрузить занятия',
  LOAD_STUDENTS_FAILED: 'Не удалось загрузить учеников',
  LOAD_VEHICLES_FAILED: 'Не удалось загрузить автомобили',
  LOAD_SCHEDULE_FAILED: 'Не удалось загрузить расписание',

  // Сохранение
  SAVE_FAILED: 'Не удалось сохранить',
  UPDATE_FAILED: 'Не удалось обновить',
  CREATE_FAILED: 'Не удалось создать',
  DELETE_FAILED: 'Не удалось удалить',

  // Авторизация
  UNAUTHORIZED: 'Требуется авторизация',
  FORBIDDEN: 'Доступ запрещён',
  SESSION_EXPIRED: 'Сессия истекла, войдите снова',

  // Сеть
  NETWORK_ERROR: 'Ошибка сети. Проверьте подключение к интернету',
  SERVER_ERROR: 'Ошибка сервера. Попробуйте позже',
  TIMEOUT: 'Превышено время ожидания',

  // Валидация
  INVALID_DATA: 'Некорректные данные',
  REQUIRED_FIELD: 'Обязательное поле',
  INVALID_EMAIL: 'Некорректный email',
  INVALID_PHONE: 'Некорректный номер телефона',

  // Конкретные действия
  SEND_MESSAGE_FAILED: 'Не удалось отправить сообщение',
  UPLOAD_FAILED: 'Не удалось загрузить файл',
  DOWNLOAD_FAILED: 'Не удалось скачать файл',

  // Онбординг
  ONBOARDING_SAVE_FAILED: 'Не удалось сохранить прогресс',
  ONBOARDING_SKIP_FAILED: 'Не удалось пропустить онбординг',
  ONBOARDING_COMPLETE_FAILED: 'Не удалось завершить онбординг',

  // Занятия
  LESSON_CONFIRM_FAILED: 'Не удалось подтвердить занятие',
  LESSON_CANCEL_FAILED: 'Не удалось отменить занятие',
  LESSON_RESCHEDULE_FAILED: 'Не удалось перенести занятие',

  // Общее
  UNKNOWN_ERROR: 'Произошла неизвестная ошибка',
  TRY_AGAIN: 'Попробуйте ещё раз',
} as const

/**
 * Сообщения успеха
 */
export const SUCCESS_MESSAGES = {
  SAVED: 'Сохранено',
  UPDATED: 'Обновлено',
  CREATED: 'Создано',
  DELETED: 'Удалено',
  SENT: 'Отправлено',
  UPLOADED: 'Загружено',

  // Занятия
  LESSON_CONFIRMED: 'Занятие подтверждено',
  LESSON_CANCELLED: 'Занятие отменено',
  LESSON_RESCHEDULED: 'Занятие перенесено',

  // Профиль
  PROFILE_UPDATED: 'Профиль обновлён',
  PASSWORD_CHANGED: 'Пароль изменён',

  // Онбординг
  ONBOARDING_COMPLETED: 'Настройка профиля завершена',
  ONBOARDING_SKIPPED: 'Онбординг пропущен',
} as const

/**
 * Информационные сообщения
 */
export const INFO_MESSAGES = {
  LOADING: 'Загрузка...',
  SAVING: 'Сохранение...',
  PROCESSING: 'Обработка...',
  NO_DATA: 'Нет данных',
  NO_RESULTS: 'Ничего не найдено',
  EMPTY_LIST: 'Список пуст',

  // Подсказки
  UNSAVED_CHANGES: 'У вас есть несохранённые изменения',
  CONFIRM_DELETE: 'Вы уверены, что хотите удалить?',
  CONFIRM_CANCEL: 'Вы уверены, что хотите отменить?',
} as const

/**
 * Типы для TypeScript
 */
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES
export type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES
export type InfoMessageKey = keyof typeof INFO_MESSAGES

/**
 * Хелпер для получения сообщения по ключу (для обработки ошибок от API)
 */
export function getErrorMessage(errorCode: string | undefined): string {
  if (!errorCode) {
    return ERROR_MESSAGES.UNKNOWN_ERROR
  }

  const message = ERROR_MESSAGES[errorCode as ErrorMessageKey]
  return message ?? ERROR_MESSAGES.UNKNOWN_ERROR
}
