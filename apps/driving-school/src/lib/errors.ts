/**
 * Централизованные коды ошибок и их маппинг на сообщения
 *
 * @module errors
 *
 * Использование:
 * ```ts
 * import { ActionErrorCode, getErrorMessage, actionError } from '@/lib/errors'
 *
 * // В Server Action:
 * if (!user) {
 *   return actionError('UNAUTHORIZED')
 * }
 *
 * // Получить сообщение для UI:
 * const message = getErrorMessage('UNAUTHORIZED')
 * ```
 */

// === Коды ошибок аутентификации ===
export type AuthErrorCode =
  | 'UNAUTHORIZED' // Не авторизован
  | 'FORBIDDEN' // Нет прав доступа
  | 'EMAIL_NOT_VERIFIED' // Email не подтверждён
  | 'INVALID_CREDENTIALS' // Неверные учётные данные
  | 'EMAIL_EXISTS' // Email уже зарегистрирован
  | 'USER_NOT_FOUND' // Пользователь не найден
  | 'ALREADY_VERIFIED' // Email уже подтверждён
  | 'NOT_STUDENT' // Требуется роль ученика
  | 'NOT_INSTRUCTOR' // Требуется роль инструктора
  | 'NOT_SCHOOL_ADMIN' // Требуется роль админа школы
  | 'NOT_SCHOOL_MEMBER' // Требуется членство в школе
  | 'NOT_OWNER' // Требуется владелец ресурса

// === Коды ошибок токенов ===
export type TokenErrorCode =
  | 'TOKEN_NOT_FOUND' // Токен не найден
  | 'TOKEN_INVALID' // Токен невалидный
  | 'TOKEN_EXPIRED' // Токен истёк
  | 'EXPIRED_TOKEN' // Токен истёк (алиас)
  | 'INVALID_TOKEN' // Токен невалидный (алиас)
  | 'PIN_EXPIRED' // PIN-код истёк
  | 'INVALID_PIN' // Неверный PIN-код

// === Коды ошибок валидации ===
export type ValidationErrorCode =
  | 'VALIDATION_ERROR' // Ошибка валидации данных
  | 'NOT_FOUND' // Ресурс не найден
  | 'ALREADY_EXISTS' // Ресурс уже существует
  | 'CANNOT_DELETE' // Невозможно удалить
  | 'CANNOT_EDIT' // Невозможно редактировать
  | 'CANNOT_CANCEL' // Невозможно отменить
  | 'CANNOT_RESCHEDULE' // Невозможно перенести
  | 'CANNOT_START' // Невозможно начать
  | 'CANNOT_COMPLETE' // Невозможно завершить
  | 'HAS_ATTENDANCE' // Есть записи посещаемости
  | 'COMPLETED_LESSON' // Занятие завершено
  | 'INVALID_STATUS' // Некорректный статус
  | 'INVALID_TRANSITION' // Некорректный переход статуса
  | 'ALREADY_SUBMITTED' // Уже отправлено
  | 'ALREADY_APPROVED' // Уже подтверждено
  | 'ALREADY_REGISTERED' // Уже зарегистрирован
  | 'ALREADY_REQUESTED' // Запрос уже отправлен
  | 'ALREADY_ISSUED' // Уже выдано
  | 'ALREADY_FULLY_PAID' // Уже полностью оплачено
  | 'ALREADY_EXPELLED' // Уже отчислен
  | 'ALREADY_SUSPENDED' // Уже приостановлен
  | 'NOT_SUSPENDED' // Не приостановлен
  | 'NOT_READY' // Не готов

// === Коды ошибок лимитов ===
export type RateLimitErrorCode =
  | 'RATE_LIMITED' // Слишком много запросов
  | 'TOO_MANY_ATTEMPTS' // Слишком много попыток
  | 'IN_COOLDOWN' // Период ожидания

// === Коды ошибок приглашений ===
export type InvitationErrorCode =
  | 'ALREADY_MEMBER' // Уже член школы
  | 'ALREADY_USED' // Приглашение уже использовано
  | 'EXPIRED' // Приглашение истекло

// === Коды ошибок экзаменов ГИБДД ===
export type GibddErrorCode =
  | 'THEORY_NOT_PASSED' // Теория не сдана
  | 'THEORY_EXPIRED' // Срок теории истёк
  | 'NOT_APPROVED' // Нет допуска от инструктора
  | 'ALREADY_PASSED' // Экзамен уже сдан

// === Коды ошибок чатов ===
export type ChatErrorCode = 'CANNOT_CHAT_WITH_SELF' // Нельзя написать себе

// === Коды ошибок профилей и связей ===
export type ProfileErrorCode =
  | 'NO_PROFILE' // Профиль не найден
  | 'STUDENT_PROFILE_NOT_FOUND' // Профиль ученика не найден
  | 'NOT_YOUR_STUDENT' // Не ваш ученик
  | 'USER_NOT_MEMBER' // Пользователь не является участником

