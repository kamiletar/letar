import { prisma } from '@/lib/db'
import type { PinValidatorAdapter, TokenManagerAdapter } from '@letar/pin-auth/server'

/**
 * Адаптер для валидации PIN-кодов.
 * Реализует интерфейс PinValidatorAdapter из @letar/pin-auth.
 *
 * Новая модель Verification не имеет полей pin, pinExpires, pinAttempts.
 * PIN хранится как отдельная запись Verification с identifier = `pin:${email}`
 */
export const pinValidatorAdapter: PinValidatorAdapter = {
  async findToken(identifier) {
    // Сначала находим основной токен верификации
    const token = await prisma.verification.findFirst({
      where: { identifier, type: 'EMAIL_VERIFICATION' },
      orderBy: { expiresAt: 'desc' },
    })

    if (!token) {
      return null
    }

    // Затем находим PIN-код
    const pinRecord = await prisma.verification.findFirst({
      where: { identifier: `pin:${identifier}`, type: 'EMAIL_VERIFICATION_PIN' },
      orderBy: { expiresAt: 'desc' },
    })

    return {
      token: token.value,
      identifier: token.identifier,
      pin: pinRecord?.value ?? null,
      pinExpires: pinRecord?.expiresAt ?? null,
      pinAttempts: 0, // Не отслеживаем попытки в новой модели
      expires: token.expiresAt,
    }
  },

  async incrementAttempts(_token) {
    // В новой модели не отслеживаем количество попыток
    // Можно добавить отдельную логику если нужно
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
      data: { emailVerified: true },
    })
  },

  async updateTokenForAutoLogin(oldToken, newToken, expires) {
    // Удаляем старый токен и PIN
    const oldVerification = await prisma.verification.findUnique({
      where: { value: oldToken },
    })

    if (oldVerification) {
      // Удаляем PIN если есть
      await prisma.verification.deleteMany({
        where: { identifier: `pin:${oldVerification.identifier}`, type: 'EMAIL_VERIFICATION_PIN' },
      })

      // Удаляем старый токен
      await prisma.verification.delete({
        where: { value: oldToken },
      })
    }

    // Создаём новый токен для авто-логина
    const identifier = oldVerification?.identifier ?? ''
    await prisma.verification.create({
      data: {
        identifier,
        value: newToken,
        expiresAt: expires,
        type: 'AUTO_LOGIN',
      },
    })
  },
}

/**
 * Адаптер для управления токенами верификации.
 * Реализует интерфейс TokenManagerAdapter из @letar/pin-auth.
 */
export const tokenManagerAdapter: TokenManagerAdapter = {
  async findUser(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        emailVerified: true,
        name: true,
      },
    })
  },

  async findLatestToken(identifier) {
    // Ищем PIN-запись для проверки rate limiting
    const pinRecord = await prisma.verification.findFirst({
      where: { identifier: `pin:${identifier}`, type: 'EMAIL_VERIFICATION_PIN' },
      orderBy: { expiresAt: 'desc' },
    })

    return pinRecord ? { pinExpires: pinRecord.expiresAt } : null
  },

  async deleteTokens(identifier) {
    // Удаляем и токен и PIN
    await prisma.verification.deleteMany({
      where: {
        OR: [
          { identifier, type: 'EMAIL_VERIFICATION' },
          { identifier: `pin:${identifier}`, type: 'EMAIL_VERIFICATION_PIN' },
        ],
      },
    })
  },

  async createToken(data) {
    // Создаём основной токен
    await prisma.verification.create({
      data: {
        identifier: data.identifier,
        value: data.token,
        expiresAt: data.expires,
        type: 'EMAIL_VERIFICATION',
      },
    })

    // Создаём PIN как отдельную запись
    if (data.pin && data.pinExpires) {
      await prisma.verification.create({
        data: {
          identifier: `pin:${data.identifier}`,
          value: data.pin,
          expiresAt: data.pinExpires,
          type: 'EMAIL_VERIFICATION_PIN',
        },
      })
    }
  },
}
