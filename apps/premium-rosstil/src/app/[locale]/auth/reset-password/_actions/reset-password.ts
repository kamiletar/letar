'use server'

import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { hash } from 'bcryptjs'
import { type ResetPasswordData, ResetPasswordSchema } from '../_schemas/reset-password.schema'

export type ResetPasswordResult = { success: true; redirect: string } | { success: false; error: string }

export async function resetPassword(data: ResetPasswordData): Promise<ResetPasswordResult> {
  // 1. Валидация
  const parsed = ResetPasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const { token, password } = parsed.data

  // 2. Проверяем токен (Better Auth: verification, поле value)
  const tokenRecord = await prisma.verification.findFirst({
    where: {
      value: token,
      type: 'PASSWORD_RESET',
    },
  })

  if (!tokenRecord) {
    return { success: false, error: 'Недействительный или истекший токен' }
  }

  // 3. Проверяем срок действия
  if (tokenRecord.expiresAt < new Date()) {
    // Удаляем истекший токен
    await prisma.verification.delete({
      where: { id: tokenRecord.id },
    })

    return { success: false, error: 'Срок действия ссылки истек. Запросите восстановление пароля заново.' }
  }

  // 4. Находим пользователя
  const user = await prisma.user.findUnique({
    where: { email: tokenRecord.identifier },
  })

  if (!user) {
    return { success: false, error: 'Пользователь не найден' }
  }

  // 5. Хешируем новый пароль
  const hashedPassword = await hash(password, 10)

  // 6. Обновляем пароль в credential Account
  // Better Auth хранит пароль в Account с providerId='credential'
  await prisma.account.updateMany({
    where: {
      userId: user.id,
      providerId: 'credential',
    },
    data: { password: hashedPassword },
  })

  // 7. Удаляем использованный токен
  await prisma.verification.delete({
    where: { id: tokenRecord.id },
  })

  logger.info('[Password Reset] Password reset successful for:', user.email)

  // 8. Возвращаем успех с редиректом
  return { success: true, redirect: '/auth/signin?password=reset' }
}
