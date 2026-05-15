/**
 * Сервис Telegram-бота
 *
 * Бизнес-логика:
 * - Генерация и верификация токенов привязки
 * - Привязка/отвязка Telegram аккаунтов
 * - Обработка команд бота (/start, /lessons, /schedule, /help)
 * - Обработка inline-кнопок (подтвердить/отклонить занятие)
 * - Форматирование сообщений
 * - Отправка уведомлений
 */

import { isInstructor } from '@/lib/roles'
import type { LessonStatus, UserRole } from '@letar/driving-school-db/prisma'
import { randomBytes } from 'crypto'

// === Типы данных ===

export interface TelegramLinkData {
  id: string
  userId: string
  telegramId: bigint
  username: string | null
  firstName: string | null
  linkedAt: Date
}

export interface TelegramLinkTokenData {
  id: string
  userId: string
  token: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

export interface UserData {
  id: string
  name: string
  email: string
  roles: UserRole[]
}

export interface SlotData {
  id: string
  startTime: Date
  endTime: Date
}

export interface LessonData {
  id: string
  slotId: string
  studentId: string
  instructorId: string
  status: LessonStatus
  slot: SlotData
  student: UserData
  instructor: UserData
}

// === Репозитории ===

/**
 * Минимальный интерфейс для отправки Telegram-уведомлений
 *
 * Используется в notifyUserViaTelegram, требует только один метод.
 * Это позволяет передавать OrchestratorRepository без опасного type casting.
 */
export interface TelegramNotifyRepository {
  getTelegramLinkByUserId(userId: string): Promise<TelegramLinkData | null>
}

/**
 * Полный интерфейс для всех операций с Telegram
 */
export interface TelegramRepository extends TelegramNotifyRepository {
  // Токены
  createLinkToken(data: { userId: string; token: string; expiresAt: Date }): Promise<{ id: string }>
  getLinkTokenByToken(token: string): Promise<TelegramLinkTokenData | null>
  markTokenAsUsed(tokenId: string): Promise<void>
  deleteOldTokensByUserId(userId: string): Promise<void>

  // Связи Telegram
  getTelegramLinkByUserId(userId: string): Promise<TelegramLinkData | null>
  getTelegramLinkByTelegramId(telegramId: bigint): Promise<TelegramLinkData | null>
  createTelegramLink(data: {
    userId: string
    telegramId: bigint
    username?: string
    firstName?: string
  }): Promise<{ id: string }>
  updateTelegramLink(
    id: string,
    data: {
      telegramId: bigint
      username?: string
      firstName?: string
    }
  ): Promise<void>
  deleteTelegramLink(id: string): Promise<void>

  // Пользователи
  getUserById(id: string): Promise<UserData | null>

  // Занятия
  getLessonById(id: string): Promise<LessonData | null>
  updateLessonStatus(id: string, status: LessonStatus): Promise<void>
  getUpcomingLessonsByStudentId(studentId: string): Promise<LessonData[]>
  getUpcomingLessonsByInstructorId(instructorId: string): Promise<LessonData[]>
  getUpcomingSlotsByInstructorId(instructorId: string): Promise<SlotData[]>
}

// === Типы результатов ===

export type GenerateLinkTokenError = never

export type GenerateLinkTokenResult =
  | { success: true; token: string }
  | { success: false; error: GenerateLinkTokenError }

export type VerifyLinkTokenError = 'TOKEN_NOT_FOUND' | 'TOKEN_EXPIRED' | 'TOKEN_ALREADY_USED'

export type VerifyLinkTokenResult = { success: true; userId: string } | { success: false; error: VerifyLinkTokenError }

export type LinkTelegramAccountError = VerifyLinkTokenError

export type LinkTelegramAccountResult =
  | { success: true; linkId: string }
  | { success: false; error: LinkTelegramAccountError }

export type UnlinkTelegramAccountError = 'LINK_NOT_FOUND'

export type UnlinkTelegramAccountResult = { success: true } | { success: false; error: UnlinkTelegramAccountError }

export type HandleStartCommandError = 'INVALID_TOKEN' | VerifyLinkTokenError

export type HandleStartCommandResult =
  | { success: true; message: string }
  | { success: false; message: string; error: HandleStartCommandError }

export type HandleLessonsCommandError = 'NOT_LINKED'

export type HandleLessonsCommandResult =
  | { success: true; lessons: LessonData[]; message: string }
  | { success: false; error: HandleLessonsCommandError }

export type HandleScheduleCommandError = 'NOT_LINKED' | 'NOT_INSTRUCTOR'

export type HandleScheduleCommandResult =
  | { success: true; slots: SlotData[]; message: string }
  | { success: false; error: HandleScheduleCommandError }

export type HandleConfirmLessonError = 'NOT_LINKED' | 'LESSON_NOT_FOUND' | 'NOT_INSTRUCTOR' | 'ALREADY_CONFIRMED'

export type HandleConfirmLessonResult = { success: true } | { success: false; error: HandleConfirmLessonError }

export type HandleRejectLessonError = 'NOT_LINKED' | 'LESSON_NOT_FOUND' | 'NOT_INSTRUCTOR'

export type HandleRejectLessonResult = { success: true } | { success: false; error: HandleRejectLessonError }

export type SendTelegramNotificationError = 'BOT_BLOCKED' | 'SEND_FAILED'

export type SendTelegramNotificationResult =
  | { success: true }
  | { success: false; error: SendTelegramNotificationError }

export type NotifyUserViaTelegramError = 'NO_TELEGRAM_LINK' | SendTelegramNotificationError

export type NotifyUserViaTelegramResult = { success: true } | { success: false; error: NotifyUserViaTelegramError }

// === Inline-кнопки ===

export interface InlineButton {
  text: string
  callback_data: string
}

export type InlineKeyboard = InlineButton[][]

// === Функции: Токены ===

export async function generateLinkToken(params: {
  userId: string
  repo: TelegramRepository
}): Promise<GenerateLinkTokenResult> {
  const { userId, repo } = params

  // Удаляем старые токены пользователя
  await repo.deleteOldTokensByUserId(userId)

  // Генерируем новый токен
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 3600000) // +1 час

