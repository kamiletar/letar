'use server'

import {
  type ContactMessageCreateForm,
  ContactMessageCreateFormSchema,
} from '@/generated/form-schemas/ContactMessage.form'
import { prisma } from '@/lib/db'
import { notifyNewContactMessage } from '@/lib/telegram'

/** Результат отправки сообщения */
export type SendMessageResult = { success: true } | { success: false; error: string }

export async function sendMessageAction(data: ContactMessageCreateForm): Promise<SendMessageResult> {
  const parsed = ContactMessageCreateFormSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const { name, email, message } = parsed.data

  try {
    const contact = await prisma.contactMessage.create({
      data: {
        name,
        email,
        message,
      },
    })

    // Отправляем Telegram уведомление (fire-and-forget)
    notifyNewContactMessage(contact).catch((err) => {
      console.error('[Telegram] Failed to notify about contact message:', err)
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to save contact message:', error)
    return { success: false, error: 'Не удалось отправить сообщение. Попробуйте позже.' }
  }
}
