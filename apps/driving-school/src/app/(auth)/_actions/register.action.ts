'use server'

import { prisma } from '@/lib/db'
import { legalService } from '@/lib/legal'
import { sendVerificationEmail } from '@letar/email'
import { generatePin, generateToken } from '@letar/pin-auth/server'
import { hash } from 'bcryptjs'
import { headers } from 'next/headers'
import type { RegisterServerData } from '../_schemas/register.schema'

// ============================================================================
// ТИПЫ
// ============================================================================

export type RegisterResult =
  | { success: true; userId: string; email: string }
  | { success: false; error: 'EMAIL_EXISTS' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR' }

/** Внутренний результат регистрации */
type RegisterCoreResult = { success: true; userId: string; email: string } | { success: false; error: 'EMAIL_EXISTS' }

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Хеширование пароля с bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

// ============================================================================
// CORE БИЗНЕС-ЛОГИКА (общая для всех точек входа)
// ============================================================================

/**
 * Ядро регистрации пользователя
 *
 * Содержит общую бизнес-логику:
 * - Проверка существования email
 * - Хеширование пароля
 * - Создание пользователя
 * - Создание токена верификации
 * - Сохранение принятия документов
 * - Отправка email верификации
 *
 * Используется публичной функцией registerUser
 */
async function registerUserCore(data: RegisterServerData): Promise<RegisterCoreResult> {
  // Проверяем существует ли пользователь с таким email (ZenStack v3.2.0 exists API)
  const emailExists = await prisma.user.exists({
    where: { email: data.email },
  })

  if (emailExists) {
    return { success: false, error: 'EMAIL_EXISTS' }
  }

  // Хешируем пароль
  const hashedPassword = await hashPassword(data.password)

  // Создаём пользователя с минимальными данными
  // Роль USER по умолчанию, имя заполнится при onboarding
  const user = await prisma.user.create({
    data: {
      email: data.email,
      hashedPassword,
      roles: ['USER'],
      isOnboardingComplete: false,
    },
  })

  // Создаём Account для Better Auth credential auth
  // Это позволяет входить через signInEmail (Better Auth)
  // Better Auth использует providerId и accountId (не provider/providerAccountId!)
  // accountId = email для credential auth
  await prisma.account.create({
    data: {
      userId: user.id,
      providerId: 'credential',
      accountId: data.email,
      password: hashedPassword,
    },
  })

  // Создаём токен и пинкод верификации email
  const token = generateToken()
  const pin = generatePin({ length: 6 })
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа для ссылки
  const pinExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 минут для пинкода

  // Создаём токен для ссылки верификации
  await prisma.verification.create({
    data: {
      identifier: data.email,
      value: token,
      expiresAt: tokenExpires,
      type: 'EMAIL_VERIFICATION',
    },
  })

  // Создаём PIN-код как отдельную запись
  await prisma.verification.create({
    data: {
      identifier: `pin:${data.email}`,
      value: pin,
      expiresAt: pinExpires,
      type: 'EMAIL_VERIFICATION_PIN',
    },
  })

  // Сохраняем принятие оферты и политики конфиденциальности
  if (data.acceptOffer || data.acceptPrivacy) {
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || undefined
    const userAgent = headersList.get('user-agent') || undefined

    // Получаем текущие версии документов
    const [offerVersionId, privacyVersionId] = await Promise.all([
      data.acceptOffer ? legalService.getCurrentOfferVersionId() : null,
      data.acceptPrivacy
        ? prisma.legalDocument
            .findUnique({ where: { type: 'PRIVACY_POLICY' }, select: { currentVersionId: true } })
            .then((doc: { currentVersionId: string | null } | null) => doc?.currentVersionId ?? null)
        : null,
    ])

    // Сохраняем принятие оферты
    if (offerVersionId) {
      await legalService.acceptVersion(user.id, offerVersionId, { ipAddress, userAgent })
    }

    // Сохраняем принятие политики конфиденциальности
    if (privacyVersionId) {
      await legalService.acceptVersion(user.id, privacyVersionId, { ipAddress, userAgent })
    }
  }

  // Отправляем email с токеном и пинкодом верификации (асинхронно, не блокируем ответ)
  const baseUrl = process.env.BETTER_AUTH_URL || 'https://xn--80aaah6cnh.xn--p1ai'
  const verificationUrl = `${baseUrl}/verify-email/${token}`

  sendVerificationEmail(
    {
      to: data.email,
      userName: 'Пользователь', // Имя ещё не известно
      verificationUrl,
      pin,
    },
    {
      appName: 'НаПрава.РФ',
      headerColor: '#1a365d',
      buttonColor: '#CA9E67',
    }
  ).catch((error: unknown) => {
    console.error('Failed to send verification email:', error)
  })

  return { success: true, userId: user.id, email: data.email }
}

// ============================================================================
// ПУБЛИЧНЫЕ SERVER ACTIONS
// ============================================================================

/**
 * Server action для регистрации нового пользователя (типизированный результат)
 *
 * Используется для программного вызова без форм.
 * Возвращает строго типизированный результат.
 */
export async function registerUser(data: RegisterServerData): Promise<RegisterResult> {
  try {
    return await registerUserCore(data)
  } catch (error) {
    console.error('Registration error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
