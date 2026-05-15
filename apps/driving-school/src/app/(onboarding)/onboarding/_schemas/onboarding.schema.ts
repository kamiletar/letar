import { LicenseCategoryFormSchema } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
import { nameSchema } from '@letar/validation-utils'
import { z } from 'zod/v4'

/**
 * Роли при onboarding
 */
export const OnboardingRoleSchema = z.enum(['STUDENT', 'INSTRUCTOR', 'SCHOOL_ADMIN'], {
  error: 'Выберите роль',
})

export type OnboardingRole = z.infer<typeof OnboardingRoleSchema>

/**
 * Шаг 1: Базовая информация (для всех)
 */
export const OnboardingStep1Schema = z.object({
  name: nameSchema,
})

/**
 * Шаг 2: Выбор роли
 */
export const OnboardingStep2Schema = z.object({
  role: OnboardingRoleSchema,
})

/**
 * Шаг 3: Данные для ученика
 */
export const OnboardingStudentSchema = z
  .object({
    preferredAreas: z.array(z.string()).optional(),
  })
  .strip()

/**
 * Шаг 3: Данные для инструктора
 */
export const OnboardingInstructorSchema = z
  .object({
    carBrand: z.string().min(1, 'Укажите марку автомобиля'),
    carModel: z.string().min(1, 'Укажите модель автомобиля'),
    carTransmission: z.enum(['MANUAL', 'AUTOMATIC'], {
      error: 'Выберите тип КПП',
    }),
    experienceStartDate: z.string().optional(),
    city: z.string().min(1, 'Укажите город').optional(),
    isPublic: z.boolean().default(true),
  })
  .strip()

/**
 * Шаг 3: Данные для создания школы
 */
export const OnboardingSchoolSchema = z
  .object({
    schoolName: z.string().min(3, 'Название автошколы должно содержать минимум 3 символа'),
    schoolCity: z.string().min(2, 'Укажите город'),
    schoolPhone: z.string().optional(),
    schoolEmail: z.email().or(z.literal('')).optional(),
    schoolWebsite: z.url().or(z.literal('')).optional(),
    schoolDescription: z.string().max(500).optional(),
    schoolLicenseCategories: z.array(LicenseCategoryFormSchema).optional(),
    schoolIsPublic: z.boolean().default(false),
  })
  .strip()

/**
 * Полная схема onboarding для server action
 */
export const CompleteOnboardingSchema = z
  .discriminatedUnion('role', [
    z.object({
      role: z.literal('STUDENT'),
      name: nameSchema,
      preferredAreas: z.array(z.string()).optional(),
    }),
    z.object({
      role: z.literal('INSTRUCTOR'),
      name: nameSchema,
      carBrand: z.string().min(1),
      carModel: z.string().min(1),
      carTransmission: z.enum(['MANUAL', 'AUTOMATIC']),
      experienceStartDate: z.string().optional(),
      city: z.string().optional(),
      isPublic: z.boolean().default(true),
    }),
    z.object({
      role: z.literal('SCHOOL_ADMIN'),
      name: nameSchema,
      schoolName: z.string().min(3),
      schoolCity: z.string().min(2),
      schoolPhone: z.string().optional(),
      schoolEmail: z.email().or(z.literal('')).optional(),
      schoolWebsite: z.url().or(z.literal('')).optional(),
      schoolDescription: z.string().max(500).optional(),
      schoolLicenseCategories: z.array(LicenseCategoryFormSchema).optional(),
      schoolIsPublic: z.boolean().default(false),
    }),
  ])
  .transform((data) => ({ ...data })) // strip unknown fields

export type CompleteOnboardingData = z.infer<typeof CompleteOnboardingSchema>
export type OnboardingStep1Data = z.infer<typeof OnboardingStep1Schema>
export type OnboardingStep2Data = z.infer<typeof OnboardingStep2Schema>
export type OnboardingStudentData = z.infer<typeof OnboardingStudentSchema>
export type OnboardingInstructorData = z.infer<typeof OnboardingInstructorSchema>
export type OnboardingSchoolData = z.infer<typeof OnboardingSchoolSchema>
