/**
 * Тесты для сервиса мульти-категорий прав
 */

import { LicenseCategory } from '@letar/driving-school-db/prisma'
import {
  ALL_LICENSE_CATEGORIES,
  BUS_CATEGORIES,
  CAR_CATEGORIES,
  type ConnectionWithCategory,
  filterConnectionsByCategory,
  filterLessonsByCategory,
  getBaseCategory,
  getCategoriesForDisplay,
  getCategoryDescription,
  getCategoryDisplayName,
  instructorTeachesCategory,
  isTrailerCategory,
  isValidCategory,
  type LessonWithCategory,
  MOTORCYCLE_CATEGORIES,
  schoolTeachesCategory,
  TRAILER_CATEGORIES,
  TRAM_TROLLEYBUS_CATEGORIES,
  TRUCK_CATEGORIES,
} from './license-categories'

describe('license-categories', () => {
  // ============================================================================
  // Константы категорий
  // ============================================================================

  describe('ALL_LICENSE_CATEGORIES', () => {
    it('должен содержать все 16 категорий', () => {
      expect(ALL_LICENSE_CATEGORIES).toHaveLength(16)
    })

    it('должен содержать все категории из enum', () => {
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.M)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.A1)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.A)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.B1)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.B)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.C1)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.C)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.D1)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.D)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.BE)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.CE)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.C1E)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.DE)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.D1E)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.Tm)
      expect(ALL_LICENSE_CATEGORIES).toContain(LicenseCategory.Tb)
    })
  })

  describe('группы категорий', () => {
    it('MOTORCYCLE_CATEGORIES содержит мотоциклетные категории', () => {
      expect(MOTORCYCLE_CATEGORIES).toEqual([LicenseCategory.M, LicenseCategory.A1, LicenseCategory.A])
    })

    it('CAR_CATEGORIES содержит автомобильные категории', () => {
      expect(CAR_CATEGORIES).toEqual([LicenseCategory.B1, LicenseCategory.B])
    })

    it('TRUCK_CATEGORIES содержит грузовые категории', () => {
      expect(TRUCK_CATEGORIES).toEqual([LicenseCategory.C1, LicenseCategory.C])
    })

    it('BUS_CATEGORIES содержит автобусные категории', () => {
      expect(BUS_CATEGORIES).toEqual([LicenseCategory.D1, LicenseCategory.D])
    })

    it('TRAILER_CATEGORIES содержит категории с прицепом', () => {
      expect(TRAILER_CATEGORIES).toEqual([
        LicenseCategory.BE,
        LicenseCategory.CE,
        LicenseCategory.C1E,
        LicenseCategory.DE,
        LicenseCategory.D1E,
      ])
    })

    it('TRAM_TROLLEYBUS_CATEGORIES содержит трамвайно-троллейбусные категории', () => {
      expect(TRAM_TROLLEYBUS_CATEGORIES).toEqual([LicenseCategory.Tm, LicenseCategory.Tb])
    })
  })

  // ============================================================================
  // getCategoryDisplayName
  // ============================================================================

  describe('getCategoryDisplayName', () => {
    it('возвращает отображаемое имя для категории M', () => {
      expect(getCategoryDisplayName(LicenseCategory.M)).toBe('M')
    })

    it('возвращает отображаемое имя для категории A1', () => {
      expect(getCategoryDisplayName(LicenseCategory.A1)).toBe('A1')
    })

    it('возвращает отображаемое имя для категории B', () => {
      expect(getCategoryDisplayName(LicenseCategory.B)).toBe('B')
    })

    it('возвращает отображаемое имя для категории C1E', () => {
      expect(getCategoryDisplayName(LicenseCategory.C1E)).toBe('C1E')
    })

    it('возвращает отображаемое имя для категории Tm', () => {
      expect(getCategoryDisplayName(LicenseCategory.Tm)).toBe('Tm')
    })
  })

  // ============================================================================
  // getCategoryDescription
  // ============================================================================

  describe('getCategoryDescription', () => {
    it('возвращает описание для категории M', () => {
      expect(getCategoryDescription(LicenseCategory.M)).toBe('Мопеды, скутеры (до 50 см³)')
    })

    it('возвращает описание для категории A1', () => {
      expect(getCategoryDescription(LicenseCategory.A1)).toBe('Лёгкие мотоциклы (до 125 см³)')
    })

    it('возвращает описание для категории B', () => {
      expect(getCategoryDescription(LicenseCategory.B)).toBe('Легковые авто (до 3.5т)')
    })

    it('возвращает описание для категории C', () => {
      expect(getCategoryDescription(LicenseCategory.C)).toBe('Грузовые авто (более 3.5т)')
    })

    it('возвращает описание для категории D1', () => {
      expect(getCategoryDescription(LicenseCategory.D1)).toBe('Малые автобусы (до 16 мест)')
    })

    it('возвращает описание для категории BE', () => {
      expect(getCategoryDescription(LicenseCategory.BE)).toBe('Легковые с прицепом')
    })

    it('возвращает описание для категории Tm', () => {
      expect(getCategoryDescription(LicenseCategory.Tm)).toBe('Трамваи')
    })

    it('возвращает описание для категории Tb', () => {
      expect(getCategoryDescription(LicenseCategory.Tb)).toBe('Троллейбусы')
    })
  })

  // ============================================================================
  // isValidCategory
  // ============================================================================

  describe('isValidCategory', () => {
    it('возвращает true для валидной категории B', () => {
      expect(isValidCategory('B')).toBe(true)
    })

    it('возвращает true для валидной категории C1E', () => {
      expect(isValidCategory('C1E')).toBe(true)
    })

    it('возвращает false для невалидной категории', () => {
      expect(isValidCategory('X')).toBe(false)
    })

    it('возвращает false для пустой строки', () => {
      expect(isValidCategory('')).toBe(false)
    })

    it('возвращает false для null', () => {
      expect(isValidCategory(null as unknown as string)).toBe(false)
    })

    it('возвращает false для undefined', () => {
      expect(isValidCategory(undefined as unknown as string)).toBe(false)
    })
  })

  // ============================================================================
  // isTrailerCategory
  // ============================================================================

  describe('isTrailerCategory', () => {
    it('возвращает true для BE', () => {
      expect(isTrailerCategory(LicenseCategory.BE)).toBe(true)
    })

    it('возвращает true для CE', () => {
      expect(isTrailerCategory(LicenseCategory.CE)).toBe(true)
    })

    it('возвращает true для C1E', () => {
      expect(isTrailerCategory(LicenseCategory.C1E)).toBe(true)
    })

    it('возвращает true для DE', () => {
      expect(isTrailerCategory(LicenseCategory.DE)).toBe(true)
    })

    it('возвращает true для D1E', () => {
      expect(isTrailerCategory(LicenseCategory.D1E)).toBe(true)
    })

    it('возвращает false для B', () => {
      expect(isTrailerCategory(LicenseCategory.B)).toBe(false)
    })

    it('возвращает false для C', () => {
      expect(isTrailerCategory(LicenseCategory.C)).toBe(false)
    })
  })

  // ============================================================================
  // getBaseCategory
  // ============================================================================

  describe('getBaseCategory', () => {
    it('возвращает B для BE', () => {
      expect(getBaseCategory(LicenseCategory.BE)).toBe(LicenseCategory.B)
    })

    it('возвращает C для CE', () => {
      expect(getBaseCategory(LicenseCategory.CE)).toBe(LicenseCategory.C)
    })

    it('возвращает C1 для C1E', () => {
      expect(getBaseCategory(LicenseCategory.C1E)).toBe(LicenseCategory.C1)
    })

    it('возвращает D для DE', () => {
      expect(getBaseCategory(LicenseCategory.DE)).toBe(LicenseCategory.D)
    })

    it('возвращает D1 для D1E', () => {
      expect(getBaseCategory(LicenseCategory.D1E)).toBe(LicenseCategory.D1)
    })

    it('возвращает B как есть (не трейлерная)', () => {
      expect(getBaseCategory(LicenseCategory.B)).toBe(LicenseCategory.B)
    })

    it('возвращает M как есть (не трейлерная)', () => {
      expect(getBaseCategory(LicenseCategory.M)).toBe(LicenseCategory.M)
    })
  })

  // ============================================================================
  // instructorTeachesCategory
  // ============================================================================

  describe('instructorTeachesCategory', () => {
    const instructorWithBC = {
      licenseCategories: [LicenseCategory.B, LicenseCategory.C],
    }

    const instructorWithoutCategories = {
      licenseCategories: [],
    }

    it('возвращает true если инструктор преподаёт категорию', () => {
      expect(instructorTeachesCategory(instructorWithBC, LicenseCategory.B)).toBe(true)
      expect(instructorTeachesCategory(instructorWithBC, LicenseCategory.C)).toBe(true)
    })

    it('возвращает false если инструктор не преподаёт категорию', () => {
      expect(instructorTeachesCategory(instructorWithBC, LicenseCategory.D)).toBe(false)
    })

    it('возвращает false если у инструктора нет категорий', () => {
      expect(instructorTeachesCategory(instructorWithoutCategories, LicenseCategory.B)).toBe(false)
    })
  })

  // ============================================================================
  // schoolTeachesCategory
  // ============================================================================

  describe('schoolTeachesCategory', () => {
    const schoolWithBCD = {
      licenseCategories: [LicenseCategory.B, LicenseCategory.C, LicenseCategory.D],
    }

    const schoolWithoutCategories = {
      licenseCategories: [],
    }

    it('возвращает true если школа преподаёт категорию', () => {
      expect(schoolTeachesCategory(schoolWithBCD, LicenseCategory.B)).toBe(true)
      expect(schoolTeachesCategory(schoolWithBCD, LicenseCategory.C)).toBe(true)
      expect(schoolTeachesCategory(schoolWithBCD, LicenseCategory.D)).toBe(true)
    })

    it('возвращает false если школа не преподаёт категорию', () => {
      expect(schoolTeachesCategory(schoolWithBCD, LicenseCategory.A)).toBe(false)
    })

    it('возвращает false если у школы нет категорий', () => {
      expect(schoolTeachesCategory(schoolWithoutCategories, LicenseCategory.B)).toBe(false)
    })
  })

  // ============================================================================
  // filterConnectionsByCategory
  // ============================================================================

  describe('filterConnectionsByCategory', () => {
    const connections: ConnectionWithCategory[] = [
      { id: '1', category: LicenseCategory.B },
      { id: '2', category: LicenseCategory.C },
      { id: '3', category: LicenseCategory.B },
      { id: '4', category: null },
    ]

    it('фильтрует связи по категории B', () => {
      const result = filterConnectionsByCategory(connections, LicenseCategory.B)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('1')
      expect(result[1].id).toBe('3')
    })

    it('фильтрует связи по категории C', () => {
      const result = filterConnectionsByCategory(connections, LicenseCategory.C)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('возвращает пустой массив если нет совпадений', () => {
      const result = filterConnectionsByCategory(connections, LicenseCategory.D)
      expect(result).toHaveLength(0)
    })

    it('возвращает все связи если категория не указана', () => {
      const result = filterConnectionsByCategory(connections, null)
      expect(result).toHaveLength(4)
    })

    it('возвращает все связи если категория undefined', () => {
      const result = filterConnectionsByCategory(connections, undefined)
      expect(result).toHaveLength(4)
    })
  })

  // ============================================================================
  // filterLessonsByCategory
  // ============================================================================

  describe('filterLessonsByCategory', () => {
    const lessons: LessonWithCategory[] = [
      { id: '1', category: LicenseCategory.B },
      { id: '2', category: LicenseCategory.C },
      { id: '3', category: LicenseCategory.B },
      { id: '4', category: null },
    ]

    it('фильтрует занятия по категории B', () => {
      const result = filterLessonsByCategory(lessons, LicenseCategory.B)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('1')
      expect(result[1].id).toBe('3')
    })

    it('фильтрует занятия по категории C', () => {
      const result = filterLessonsByCategory(lessons, LicenseCategory.C)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('возвращает пустой массив если нет совпадений', () => {
      const result = filterLessonsByCategory(lessons, LicenseCategory.D)
      expect(result).toHaveLength(0)
    })

    it('возвращает все занятия если категория не указана', () => {
      const result = filterLessonsByCategory(lessons, null)
      expect(result).toHaveLength(4)
    })
  })

  // ============================================================================
  // getCategoriesForDisplay
  // ============================================================================

  describe('getCategoriesForDisplay', () => {
    it('возвращает все категории с именем и описанием', () => {
      const result = getCategoriesForDisplay()
      expect(result).toHaveLength(16)

      const categoryB = result.find((c) => c.value === LicenseCategory.B)
      expect(categoryB).toBeDefined()
      expect(categoryB?.label).toBe('B')
      expect(categoryB?.description).toBe('Легковые авто (до 3.5т)')
    })

    it('сохраняет порядок категорий', () => {
      const result = getCategoriesForDisplay()
      expect(result[0].value).toBe(LicenseCategory.M)
      expect(result[result.length - 1].value).toBe(LicenseCategory.Tb)
    })
  })
})
