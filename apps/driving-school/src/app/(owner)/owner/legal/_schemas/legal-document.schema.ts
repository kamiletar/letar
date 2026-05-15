import { z } from 'zod/v4'

/**
 * Схема для создания новой версии документа
 */
export const CreateVersionSchema = z
  .object({
    documentType: z.enum(['OFFER', 'PRIVACY_POLICY']).meta({
      ui: {
        title: 'Тип документа',
        fieldType: 'select',
        description: 'Оферта или политика конфиденциальности',
      },
    }),
    version: z
      .string()
      .min(1, 'Укажите версию')
      .regex(/^\d+\.\d+\.\d+$/, 'Версия должна быть в формате X.Y.Z (например, 1.0.0)')
      .meta({
        ui: {
          title: 'Версия',
          placeholder: '1.0.0',
          description: 'Формат: X.Y.Z',
        },
      }),
    content: z
      .string()
      .min(100, 'Содержимое документа должно быть не менее 100 символов')
      .meta({
        ui: {
          title: 'Содержимое',
          placeholder: 'Текст документа в формате Markdown...',
          fieldType: 'textarea',
          description: 'Полный текст документа',
        },
      }),
    summary: z
      .string()
      .optional()
      .meta({
        ui: {
          title: 'Краткое описание изменений',
          placeholder: 'Что изменилось в этой версии...',
          fieldType: 'textarea',
        },
      }),
  })
  .strip()

export type CreateVersionData = z.infer<typeof CreateVersionSchema>
