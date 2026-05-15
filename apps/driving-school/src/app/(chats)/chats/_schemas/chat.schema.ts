import { z } from 'zod/v4'

// ============================================================================
// СОЗДАНИЕ ПРИВАТНОГО ЧАТА
// ============================================================================

export const CreatePrivateChatSchema = z
  .object({
    participantId: z
      .string()
      .min(1, 'Выберите участника')
      .meta({
        ui: {
          title: 'Участник',
          fieldType: 'select',
          description: 'С кем начать диалог',
        },
      }),
  })
  .strip()

export type CreatePrivateChatInput = z.infer<typeof CreatePrivateChatSchema>

// ============================================================================
// ОТПРАВКА СООБЩЕНИЯ
// ============================================================================

export const SendMessageSchema = z
  .object({
    chatId: z.string().min(1, 'Чат не указан'),
    content: z
      .string()
      .min(1, 'Введите сообщение')
      .max(5000, 'Сообщение слишком длинное (максимум 5000 символов)')
      .meta({
        ui: {
          title: 'Сообщение',
          placeholder: 'Введите сообщение...',
          fieldType: 'textarea',
        },
      }),
    replyToId: z.string().optional(),
  })
  .strip()

export type SendMessageInput = z.infer<typeof SendMessageSchema>

// ============================================================================
// РЕДАКТИРОВАНИЕ СООБЩЕНИЯ
// ============================================================================

export const EditMessageSchema = z
  .object({
    messageId: z.string().min(1, 'Сообщение не указано'),
    content: z
      .string()
      .min(1, 'Введите сообщение')
      .max(5000, 'Сообщение слишком длинное (максимум 5000 символов)')
      .meta({
        ui: {
          title: 'Сообщение',
          placeholder: 'Введите сообщение...',
          fieldType: 'textarea',
        },
      }),
  })
  .strip()

export type EditMessageInput = z.infer<typeof EditMessageSchema>

// ============================================================================
// УДАЛЕНИЕ СООБЩЕНИЯ
// ============================================================================

export const DeleteMessageSchema = z
  .object({
    messageId: z.string().min(1, 'Сообщение не указано'),
  })
  .strip()

export type DeleteMessageInput = z.infer<typeof DeleteMessageSchema>

// ============================================================================
// РЕАКЦИЯ НА СООБЩЕНИЕ
// ============================================================================

export const ToggleReactionSchema = z
  .object({
    messageId: z.string().min(1, 'Сообщение не указано'),
    emoji: z
      .string()
      .min(1, 'Выберите реакцию')
      .max(10, 'Некорректная реакция')
      .meta({
        ui: {
          title: 'Реакция',
          description: 'Выберите эмодзи',
        },
      }),
  })
  .strip()

export type ToggleReactionInput = z.infer<typeof ToggleReactionSchema>

// ============================================================================
// ОТМЕТКА ПРОЧТЕНИЯ
// ============================================================================

export const MarkAsReadSchema = z
  .object({
    chatId: z.string().min(1, 'Чат не указан'),
  })
  .strip()

export type MarkAsReadInput = z.infer<typeof MarkAsReadSchema>

// ============================================================================
// НАСТРОЙКИ УВЕДОМЛЕНИЙ ЧАТА
// ============================================================================

export const UpdateChatSettingsSchema = z
  .object({
    chatId: z.string().min(1, 'Чат не указан'),
    isMuted: z.boolean().meta({
      ui: {
        title: 'Отключить уведомления',
        fieldType: 'switch',
        description: 'Не получать уведомления о новых сообщениях',
      },
    }),
  })
  .strip()

export type UpdateChatSettingsInput = z.infer<typeof UpdateChatSettingsSchema>
