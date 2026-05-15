'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { compare, hash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { type ChangePasswordData, ChangePasswordSchema } from '../_schemas/change-password.schema'

export type ChangePasswordResult =
  | { success: true; redirect: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export async function changePassword(data: ChangePasswordData): Promise<ChangePasswordResult> {
  // 1. Аутентификация
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  // 2. Валидация
  const parsed = ChangePasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data

  // 3. Получение DB клиента
  const db = getEnhancedPrisma(session.user)

  // 4. Получаем credential аккаунт пользователя с текущим паролем
  // Better Auth хранит пароль в Account с providerId='credential'
  const credentialAccount = await db.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: 'credential',
    },
    select: {
      id: true,
      password: true,
    },
  })

  // 5. Проверяем текущий пароль (если он был установлен)
  if (credentialAccount?.password) {
    if (!validatedData.currentPassword) {
      return {
        success: false,
        error: 'Введите текущий пароль',
        fieldErrors: { currentPassword: ['Введите текущий пароль'] },
      }
    }

    const isValidPassword = await compare(validatedData.currentPassword, credentialAccount.password)

    if (!isValidPassword) {
      return {
        success: false,
        error: 'Неверный текущий пароль',
        fieldErrors: { currentPassword: ['Неверный текущий пароль'] },
      }
    }
  }

  // 6. Хешируем новый пароль
  const hashedPassword = await hash(validatedData.newPassword, 10)

  // 7. Обновляем или создаём credential аккаунт с паролем
  try {
    if (credentialAccount) {
      // Обновляем существующий credential аккаунт
      await db.account.update({
        where: { id: credentialAccount.id },
        data: { password: hashedPassword },
      })
    } else {
      // Создаём новый credential аккаунт
      await db.account.create({
        data: {
          userId: session.user.id,
          providerId: 'credential',
          accountId: session.user.id,
          password: hashedPassword,
        },
      })
    }
  } catch {
    return { success: false, error: 'Не удалось обновить пароль. Попробуйте еще раз.' }
  }

  // 8. Инвалидируем кэш и возвращаем успех
  revalidatePath('/profile')
  return { success: true, redirect: `/profile?password=changed&updated=${Date.now()}` }
}
