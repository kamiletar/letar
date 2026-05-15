import { phoneSchema } from '@letar/validation-utils'
import { z } from 'zod/v4'

/**
 * @deprecated Используй phoneSchema из @letar/validation-utils
 */
export const PhoneSchema = phoneSchema

/**
 * Схема общего профиля пользователя с UI метаданными (данные из User)
 */
export const UserProfileSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Имя должно содержать минимум 2 символа')
      .meta({
        ui: {
          title: 'Имя',
          placeholder: 'Иван Иванов',
          description: 'Ваше полное имя',
        },
      }),
    phone: PhoneSchema.optional().meta({
      ui: {
        title: 'Телефон',
        placeholder: '+7 (999) 123-45-67',
        fieldType: 'phone',
      },
    }),
  })
  .strip()

/**
 * Схема профиля ученика с UI метаданными (данные из StudentProfile)
 */
export const StudentProfileSchema = z
  .object({
    preferredAreas: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((val) => {
        // Преобразуем single value в массив для FormData
        if (typeof val === 'string') {
          return val ? [val] : []
        }
        return val || []
      })
      .meta({
        ui: {
          title: 'Предпочитаемые районы',
          fieldType: 'listbox',
          description: 'Выберите районы, удобные для занятий',
        },
      }),
    noteForInstructor: z
      .string()
      .max(500, 'Заметка не должна превышать 500 символов')
      .optional()
      .meta({
        ui: {
          title: 'Заметка для инструктора',
          placeholder: 'Например: удобно заниматься по вечерам...',
          fieldType: 'textarea',
          description: 'Дополнительная информация для инструктора',
        },
      }),
  })
  .strip()

/**
 * Полная схема для обновления профиля ученика
 */
export const UpdateStudentProfileSchema = UserProfileSchema.merge(StudentProfileSchema)

export type UserProfileData = z.infer<typeof UserProfileSchema>
export type StudentProfileData = z.infer<typeof StudentProfileSchema>
export type UpdateStudentProfileData = z.infer<typeof UpdateStudentProfileSchema>
