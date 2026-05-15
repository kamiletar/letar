import { emailSchema, requiredCheckbox, strongPasswordSchema } from '@letar/validation-utils'
import { z } from 'zod/v4'

/**
 * Схема регистрации с UI метаданными
 * Имя и роль вводятся при onboarding
 */
export const RegisterSchema = z
  .object({
    email: emailSchema.meta({
      ui: {
        title: 'Email',
        placeholder: 'example@mail.com',
        description: 'На этот адрес будет отправлено письмо для подтверждения',
      },
    }),
    password: strongPasswordSchema.meta({
      ui: {
        title: 'Пароль',
        placeholder: 'Минимум 8 символов',
        description: 'Используйте буквы, цифры и специальные символы',
        fieldType: 'passwordStrength',
      },
    }),
    acceptOffer: requiredCheckbox('Необходимо принять условия договора-оферты').meta({
      ui: { title: 'Договор-оферта', fieldType: 'checkbox' },
    }),
    acceptPrivacy: requiredCheckbox('Необходимо принять политику конфиденциальности').meta({
      ui: { title: 'Политика конфиденциальности', fieldType: 'checkbox' },
    }),
  })
  .strip()

/**
 * Схема для server action (без confirmPassword, с .strip())
 */
export const RegisterServerSchema = z
  .object({
    email: emailSchema,
    password: strongPasswordSchema,
    acceptOffer: z.coerce.boolean(),
    acceptPrivacy: z.coerce.boolean(),
  })
  .strip()

export type RegisterFormData = z.infer<typeof RegisterSchema>
export type RegisterServerData = z.infer<typeof RegisterServerSchema>