// === Коды ошибок бизнес-логики ===
export type BusinessErrorCode =
  | 'CANNOT_PARTNER_SELF' // Нельзя создать партнёрство с собой
  | 'HAS_PURCHASES' // Есть покупки
  | 'HAS_INSTRUCTORS' // Есть привязанные инструкторы
  | 'HAS_ENROLLMENTS' // Есть зачисления
  | 'HAS_PROGRESS' // Есть прогресс обучения
  | 'COURSE_NOT_ACTIVE' // Курс не активен
  | 'LESSON_TYPE_NOT_ACTIVE' // Тип занятия не активен
  | 'INSUFFICIENT_LESSONS' // Недостаточно занятий
  | 'NO_CATEGORIES' // Нет категорий
  | 'SESSION_NOT_FOUND' // Сессия не найдена

// === Общие коды ошибок ===
export type GeneralErrorCode =
  | 'UNKNOWN_ERROR' // Неизвестная ошибка
  | 'SAVE_FAILED' // Ошибка сохранения
  | 'SKIP_FAILED' // Ошибка пропуска
  | 'GROUP_NOT_FOUND' // Группа не найдена
  | 'TOPIC_NOT_FOUND' // Тема не найдена

// === Все коды ошибок ===
export type ActionErrorCode =
  | AuthErrorCode
  | TokenErrorCode
  | ValidationErrorCode
  | RateLimitErrorCode
  | InvitationErrorCode
  | GibddErrorCode
  | ChatErrorCode
  | ProfileErrorCode
  | BusinessErrorCode
  | GeneralErrorCode

// === Маппинг кодов ошибок на сообщения ===
const ERROR_MESSAGES: Record<ActionErrorCode, string> = {
  // Auth
  UNAUTHORIZED: 'Необходимо войти в систему',
  FORBIDDEN: 'Нет прав доступа',
  EMAIL_NOT_VERIFIED: 'Email не подтверждён',
  INVALID_CREDENTIALS: 'Неверный email или пароль',
  EMAIL_EXISTS: 'Этот email уже зарегистрирован',
  USER_NOT_FOUND: 'Пользователь не найден',
  ALREADY_VERIFIED: 'Email уже подтверждён',
  NOT_STUDENT: 'Доступно только для учеников',
  NOT_INSTRUCTOR: 'Доступно только для инструкторов',
  NOT_SCHOOL_ADMIN: 'Доступно только для администраторов школы',
  NOT_SCHOOL_MEMBER: 'Вы не являетесь членом этой школы',
  NOT_OWNER: 'Нет прав на изменение этого ресурса',

  // Token
  TOKEN_NOT_FOUND: 'Ссылка недействительна',
  TOKEN_INVALID: 'Ссылка недействительна',
  TOKEN_EXPIRED: 'Срок действия ссылки истёк',
  EXPIRED_TOKEN: 'Срок действия ссылки истёк',
  INVALID_TOKEN: 'Ссылка недействительна',
  PIN_EXPIRED: 'Срок действия кода истёк',
  INVALID_PIN: 'Неверный код подтверждения',

  // Validation
  VALIDATION_ERROR: 'Некорректные данные',
  NOT_FOUND: 'Не найдено',
  ALREADY_EXISTS: 'Уже существует',
  CANNOT_DELETE: 'Невозможно удалить',
  CANNOT_EDIT: 'Невозможно редактировать',
  CANNOT_CANCEL: 'Невозможно отменить',
  CANNOT_RESCHEDULE: 'Невозможно перенести',
  CANNOT_START: 'Невозможно начать',
  CANNOT_COMPLETE: 'Невозможно завершить',
  HAS_ATTENDANCE: 'Есть записи посещаемости',
  COMPLETED_LESSON: 'Занятие завершено',
  INVALID_STATUS: 'Некорректный статус',
  INVALID_TRANSITION: 'Некорректный переход статуса',
  ALREADY_SUBMITTED: 'Уже отправлено',
  ALREADY_APPROVED: 'Уже подтверждено',
  ALREADY_REGISTERED: 'Уже зарегистрирован',
  ALREADY_REQUESTED: 'Запрос уже отправлен',
  ALREADY_ISSUED: 'Уже выдано',
  ALREADY_FULLY_PAID: 'Уже полностью оплачено',
  ALREADY_EXPELLED: 'Уже отчислен',
  ALREADY_SUSPENDED: 'Уже приостановлен',
  NOT_SUSPENDED: 'Не приостановлен',
  NOT_READY: 'Не готов',

  // Rate limit
  RATE_LIMITED: 'Слишком много запросов. Попробуйте позже',
  TOO_MANY_ATTEMPTS: 'Слишком много попыток. Попробуйте позже',
  IN_COOLDOWN: 'Период ожидания. Попробуйте позже',

  // Invitation
  ALREADY_MEMBER: 'Вы уже являетесь членом школы',
  ALREADY_USED: 'Приглашение уже использовано',
  EXPIRED: 'Срок действия приглашения истёк',

  // GIBDD
  THEORY_NOT_PASSED: 'Теория ГИБДД не сдана',
  THEORY_EXPIRED: 'Срок действия теории истёк',
  NOT_APPROVED: 'Нет допуска от инструктора',
  ALREADY_PASSED: 'Экзамен уже сдан',

  // Chat
  CANNOT_CHAT_WITH_SELF: 'Нельзя отправить сообщение самому себе',

  // Profile
  NO_PROFILE: 'Профиль не найден',
  STUDENT_PROFILE_NOT_FOUND: 'Профиль ученика не найден',
  NOT_YOUR_STUDENT: 'Это не ваш ученик',
  USER_NOT_MEMBER: 'Пользователь не является участником',

  // Business
  CANNOT_PARTNER_SELF: 'Нельзя создать партнёрство с собой',
  HAS_PURCHASES: 'Есть покупки',
  HAS_INSTRUCTORS: 'Есть привязанные инструкторы',
  HAS_ENROLLMENTS: 'Есть зачисления',
  HAS_PROGRESS: 'Есть прогресс обучения',
  COURSE_NOT_ACTIVE: 'Курс не активен',
  LESSON_TYPE_NOT_ACTIVE: 'Тип занятия не активен',
  INSUFFICIENT_LESSONS: 'Недостаточно занятий',
  NO_CATEGORIES: 'Нет категорий',
  SESSION_NOT_FOUND: 'Сессия не найдена',

  // General
  UNKNOWN_ERROR: 'Произошла ошибка. Попробуйте позже',
  SAVE_FAILED: 'Ошибка сохранения',
  SKIP_FAILED: 'Ошибка пропуска',
  GROUP_NOT_FOUND: 'Группа не найдена',
  TOPIC_NOT_FOUND: 'Тема не найдена',
}

