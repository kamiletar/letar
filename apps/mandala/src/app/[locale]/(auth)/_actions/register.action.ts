'use server'

import { prisma } from '@/lib/db'
import { sendVerificationEmail } from '@letar/email'
import { generatePin, generateToken } from '@letar/pin-auth/server'
import { scryptAsync } from '@noble/hashes/scrypt.js'
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js'
import { type RegisterFormData, RegisterSchema } from '../_schemas/register.schema'

/** Время жизни токенов в миллисекундах */
const TOKEN_EXPIRY = {
  PIN: 10 * 60 * 1000, // 10 минут
  VERIFICATION: 24 * 60 * 60 * 1000, // 24 часа
} as const

export type RegisterResult = { success: true; email: string } | {
  success: false
  error: 'EMAIL_EXISTS' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR'
}

/**
 * Хеширование пароля в формате Better Auth (scrypt)
 * Формат: salt:hash (hex-encoded)
 */
async function hashPasswordBetterAuth(password: string): Promise<string> {
  const salt = bytesToHex(randomBytes(16))
  const key = await scryptAsync(password.normalize('NFKC'), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
  })
  return `${salt}:${bytesToHex(key)}`
}

/**
 * Server action для регистрации пользователя
 * Адаптировано под Better Auth схему
 */
export async function registerUser(data: RegisterFormData): Promise<RegisterResult> {
  try {
    // Валидация
    const parsed = RegisterSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: 'VALIDATION_ERROR' }
    }

    const { email, password, name } = parsed.data

    // Проверка существования пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { success: false, error: 'EMAIL_EXISTS' }
    }

    // Хешируем пароль в формате Better Auth (scrypt)
    const hashedPassword = await hashPasswordBetterAuth(password)

    // Генерируем токен и PIN
    const token = generateToken()
    const pin = generatePin({ length: 6 })
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.VERIFICATION)
    const pinExpires = new Date(Date.now() + TOKEN_EXPIRY.PIN)

    // Создаём пользователя, аккаунт и токен верификации в транзакции
    // Better Auth: пароль хранится в Account, не в User
    await prisma.$transaction([
      prisma.user.create({
        data: {
          email,
          name: name || null,
          emailVerified: false,
          accounts: {
            create: {
              providerId: 'credential',
              accountId: email,
              password: hashedPassword,
            },
          },
        },
      }),
      prisma.verification.create({
        data: {
          identifier: email,
          value: token, // token → value
          pin,
          pinExpires,
          expiresAt, // expires → expiresAt
        },
      }),
    ])

    // Отправляем email с PIN-кодом через @letar/email.
    // ⚠️ sendVerificationEmail НЕ бросает при SMTP-сбое — возвращает { success: false }.
    // Поэтому проверяем результат явно, иначе провал отправки молча теряется (§ Этап 0).
    const emailResult = await sendVerificationEmail(
      {
        to: email,
        userName: name ?? undefined,
        pin,
      },
      {
        // Кастомный брендинг для Elfafeya Art
        appName: 'Elfafeya Art',
        headerColor: '#8B7355',
        buttonColor: '#A67C52',
      },
    )

    if (!emailResult.success) {
      // Централизованный структурный лог уже сработал в провайдере @letar/email.
      // Регистрацию не блокируем (пользователь сможет запросить resend), но в dev
      // выводим PIN в консоль для отладки.
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`[DEV] Verification PIN for ${email}: ${pin}`)
      }
    }

    return { success: true, email }
  } catch (error) {
    console.error('Register error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
