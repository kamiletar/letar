import type { Gender } from '@/generated/prisma'
import { getEnhancedPrisma } from '@/lib/db'

/**
 * Тип размера для утилит калькулятора
 */
export type SizeInfo = {
  id: string
  gender: Gender
  international: string
  ru: string
  de: string
  it: string
  fr: string
  uk: string
  us: string
  jeansFrom: string
  jeansTo: string
  bustMin: number
  bustMax: number
  waistMin: number
  waistMax: number
  hipsMin: number
  hipsMax: number
}

/**
 * Тип совпадения для результатов поиска размера
 */
export type MatchType = 'exact' | 'partial' | 'nearest'

/**
 * Результат совпадения размера с метаданными
 */
export type SizeMatch = {
  size: SizeInfo
  matchType: MatchType
  distance: number // Чем меньше, тем лучше
  matchedParams: ('bust' | 'waist' | 'hips')[]
  recommendation?: string
}

/**
 * Вычисляет расстояние от измерений до диапазона размера
 * Возвращает 0, если измерение в пределах диапазона, иначе кратчайшее расстояние до диапазона
 */
function calculateParamDistance(measurement: number, min: number, max: number): number {
  if (measurement >= min && measurement <= max) {
    return 0 // Идеальное совпадение
  }
  if (measurement < min) {
    return min - measurement // Расстояние до нижней границы
  }
  return measurement - max // Расстояние до верхней границы
}

/**
 * Вычисляет общее расстояние от измерений до размера
 * Меньшее расстояние означает лучшее совпадение
 */
function calculateSizeDistance(
  bust: number,
  waist: number,
  hips: number,
  size: SizeInfo
): {
  distance: number
  matchedParams: ('bust' | 'waist' | 'hips')[]
  bustDistance: number
  waistDistance: number
  hipsDistance: number
} {
  const bustDistance = calculateParamDistance(bust, size.bustMin, size.bustMax)
  const waistDistance = calculateParamDistance(waist, size.waistMin, size.waistMax)
  const hipsDistance = calculateParamDistance(hips, size.hipsMin, size.hipsMax)

  // Отслеживаем, какие параметры совпадают идеально
  const matchedParams: ('bust' | 'waist' | 'hips')[] = []
  if (bustDistance === 0) {
    matchedParams.push('bust')
  }
  if (waistDistance === 0) {
    matchedParams.push('waist')
  }
  if (hipsDistance === 0) {
    matchedParams.push('hips')
  }

  // Общее расстояние с взвешенной важностью: бёдра > грудь > талия
  // Это отражает, что посадка по бёдрам и груди обычно важнее, чем по талии
  const distance = hipsDistance * 1.5 + bustDistance * 1.2 + waistDistance * 1.0

  return {
    distance,
    matchedParams,
    bustDistance,
    waistDistance,
    hipsDistance,
  }
}

/**
 * Генерирует текст рекомендации на основе несовпадений измерений
 */
function generateRecommendation(
  bust: number,
  waist: number,
  hips: number,
  size: SizeInfo,
  matchType: MatchType,
  bustDistance: number,
  waistDistance: number,
  hipsDistance: number
): string | undefined {
  if (matchType === 'exact') {
    return undefined // Рекомендация не нужна для точного совпадения
  }

  // Находим наиболее проблемное измерение
  const maxDistance = Math.max(bustDistance, waistDistance, hipsDistance)

  if (maxDistance === 0) {
    // Все параметры совпадают, но помечено как partial/nearest — не должно случаться
    return undefined
  }

  const problems: string[] = []

  if (hipsDistance === maxDistance && hipsDistance > 0) {
    if (hips > size.hipsMax) {
      problems.push('бёдра немного больше стандарта (рекомендуем свободный крой)')
    } else {
      problems.push('бёдра немного меньше стандарта')
    }
  }

  if (bustDistance === maxDistance && bustDistance > 0) {
    if (bust > size.bustMax) {
      problems.push('грудь немного больше стандарта')
    } else {
      problems.push('грудь немного меньше стандарта')
    }
  }

  if (waistDistance === maxDistance && waistDistance > 0) {
    if (waist > size.waistMax) {
      problems.push('талия немного больше стандарта')
    } else {
      problems.push('талия немного меньше стандарта')
    }
  }

  if (problems.length === 0) {
    return undefined
  }

  // Делаем первую букву заглавной
  const recommendation = problems[0]
  return recommendation.charAt(0).toUpperCase() + recommendation.slice(1)
}

/**
 * Тип системы размеров
 */
export type SizeSystem = 'ru' | 'international' | 'de' | 'it' | 'fr' | 'uk' | 'us' | 'jeans'

/**
 * Поиск размера по коду в любой системе
 * @param code - Код размера (например, "44", "M", "36" и т.д.)
 * @param system - Система размеров
 * @param gender - Опциональный фильтр по полу
 */
