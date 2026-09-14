import { prisma } from '@/lib/db'
import type { PinValidatorAdapter, TokenManagerAdapter } from '@letar/pin-auth/server'

/**
 * Адаптер для валидации PIN-кодов.
 * Реализует интерфейс PinValidatorAdapter из @letar/pin-auth.
 * Адаптирован под Better Auth схему (Verification вместо VerificationToken).
 *
 * ⚠️ Это НЕ модуль server actions (объекты-адаптеры, не async-функции верхнего уровня) —
 * `'use server'` здесь неуместен и раньше стоял ошибочно.
 */
export const pinValidatorAdapter: PinValidatorAdapter = {
  async findToken(identifier) {
    const token = await prisma.verification.findFirst({
      where: { identifier },
      orderBy: { expiresAt: 'desc' },
    })

    if (!token) {
      return null
    }

    // Попытка резервируется атомарно ДО сравнения PIN, а не после (было). При прежнем порядке
    // «прочитать pinAttempts → сравнить PIN → увеличить» параллельная пачка запросов читала
    // один и тот же счётчик и каждый успевал сравнить свой PIN до того, как счётчик вырастал —
    // classic check-then-act, обходящий maxAttempts. `UPDATE ... SET pinAttempts = pinAttempts + 1`
    // атомарен на уровне строки Postgres (row lock), поэтому параллельные вызовы всегда получают
    // уникальные последовательные значения — независимо от того, что каждый прочитал в findFirst
    // выше (используем именно результат update, а не token.pinAttempts).
    let pinAttempts: number
    try {
      const reserved = await prisma.verification.update({
        where: { id: token.id },
        data: { pinAttempts: { increment: 1 } },
        select: { pinAttempts: true },
      })
      pinAttempts = reserved.pinAttempts - 1
    } catch {
      // Запись успел удалить параллельный resend/успешный вход — токен больше не действителен
      return null
    }

    return {
      token: token.value, // value в Better Auth схеме
      identifier: token.identifier,
      pin: token.pin,
      pinExpires: token.pinExpires,
      pinAttempts,
      expires: token.expiresAt, // expiresAt в Better Auth схеме
    }
  },

  async incrementAttempts(_token) {
    // Счётчик уже увеличен атомарно в findToken (до сравнения PIN) — повторно не считаем.
  },

  async findUser(email) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
  },

  async verifyUserEmail(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true }, // Boolean в Better Auth
    })
  },

  async updateTokenForAutoLogin(oldToken, newToken, expires) {
    await prisma.verification.update({
      where: { value: oldToken },
      data: {
        value: newToken,
        expiresAt: expires,
        pin: null,
        pinExpires: null,
        pinAttempts: 0,
      },
    })
  },
}

/**
 * Адаптер для управления токенами верификации.
 * Реализует интерфейс TokenManagerAdapter из @letar/pin-auth.
 * Адаптирован под Better Auth схему (Verification вместо VerificationToken).
 */
export const tokenManagerAdapter: TokenManagerAdapter = {
  async findUser(email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        emailVerified: true,
        name: true,
      },
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      emailVerified: user.emailVerified, // boolean из Better Auth схемы
      name: user.name,
    }
  },

  async findLatestToken(identifier) {
    return prisma.verification.findFirst({
      where: { identifier },
      orderBy: { expiresAt: 'desc' },
      select: { pinExpires: true },
    })
  },

  async deleteTokens(identifier) {
    await prisma.verification.deleteMany({
      where: { identifier },
    })
  },

  async createToken(data) {
    await prisma.verification.create({
      data: {
        identifier: data.identifier,
        value: data.token, // token → value
        pin: data.pin,
        pinExpires: data.pinExpires,
        expiresAt: data.expires, // expires → expiresAt
      },
    })
  },
}
