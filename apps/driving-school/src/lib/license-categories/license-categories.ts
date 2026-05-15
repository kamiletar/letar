/**
 * Сервис для работы с категориями водительских прав
 *
 * Поддерживает все категории РФ:
 * - M — мопеды, скутеры
 * - A1, A — мотоциклы (лёгкие / все)
 * - B1, B — квадрициклы / легковые авто
 * - C1, C — грузовики (средние / тяжёлые)
 * - D1, D — автобусы (малые / большие)
 * - BE, CE, C1E, DE, D1E — с прицепом
 * - Tm, Tb — трамваи, троллейбусы
 */

import { LicenseCategory } from '@letar/driving-school-db/prisma/enums'

// ============================================================================
// Типы
// ============================================================================

export interface ConnectionWithCategory {
  id: string
  category: LicenseCategory | null
}

export interface LessonWithCategory {
  id: string
  category: LicenseCategory | null
}

export interface InstructorWithCategories {
  licenseCategories: LicenseCategory[]
}

export interface SchoolWithCategories {
  licenseCategories: LicenseCategory[]
}

export interface CategoryDisplayItem {
  value: LicenseCategory
  label: string
  description: string
}

// ============================================================================
// Константы — все категории
// ============================================================================

export const ALL_LICENSE_CATEGORIES: LicenseCategory[] = [
  LicenseCategory.M,
  LicenseCategory.A1,
  LicenseCategory.A,
  LicenseCategory.B1,
  LicenseCategory.B,
  LicenseCategory.C1,
  LicenseCategory.C,
  LicenseCategory.D1,
  LicenseCategory.D,
  LicenseCategory.BE,
  LicenseCategory.CE,
  LicenseCategory.C1E,
  LicenseCategory.DE,
  LicenseCategory.D1E,
  LicenseCategory.Tm,
  LicenseCategory.Tb,
]

// ============================================================================
// Константы — группы категорий
// ============================================================================

/** Мотоциклетные категории */
export const MOTORCYCLE_CATEGORIES: LicenseCategory[] = [LicenseCategory.M, LicenseCategory.A1, LicenseCategory.A]

/** Автомобильные категории */
export const CAR_CATEGORIES: LicenseCategory[] = [LicenseCategory.B1, LicenseCategory.B]

/** Грузовые категории */
export const TRUCK_CATEGORIES: LicenseCategory[] = [LicenseCategory.C1, LicenseCategory.C]

/** Автобусные категории */
export const BUS_CATEGORIES: LicenseCategory[] = [LicenseCategory.D1, LicenseCategory.D]

/** Категории с прицепом */
export const TRAILER_CATEGORIES: LicenseCategory[] = [
  LicenseCategory.BE,
  LicenseCategory.CE,
  LicenseCategory.C1E,
  LicenseCategory.DE,
  LicenseCategory.D1E,
]

/** Трамвайно-троллейбусные категории */
export const TRAM_TROLLEYBUS_CATEGORIES: LicenseCategory[] = [LicenseCategory.Tm, LicenseCategory.Tb]

// ============================================================================
// Описания категорий
// ============================================================================

const CATEGORY_DESCRIPTIONS: Record<LicenseCategory, string> = {
  [LicenseCategory.M]: 'Мопеды, скутеры (до 50 см³)',
  [LicenseCategory.A1]: 'Лёгкие мотоциклы (до 125 см³)',
  [LicenseCategory.A]: 'Мотоциклы (более 125 см³)',
  [LicenseCategory.B1]: 'Трициклы, квадрициклы',
  [LicenseCategory.B]: 'Легковые авто (до 3.5т)',
  [LicenseCategory.C1]: 'Средние грузовики (3.5–7.5т)',
  [LicenseCategory.C]: 'Грузовые авто (более 3.5т)',
  [LicenseCategory.D1]: 'Малые автобусы (до 16 мест)',
  [LicenseCategory.D]: 'Автобусы (более 8 мест)',
  [LicenseCategory.BE]: 'Легковые с прицепом',
  [LicenseCategory.CE]: 'Грузовики с прицепом',
  [LicenseCategory.C1E]: 'Средние грузовики с прицепом',
  [LicenseCategory.DE]: 'Автобусы с прицепом',
  [LicenseCategory.D1E]: 'Малые автобусы с прицепом',
  [LicenseCategory.Tm]: 'Трамваи',
  [LicenseCategory.Tb]: 'Троллейбусы',
}