export async function findSizeByCode(code: string, system: SizeSystem, gender?: Gender): Promise<SizeInfo[]> {
  const db = getEnhancedPrisma()
  const normalizedCode = code.trim().toUpperCase()

  // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where clause требует динамический тип
  const where: Record<string, any> = {
    gender: gender ? gender : undefined,
  }

  // Сопоставляем систему с именем поля
  switch (system) {
    case 'ru':
      where.ru = normalizedCode
      break
    case 'international':
      where.international = normalizedCode
      break
    case 'de':
      where.de = normalizedCode
      break
    case 'it':
      where.it = normalizedCode
      break
    case 'fr':
      where.fr = normalizedCode
      break
    case 'uk':
      where.uk = normalizedCode
      break
    case 'us':
      where.us = normalizedCode
      break
    case 'jeans':
      // Для джинсов проверяем, входит ли код в диапазон
      where.OR = [{ jeansFrom: normalizedCode }, { jeansTo: normalizedCode }]
      break
  }

  const sizes = await db.productSize.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { ru: 'asc' }],
  })

  return sizes
}

/**
 * Поиск размера по измерениям тела с умным сопоставлением
 * Возвращает сначала точные совпадения, затем частичные, затем ближайшие
 * @param bust - Обхват груди в см
 * @param waist - Обхват талии в см
 * @param hips - Обхват бёдер в см
 * @param gender - Фильтр по полу
 */
export async function findSizeByMeasurements(
  bust: number,
  waist: number,
  hips: number,
  gender: Gender
): Promise<SizeMatch[]> {
  const db = getEnhancedPrisma()

  // Получаем все размеры для этого пола
  const allSizes = await db.productSize.findMany({
    where: { gender },
    orderBy: [{ sortOrder: 'asc' }, { ru: 'asc' }],
  })

  if (allSizes.length === 0) {
    return []
  }

  // Вычисляем расстояние и тип совпадения для каждого размера
  const matches: SizeMatch[] = allSizes.map((size: SizeInfo) => {
    const { distance, matchedParams, bustDistance, waistDistance, hipsDistance } = calculateSizeDistance(
      bust,
      waist,
      hips,
      size
    )

    // Определяем тип совпадения
    let matchType: MatchType
    if (matchedParams.length === 3) {
      matchType = 'exact'
    } else if (matchedParams.length >= 2) {
      matchType = 'partial'
    } else {
      matchType = 'nearest'
    }

    // Генерируем рекомендацию
    const recommendation = generateRecommendation(
      bust,
      waist,
      hips,
      size,
      matchType,
      bustDistance,
      waistDistance,
      hipsDistance
    )

    return {
      size,
      matchType,
      distance,
      matchedParams,
      recommendation,
    }
  })

  // Сортируем по приоритету типа совпадения, затем по расстоянию
  matches.sort((a, b) => {
    // Приоритет: exact > partial > nearest
    const matchTypePriority: Record<MatchType, number> = {
      exact: 0,
      partial: 1,
      nearest: 2,
    }

    const typeDiff = matchTypePriority[a.matchType] - matchTypePriority[b.matchType]
    if (typeDiff !== 0) {
      return typeDiff
    }

    // В пределах одного типа совпадения сортируем по расстоянию
    return a.distance - b.distance
  })

  // Фильтруем результаты по качеству совпадения
  const exactMatches = matches.filter((m) => m.matchType === 'exact')

  if (exactMatches.length > 0) {
    // Если есть точные совпадения, возвращаем только их
    return exactMatches
  }

  const partialMatches = matches.filter((m) => m.matchType === 'partial')

  if (partialMatches.length > 0) {
    // Если есть частичные совпадения, возвращаем до 3 лучших
    return partialMatches.slice(0, 3)
  }

  // Нет точных или частичных совпадений — возвращаем топ-3 ближайших размера
  return matches.slice(0, 3)
}

/**
 * Получить все размеры для пола
 * @param gender - Фильтр по полу
 */
export async function getAllSizesByGender(gender: Gender): Promise<SizeInfo[]> {
  const db = getEnhancedPrisma()

  const sizes = await db.productSize.findMany({
    where: { gender },
    orderBy: [{ sortOrder: 'asc' }, { ru: 'asc' }],
  })

  return sizes
}

/**
 * Форматирует название системы размеров для отображения
 */
export function formatSizeSystem(system: SizeSystem): string {
  const names: Record<SizeSystem, string> = {
    ru: 'Российский (RU)',
    international: 'Международный (INT)',
    de: 'Немецкий (DE)',
    it: 'Итальянский (IT)',
    fr: 'Французский (FR)',
    uk: 'Британский (UK)',
    us: 'Американский (US)',
    jeans: 'Джинсы',
  }
  return names[system]
}

/**
 * Получает значение размера по системе
 */
export function getSizeValue(size: SizeInfo, system: SizeSystem): string {
  switch (system) {
    case 'ru':
      return size.ru
    case 'international':
      return size.international
    case 'de':
      return size.de
    case 'it':
      return size.it
    case 'fr':
      return size.fr
    case 'uk':
      return size.uk
    case 'us':
      return size.us
    case 'jeans':
      return `${size.jeansFrom} - ${size.jeansTo}`
  }
}
