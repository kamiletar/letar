import { z } from 'zod/v4'

/**
 * Схема для создания ученика менеджером
 */
export const CreateStudentSchema = z
  .object({
    email: z.email('Введите корректный email').meta({ ui: { title: 'Email', placeholder: 'student@example.com' } }),
    name: z
      .string()
      .min(2, 'Введите ФИО (минимум 2 символа)')
      .meta({ ui: { title: 'ФИО', placeholder: 'Иванов Иван Иванович' } }),
    phone: z
      .string()
      .optional()
      .meta({ ui: { title: 'Телефон', placeholder: '+7 (999) 123-45-67' } }),
    birthdate: z
      .string()
      .optional()
      .meta({ ui: { title: 'Дата рождения' } }),
    organizationId: z.string().min(1, 'Выберите школу'),
  })
  .strip()

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>