// ============================================================================
// Маппинг трейлерных категорий на базовые
// ============================================================================

const TRAILER_TO_BASE: Record<string, LicenseCategory> = {
  [LicenseCategory.BE]: LicenseCategory.B,
  [LicenseCategory.CE]: LicenseCategory.C,
  [LicenseCategory.C1E]: LicenseCategory.C1,
  [LicenseCategory.DE]: LicenseCategory.D,
  [LicenseCategory.D1E]: LicenseCategory.D1,
}

// ============================================================================
// Функции для работы с категориями
// ============================================================================

/**
 * Возвращает отображаемое имя категории
 */
export function getCategoryDisplayName(category: LicenseCategory): string {
  return category
}

/**
 * Возвращает описание категории на русском
 */
export function getCategoryDescription(category: LicenseCategory): string {
  return CATEGORY_DESCRIPTIONS[category]
}

/**
 * Проверяет, является ли строка валидной категорией прав
 */
export function isValidCategory(value: string): value is LicenseCategory {
  if (!value) {
    return false
  }
  return ALL_LICENSE_CATEGORIES.includes(value as LicenseCategory)
}

/**
 * Проверяет, является ли категория трейлерной (с прицепом)
 */
export function isTrailerCategory(category: LicenseCategory): boolean {
  return TRAILER_CATEGORIES.includes(category)
}

/**
 * Возвращает базовую категорию для трейлерной, или саму категорию если не трейлерная
 * Например: BE -> B, CE -> C, B -> B
 */
export function getBaseCategory(category: LicenseCategory): LicenseCategory {
  return TRAILER_TO_BASE[category] || category
}

// ============================================================================
// Функции проверки категорий
// ============================================================================

/**
 * Проверяет, преподаёт ли инструктор указанную категорию
 */
export function instructorTeachesCategory(instructor: InstructorWithCategories, category: LicenseCategory): boolean {
  return instructor.licenseCategories.includes(category)
}

/**
 * Проверяет, преподаёт ли школа указанную категорию
 */
export function schoolTeachesCategory(school: SchoolWithCategories, category: LicenseCategory): boolean {
  return school.licenseCategories.includes(category)
}

// ============================================================================
// Функции фильтрации
// ============================================================================

/**
 * Фильтрует связи по категории
 * Если категория не указана — возвращает все связи
 */
export function filterConnectionsByCategory<T extends ConnectionWithCategory>(
  connections: T[],
  category: LicenseCategory | null | undefined
): T[] {
  if (!category) {
    return connections
  }
  return connections.filter((c) => c.category === category)
}

/**
 * Фильтрует занятия по категории
 * Если категория не указана — возвращает все занятия
 */
export function filterLessonsByCategory<T extends LessonWithCategory>(
  lessons: T[],
  category: LicenseCategory | null | undefined
): T[] {
  if (!category) {
    return lessons
  }
  return lessons.filter((l) => l.category === category)
}

// ============================================================================
// Функции для UI
// ============================================================================

/**
 * Возвращает все категории в формате для отображения в select/dropdown
 */
export function getCategoriesForDisplay(): CategoryDisplayItem[] {
  return ALL_LICENSE_CATEGORIES.map((category) => ({
    value: category,
    label: getCategoryDisplayName(category),
    description: getCategoryDescription(category),
  }))
}
