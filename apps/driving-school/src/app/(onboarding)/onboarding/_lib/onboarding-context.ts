/**
 * Контекст и типы для онбординга
 *
 * Выделен из onboarding-wizard.tsx для переиспользуемости
 */

import type { OnboardingRole } from '../_schemas/onboarding.schema'

// Порядок ролей для навигации стрелками
export const ROLES: OnboardingRole[] = ['STUDENT', 'INSTRUCTOR', 'SCHOOL_ADMIN']

// Префикс ключа для localStorage (добавляется userId)
export const STORAGE_KEY_PREFIX = 'driving-school-onboarding'

// Состояние формы
export interface OnboardingFormData {
  name: string
  role: OnboardingRole | null
  preferredAreas: string[]
  carBrand: string
  carModel: string
  carTransmission: 'MANUAL' | 'AUTOMATIC'
  experienceStartDate: string // Дата начала деятельности инструктора
  city: string
  isPublic: boolean
  schoolName: string
  schoolCity: string
  schoolPhone: string
}

export const initialFormData: OnboardingFormData = {
  name: '',
  role: null,
  preferredAreas: [],
  carBrand: '',
  carModel: '',
  carTransmission: 'MANUAL',
  experienceStartDate: '',
  city: '',
  isPublic: true,
  schoolName: '',
  schoolCity: '',
  schoolPhone: '',
}

// Маппинг ошибок
export function getErrorMessage(error: string): string {
  switch (error) {
    case 'UNAUTHORIZED':
      return 'Необходимо войти в аккаунт'
    case 'ALREADY_COMPLETED':
      return 'Onboarding уже завершён'
    case 'VALIDATION_ERROR':
      return 'Проверьте введённые данные'
    default:
      return 'Произошла ошибка. Попробуйте ещё раз'
  }
}