/**
 * Получить user-friendly сообщение для кода ошибки
 */
export function getErrorMessage(code: ActionErrorCode): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN_ERROR
}

/**
 * Проверить, является ли строка валидным кодом ошибки
 */
export function isActionErrorCode(value: string): value is ActionErrorCode {
  return value in ERROR_MESSAGES
}

// === Типы результатов Action ===

/**
 * Успешный результат
 */
export interface ActionSuccess<T> {
  success: true
  data: T
}

/**
 * Результат с ошибкой
 */
export interface ActionError {
  success: false
  error: ActionErrorCode
  message?: string
}

/**
 * Результат Action
 */
export type ActionResult<T> = ActionSuccess<T> | ActionError

/**
 * Создать стандартный ответ с ошибкой
 */
export function actionError(code: ActionErrorCode, customMessage?: string): ActionError {
  return {
    success: false,
    error: code,
    message: customMessage ?? getErrorMessage(code),
  }
}

/**
 * Создать стандартный успешный ответ
 */
export function actionSuccess<T>(data: T): ActionSuccess<T> {
  return {
    success: true,
    data,
  }
}

/**
 * Коды ошибок Prisma для маппинга.
 */
const PRISMA_ERROR_CODES: Record<string, ActionErrorCode> = {
  P2002: 'ALREADY_EXISTS', // Unique constraint violation
  P2025: 'NOT_FOUND', // Record not found
  P2003: 'CANNOT_DELETE', // Foreign key constraint failed
  P2014: 'CANNOT_DELETE', // Relation violation
}

/**
 * Обработать ошибку в Server Action.
 * Маппит Prisma ошибки на специфичные коды, логирует и возвращает ActionError.
 *
 * @example
 * ```ts
 * try {
 *   await db.user.create({ data })
 *   return actionSuccess({ id: user.id })
 * } catch (error) {
 *   return handleActionError(error, 'createUser')
 * }
 * ```
 */
export function handleActionError(error: unknown, context?: string): ActionError {
  // Логируем ошибку для отладки
  console.error(`[Action Error]${context ? ` ${context}:` : ''}`, error)

  // Prisma ошибки
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const prismaError = error as { code: string; meta?: { target?: string[] } }
    const mappedCode = PRISMA_ERROR_CODES[prismaError.code]

    if (mappedCode) {
      // Добавляем контекст для уникальных constraint ошибок
      if (prismaError.code === 'P2002' && prismaError.meta?.target) {
        const field = prismaError.meta.target[0]
        return actionError(mappedCode, `${field} уже существует`)
      }
      return actionError(mappedCode)
    }
  }

  // Обычные Error
  if (error instanceof Error) {
    // Не раскрываем детали ошибки пользователю
    return actionError('UNKNOWN_ERROR')
  }

  return actionError('UNKNOWN_ERROR')
}