  await repo.createLinkToken({ userId, token, expiresAt })

  return { success: true, token }
}

export async function verifyLinkToken(params: {
  token: string
  repo: TelegramRepository
}): Promise<VerifyLinkTokenResult> {
  const { token, repo } = params

  const linkToken = await repo.getLinkTokenByToken(token)
  if (!linkToken) {
    return { success: false, error: 'TOKEN_NOT_FOUND' }
  }

  if (linkToken.usedAt) {
    return { success: false, error: 'TOKEN_ALREADY_USED' }
  }

  if (new Date() > linkToken.expiresAt) {
    return { success: false, error: 'TOKEN_EXPIRED' }
  }

  return { success: true, userId: linkToken.userId }
}

// === Функции: Привязка ===

export async function linkTelegramAccount(params: {
  token: string
  telegramId: bigint
  username?: string
  firstName?: string
  repo: TelegramRepository
}): Promise<LinkTelegramAccountResult> {
  const { token, telegramId, username, firstName, repo } = params

  // Верифицируем токен
  const verifyResult = await verifyLinkToken({ token, repo })
  if (!verifyResult.success) {
    return { success: false, error: verifyResult.error }
  }

  const { userId } = verifyResult

  // Проверяем существующую связь
  const existingLink = await repo.getTelegramLinkByUserId(userId)

  if (existingLink) {
    // Обновляем существующую связь
    await repo.updateTelegramLink(existingLink.id, { telegramId, username, firstName })

    // Помечаем токен как использованный
    const linkToken = await repo.getLinkTokenByToken(token)
    if (linkToken) {
      await repo.markTokenAsUsed(linkToken.id)
    }

    return { success: true, linkId: existingLink.id }
  }

  // Создаём новую связь
  const result = await repo.createTelegramLink({ userId, telegramId, username, firstName })

  // Помечаем токен как использованный
  const linkToken = await repo.getLinkTokenByToken(token)
  if (linkToken) {
    await repo.markTokenAsUsed(linkToken.id)
  }

  return { success: true, linkId: result.id }
}

export async function unlinkTelegramAccount(params: {
  userId: string
  repo: TelegramRepository
}): Promise<UnlinkTelegramAccountResult> {
  const { userId, repo } = params

  const link = await repo.getTelegramLinkByUserId(userId)
  if (!link) {
    return { success: false, error: 'LINK_NOT_FOUND' }
  }

  await repo.deleteTelegramLink(link.id)

  return { success: true }
}

export async function getTelegramLinkByUserId(params: {
  userId: string
  repo: TelegramRepository
}): Promise<TelegramLinkData | null> {
  return params.repo.getTelegramLinkByUserId(params.userId)
}

export async function getTelegramLinkByTelegramId(params: {
  telegramId: bigint
  repo: TelegramRepository
}): Promise<TelegramLinkData | null> {
  return params.repo.getTelegramLinkByTelegramId(params.telegramId)
}

// === Функции: Команды бота ===

