import { UserProfileSchema } from '@/app/(student)/my-profile/_schemas/student-profile.schema'
import { LicenseCategoryFormSchema as GeneratedLicenseCategorySchema } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
import { z } from 'zod/v4'

/**
 * Схема одной рабочей зоны (город + районы)
 */
export const WorkingAreaSchema = z.object({
  cityId: z.string().min(1, 'ID города обязателен'),
  cityName: z.string().min(1, 'Название города обязательно'),
  districts: z.array(z.string()).min(1, 'Выберите хотя бы один район или "все районы"'),
})

/**
 * Схема для рабочих зон инструктора
 */
export const WorkingAreasSchema = z.array(WorkingAreaSchema).optional()

/**
 * Схема валидации категорий прав
 * Использует сгенерированный enum из ZenStack
 */
export const LicenseCategorySchema = z
  .union([GeneratedLicenseCategorySchema, z.array(GeneratedLicenseCategorySchema)])
  .optional()
  .transform((val) => {
    // Преобразуем single value в массив для FormData
    if (typeof val === 'string') {
      return [val]
    }
    return val || []
  })

/**
 * Схема профиля инструктора (данные из InstructorProfile)
 * Автомобили управляются через VehiclesManager/InstructorVehicle
 */
export const InstructorProfileSchema = z
  .object({
    // Публичность профиля
    isPublic: z
      .union([z.boolean(), z.literal('on'), z.literal('true'), z.literal('false')])
      .optional()
      .transform((val) => {
        if (typeof val === 'boolean') {
          return val
        }
        if (val === 'on' || val === 'true') {
          return true
        }
        return false
      })
      .meta({
        ui: {
          title: 'Публичный профиль',
          fieldType: 'switch',
          description: 'Показывать профиль ученикам для поиска',
        },
      }),

    // Профиль
    bio: z
      .string()
      .max(1000, 'Описание не должно превышать 1000 символов')
      .optional()
      .meta({
        ui: {
          title: 'О себе',
          placeholder: 'Расскажите о вашем опыте преподавания...',
          fieldType: 'textarea',
          description: 'Краткая информация для учеников',
        },
      }),
    experienceStartDate: z.coerce
      .date()
      .max(new Date(), 'Дата начала не может быть в будущем')
      .min(new Date('1950-01-01'), 'Дата начала должна быть не ранее 1950 года')
      .optional()
      .meta({
        ui: {
          title: 'Начало преподавания',
          fieldType: 'date',
          description: 'С какого года преподаёте вождение',
        },
      }),
    licenseCategories: LicenseCategorySchema.meta({
      ui: {
        title: 'Категории прав',
        fieldType: 'listbox',
        description: 'Выберите категории, которые преподаёте',
      },
    }),

    // Рабочие зоны (города и районы)
    workingAreas: z
      .string()
      .optional()
      .transform((val) => {
        // FormData передаёт JSON-строку, парсим её
        if (!val || val === '') {
          return undefined
        }
        try {
          return JSON.parse(val)
        } catch {
          return undefined
        }
      })
      .pipe(WorkingAreasSchema)
      .meta({
        ui: {
          title: 'Рабочие зоны',
          description: 'Города и районы, где проводите занятия',
        },
      }),
  })
  .strip()

/**
 * Полная схема для обновления профиля инструктора
 */
export const UpdateInstructorProfileSchema = UserProfileSchema.merge(InstructorProfileSchema)

export type WorkingArea = z.infer<typeof WorkingAreaSchema>
export type InstructorProfileData = z.infer<typeof InstructorProfileSchema>
export type UpdateInstructorProfileData = z.infer<typeof UpdateInstructorProfileSchema>

// INPUT типы для форм (до трансформации)
export type UpdateInstructorProfileInput = z.input<typeof UpdateInstructorProfileSchema>
