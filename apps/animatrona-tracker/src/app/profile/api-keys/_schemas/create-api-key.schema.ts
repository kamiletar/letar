import { z } from 'zod/v4'

/** Схема формы создания API ключа */
export const CreateApiKeySchema = z
  .object({
    /** Название ключа */
    name: z
      .string()
      .min(1, 'Введите название ключа')
      .meta({ ui: { placeholder: 'Название ключа (например: Мой ПК)' } }),
  })
  .strip()