export async function handleStartCommand(params: {
  token: string
  telegramId: bigint
  username?: string
  firstName?: string
  repo: TelegramRepository
}): Promise<HandleStartCommandResult> {
  const { token, telegramId, username, firstName, repo } = params

  // Привязываем аккаунт
  const linkResult = await linkTelegramAccount({ token, telegramId, username, firstName, repo })

  if (!linkResult.success) {
    const errorMessages: Record<VerifyLinkTokenError, string> = {
      TOKEN_NOT_FOUND: 'Ссылка недействительна. Запросите новую ссылку в приложении.',
      TOKEN_EXPIRED: 'Ссылка истекла. Запросите новую ссылку в приложении.',
      TOKEN_ALREADY_USED: 'Эта ссылка уже была использована. Запросите новую.',
    }

    return {
      success: false,
      message: errorMessages[linkResult.error],
      error: linkResult.error,
    }
  }

  // Получаем пользователя для приветствия
  const verifyResult = await verifyLinkToken({ token, repo })
  if (verifyResult.success) {
    const user = await repo.getUserById(verifyResult.userId)
    if (user) {
      return {
        success: true,
        message: formatWelcomeMessage(user),
      }
    }
  }

  return {
    success: true,
    message: 'Аккаунт успешно привязан!',
  }
}

export async function handleLessonsCommand(params: {
  telegramId: bigint
  repo: TelegramRepository
}): Promise<HandleLessonsCommandResult> {
  const { telegramId, repo } = params

  // Получаем связь
  const link = await repo.getTelegramLinkByTelegramId(telegramId)
  if (!link) {
    return { success: false, error: 'NOT_LINKED' }
  }

  // Получаем пользователя
  const user = await repo.getUserById(link.userId)
  if (!user) {
    return { success: false, error: 'NOT_LINKED' }
  }

  // Получаем занятия в зависимости от роли
  let lessons: LessonData[]
  if (isInstructor(user.roles)) {
    lessons = await repo.getUpcomingLessonsByInstructorId(link.userId)
  } else {
    lessons = await repo.getUpcomingLessonsByStudentId(link.userId)
  }

  if (lessons.length === 0) {
    return {
      success: true,
      lessons: [],
      message: 'У вас нет предстоящих занятий.',
    }
  }

  return {
    success: true,
    lessons,
    message: formatLessonListMessage(lessons),
  }
}

export async function handleScheduleCommand(params: {
  telegramId: bigint
  repo: TelegramRepository
}): Promise<HandleScheduleCommandResult> {
  const { telegramId, repo } = params

  // Получаем связь
  const link = await repo.getTelegramLinkByTelegramId(telegramId)
  if (!link) {
    return { success: false, error: 'NOT_LINKED' }
  }

  // Получаем пользователя
  const user = await repo.getUserById(link.userId)
  if (!user) {
    return { success: false, error: 'NOT_LINKED' }
  }

  // Проверяем роль
  if (!isInstructor(user.roles)) {
    return { success: false, error: 'NOT_INSTRUCTOR' }
  }

  // Получаем слоты
  const slots = await repo.getUpcomingSlotsByInstructorId(link.userId)

  if (slots.length === 0) {
    return {
      success: true,
      slots: [],
      message: 'У вас нет доступных слотов.',
    }
  }

  return {
    success: true,
    slots,
    message: formatScheduleMessage(slots),
  }
}

export function handleHelpCommand(): { message: string } {
  return { message: formatHelpMessage() }
}

// === Функции: Inline-кнопки ===

export async function handleConfirmLesson(params: {
  lessonId: string
  telegramId: bigint
  repo: TelegramRepository
}): Promise<HandleConfirmLessonResult> {
  const { lessonId, telegramId, repo } = params

  // Получаем связь
  const link = await repo.getTelegramLinkByTelegramId(telegramId)
  if (!link) {
    return { success: false, error: 'NOT_LINKED' }
  }

  // Получаем занятие
  const lesson = await repo.getLessonById(lessonId)
  if (!lesson) {
    return { success: false, error: 'LESSON_NOT_FOUND' }
  }

  // Проверяем что это инструктор занятия
  if (lesson.instructorId !== link.userId) {
    return { success: false, error: 'NOT_INSTRUCTOR' }
  }

  // Проверяем статус
  if (lesson.status !== 'PENDING') {
    return { success: false, error: 'ALREADY_CONFIRMED' }
  }

  // Подтверждаем
  await repo.updateLessonStatus(lessonId, 'CONFIRMED')

  return { success: true }
}

