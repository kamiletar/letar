'use server'

import { prisma } from '@/lib/db'
import type { PinValidatorAdapter, TokenManagerAdapter } from '@letar/pin-auth/server'

/**
 * Адаптер для валидации PIN-кодов.
 * Реализует интерфейс PinValidatorAdapter из @letar/pin-auth.
 * Адаптирован под Better Auth схему (Verification вместо VerificationToken).
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

    return {
      token: token.value, // value в Better Auth схеме
      identifier: token.identifier,
      pin: token.pin,
      pinExpires: token.pinExpires,
      pinAttempts: token.pinAttempts,
      expires: token.expiresAt, // expiresAt в Better Auth схеме
    }
  },

  async incrementAttempts(token) {
    await prisma.verification.update({
      where: { value: token }, // value уникален
      data: { pinAttempts: { increment: 1 } },
    })
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
