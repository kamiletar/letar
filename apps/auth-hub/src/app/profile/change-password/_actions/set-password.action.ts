'use server'

import { auth, requireAuth } from '@/lib/auth'
import { headers } from 'next/headers'
import { z } from 'zod/v4'

const SetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Минимум 8 символов'),
  })
  .strip()

export type SetPasswordResult = {
  success: boolean
  error?: string
}

/**
 * Установка пароля для OAuth-пользователя без credential аккаунта.
 * Использует auth.api.setPassword (server-only).
 */
export async function setPasswordAction(formData: FormData): Promise<SetPasswordResult> {
  await requireAuth()

  const parsed = SetPasswordSchema.safeParse({
    newPassword: formData.get('newPassword'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    await auth.api.setPassword({
      body: { newPassword: parsed.data.newPassword },
      headers: await headers(),
    })

    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Не удалось установить пароль'
    return { success: false, error: message }
  }
}
