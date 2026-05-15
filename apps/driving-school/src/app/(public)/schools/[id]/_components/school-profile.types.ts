/**
 * Типы и константы для страницы профиля школы
 *
 * После миграции School → Organization типы определяются вручную,
 * так как Prisma-генерация может быть не синхронизирована.
 *
 * @module school-profile.types
 */

import type { LicenseCategory, LocationType, ReviewStatus } from '@letar/driving-school-db/prisma'
import { LuBuilding2, LuCar, LuGraduationCap } from 'react-icons/lu'

/** Файл */
export interface FileData {
  id: string
  path: string
  filename: string
}

/** Файл локации */
export interface LocationFileData {
  id: string
  order: number
  file: FileData
}

/** Данные локации (TeamLocationData) */
export interface TeamLocationDataType {
  id: string
  type: LocationType
  city: string
  address: string
  phone: string | null
  description: string | null
  timezone: string | null
  workingHours: unknown
  isActive: boolean
}

/** Команда (Team) с данными локации */
export interface TeamWithLocation {
  id: string
  name: string
  locationData: TeamLocationDataType | null
  files: LocationFileData[]
}

/** Данные профиля инструктора */
export interface InstructorProfileData {
  id: string
  experienceStartDate: Date | null
  averageRating: number | null
  reviewCount: number
  licenseCategories: LicenseCategory[]
}

/** Пользователь с профилем инструктора */
export interface UserWithInstructorProfile {
  id: string
  name: string | null
  image: string | null
  instructorProfile: InstructorProfileData | null
}

/** Член организации (Member) с данными пользователя */
export interface MemberWithUser {
  id: string
  role: string
  user: UserWithInstructorProfile
}

/** Автор отзыва */
export interface ReviewAuthor {
  id: string
  name: string | null
  image: string | null
}

/** Отзыв с автором */
export interface ReviewWithAuthor {
  id: string
  authorId: string
  rating: number
  text: string | null
  status: ReviewStatus
  createdAt: Date
  author: ReviewAuthor
}

/** Организация с включёнными связями */
export interface OrganizationWithRelations {
  id: string
  name: string
  slug: string
  logo: string | null
  metadata: string | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  isPublic: boolean
  averageRating: number | null
  reviewCount: number
  createdAt: Date
  updatedAt: Date
  members: MemberWithUser[]
  teams: TeamWithLocation[]
  reviews: ReviewWithAuthor[]
  _count: { members: number; studyGroups: number }
}

/** @deprecated Используйте OrganizationWithRelations */
export type SchoolWithRelations = OrganizationWithRelations

/** Конфиг типов локаций */
export const LOCATION_TYPE_CONFIG: Record<LocationType, { label: string; color: string }> = {
  OFFICE: { label: 'Офис', color: 'blue' },
  CLASSROOM: { label: 'Учебный класс', color: 'purple' },
  TRAINING: { label: 'Площадка', color: 'green' },
  DOCUMENTS_ONLY: { label: 'Только документы', color: 'orange' },
  PRACTICE_ONLY: { label: 'Только практика', color: 'teal' },
  FULL_SERVICE: { label: 'Полный сервис', color: 'brand' },
}

/** Иконка для типа локации */
export function getLocationIcon(type: LocationType) {
  switch (type) {
    case 'OFFICE':
    case 'DOCUMENTS_ONLY':
      return LuBuilding2
    case 'CLASSROOM':
      return LuGraduationCap
    case 'TRAINING':
    case 'PRACTICE_ONLY':
    case 'FULL_SERVICE':
      return LuCar
    default:
      return LuBuilding2
  }
}

/** Склонение слова "инструктор" */
export function getInstructorWord(count: number): string {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'инструкторов'
  }
  if (lastDigit === 1) {
    return 'инструктор'
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'инструктора'
  }
  return 'инструкторов'
}

/** Склонение слова "группа" */
export function getGroupWord(count: number): string {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'групп'
  }
  if (lastDigit === 1) {
    return 'группа'
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'группы'
  }
  return 'групп'
}