export async function handleRejectLesson(params: {
  lessonId: string
  telegramId: bigint
  repo: TelegramRepository
}): Promise<HandleRejectLessonResult> {
  const { lessonId, telegramId, repo } = params

  // Получаем связь
  const link = await repo.getTelegramLinkByTelegramId(telegramId)
  if (!link) {
    return { success: false, error: 'NOT_LINKED' }
  }

  // Получаем занятие
  const lesson = await repo.getLessonById(lessonId)
  if (!lesson) {
    return { success: false, error: 'LESSON_NOT_FOUND' }
  }

  // Проверяем что это инструктор занятия
  if (lesson.instructorId !== link.userId) {
    return { success: false, error: 'NOT_INSTRUCTOR' }
  }

  // Отменяем
  await repo.updateLessonStatus(lessonId, 'CANCELLED')

  return { success: true }
}

// === Функции: Форматирование ===

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatLessonMessage(lesson: LessonData): string {
  const date = formatDate(lesson.slot.startTime)
  const time = formatTime(lesson.slot.startTime)

  return `📚 Занятие ${date} в ${time}
👤 Ученик: ${lesson.student.name}
🚗 Инструктор: ${lesson.instructor.name}`
}

export function formatLessonListMessage(lessons: LessonData[]): string {
  if (lessons.length === 0) {
    return 'У вас нет предстоящих занятий.'
  }

  const lessonLines = lessons.map((lesson) => {
    const date = formatDate(lesson.slot.startTime)
    const time = formatTime(lesson.slot.startTime)
    return `• ${date} ${time} — ${lesson.instructor.name}`
  })

  return `📋 Ближайшие занятия:\n\n${lessonLines.join('\n')}`
}

export function formatScheduleMessage(slots: SlotData[]): string {
  if (slots.length === 0) {
    return 'У вас нет доступных слотов.'
  }

  const slotLines = slots.map((slot) => {
    const date = formatDate(slot.startTime)
    const time = formatTime(slot.startTime)
    return `• ${date} ${time}`
  })

  return `📅 Ваше расписание:\n\n${slotLines.join('\n')}`
}

export function formatWelcomeMessage(user: UserData): string {
  return `👋 Добро пожаловать, ${user.name}!

Ваш аккаунт успешно привязан к Telegram.

Теперь вы будете получать уведомления о занятиях.

Доступные команды:
/lessons — мои занятия
/help — справка`
}

export function formatHelpMessage(): string {
  return `🤖 Бот НаПрава.РФ

Доступные команды:
/start [токен] — привязать аккаунт
/lessons — список ближайших занятий
/schedule — расписание (для инструкторов)
/help — эта справка

По вопросам обращайтесь в поддержку.`
}

// === Функции: Отправка уведомлений ===

type SendMessageFn = (
  chatId: bigint,
  text: string,
  options?: { reply_markup?: { inline_keyboard: InlineKeyboard }; parse_mode?: string }
) => Promise<{ message_id: number }>

export async function sendTelegramNotification(params: {
  telegramId: bigint
  text: string
  inlineKeyboard?: InlineKeyboard
  sendMessage: SendMessageFn
}): Promise<SendTelegramNotificationResult> {
  const { telegramId, text, inlineKeyboard, sendMessage } = params

  try {
    const options: { reply_markup?: { inline_keyboard: InlineKeyboard }; parse_mode?: string } = {
      parse_mode: 'HTML',
    }

    if (inlineKeyboard) {
      options.reply_markup = { inline_keyboard: inlineKeyboard }
    }

    await sendMessage(telegramId, text, options)

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('blocked')) {
      return { success: false, error: 'BOT_BLOCKED' }
    }
    return { success: false, error: 'SEND_FAILED' }
  }
}

/**
 * Отправляет уведомление пользователю через Telegram
 *
 * Использует минимальный интерфейс TelegramNotifyRepository,
 * что позволяет передавать OrchestratorRepository напрямую.
 */
export async function notifyUserViaTelegram(params: {
  userId: string
  text: string
  inlineKeyboard?: InlineKeyboard
  repo: TelegramNotifyRepository
  sendMessage: SendMessageFn
}): Promise<NotifyUserViaTelegramResult> {
  const { userId, text, inlineKeyboard, repo, sendMessage } = params

  // Получаем связь
  const link = await repo.getTelegramLinkByUserId(userId)
  if (!link) {
    return { success: false, error: 'NO_TELEGRAM_LINK' }
  }

  // Отправляем
  return sendTelegramNotification({
    telegramId: link.telegramId,
    text,
    inlineKeyboard,
    sendMessage,
  })
}
