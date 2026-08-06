import { z } from 'zod/v4'

/**
 * Схема валидации email
 * Используется во всех приложениях для полей email
 */
export const emailSchema = z.preprocess(
  (val) => (val === undefined || val === null ? '' : val),
  z.string().min(1, 'Введите адрес электронной почты').email('Введите корректный email'),
)

/**
 * Схема валидации имени пользователя
 * Минимум 2 символа
 */
export const nameSchema = z.string().min(2, 'Имя должно содержать минимум 2 символа')

/**
 * Схема валидации токена (для сброса пароля, верификации и т.д.)
 */
export const tokenSchema = z.string().min(1, 'Токен обязателен')

/**
 * Схема для обязательного чекбокса (например, принятие оферты)
 * @param errorMessage - сообщение об ошибке при невыбранном чекбоксе
 */
export function requiredCheckbox(errorMessage: string) {
  return z
    .union([z.boolean(), z.string()])
    .optional()
    .default(false)
    .transform((val) => val === true || val === 'on')
    .refine((val) => val === true, {
      message: errorMessage,
    })
}
