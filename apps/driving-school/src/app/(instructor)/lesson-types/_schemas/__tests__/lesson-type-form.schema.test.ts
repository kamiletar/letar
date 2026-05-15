/**
 * Тесты для схемы формы типа занятия
 * Актуальная схема без price (цена через PricingOption)
 */
// globals: true — describe, expect, it доступны глобально
import { LessonTypeFormSchema, LessonTypeInputSchema } from '../lesson-type-form.schema'

describe('LessonTypeFormSchema', () => {
  // Хелпер для создания валидных данных
  const validData = {
    name: 'Стандартное занятие',
    durationMinutes: '90',
  }

  describe('name (название)', () => {
    it('должен принимать валидное название', () => {
      const result = LessonTypeFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('должен отклонять пустое название', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        name: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name')
      }
    })

    it('должен отклонять название только из пробелов', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        name: '   ',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять название длиннее 100 символов', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        name: 'а'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('должен обрезать пробелы с названия', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        name: '  Стандартное занятие  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Стандартное занятие')
      }
    })
  })

  describe('description (описание)', () => {
    it('должен принимать описание', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        description: 'Базовое занятие по вождению',
      })
      expect(result.success).toBe(true)
    })

    it('должен преобразовать пустое описание в undefined', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        description: '',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBeUndefined()
      }
    })

    it('должен принимать отсутствующее описание', () => {
      const result = LessonTypeFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('должен отклонять описание длиннее 500 символов', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        description: 'а'.repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('durationMinutes (длительность)', () => {
    it('должен принимать стандартную длительность 90 минут', () => {
      const result = LessonTypeFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.durationMinutes).toBe(90)
      }
    })

    it('должен принимать минимальную длительность 15 минут', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        durationMinutes: '15',
      })
      expect(result.success).toBe(true)
    })

    it('должен принимать максимальную длительность 480 минут (8 часов)', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        durationMinutes: '480',
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонять длительность менее 15 минут', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        durationMinutes: '10',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять длительность более 480 минут', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        durationMinutes: '500',
      })
      expect(result.success).toBe(false)
    })

    it('должен преобразовать строку в число (coerce)', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        durationMinutes: '120',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.durationMinutes).toBe(120)
        expect(typeof result.data.durationMinutes).toBe('number')
      }
    })

    it('должен отклонять нецелую длительность', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        durationMinutes: '90.5',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('licenseCategory (категория прав)', () => {
    it('должен принимать валидную категорию B', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        licenseCategory: 'B',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.licenseCategory).toBe('B')
      }
    })

    it('должен принимать категорию A', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        licenseCategory: 'A',
      })
      expect(result.success).toBe(true)
    })

    it('должен преобразовать пустую категорию в undefined', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        licenseCategory: '',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.licenseCategory).toBeUndefined()
      }
    })

    it('должен принимать отсутствующую категорию', () => {
      const result = LessonTypeFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.licenseCategory).toBeUndefined()
      }
    })
  })

  describe('lessonCategory (тип занятия)', () => {
    it('должен принимать валидный тип CITY_DRIVING', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        lessonCategory: 'CITY_DRIVING',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.lessonCategory).toBe('CITY_DRIVING')
      }
    })

    it('должен преобразовать пустой тип в undefined', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        lessonCategory: '',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.lessonCategory).toBeUndefined()
      }
    })
  })

  describe('полная форма', () => {
    it('должен принимать полную форму со всеми полями', () => {
      const result = LessonTypeFormSchema.safeParse({
        name: 'Экстремальное вождение',
        description: 'Курс контраварийной подготовки',
        durationMinutes: '120',
        licenseCategory: 'B',
        lessonCategory: 'CITY_DRIVING',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          name: 'Экстремальное вождение',
          description: 'Курс контраварийной подготовки',
          durationMinutes: 120,
          licenseCategory: 'B',
          lessonCategory: 'CITY_DRIVING',
        })
      }
    })

    it('должен принимать минимальную форму', () => {
      const result = LessonTypeFormSchema.safeParse({
        name: 'Занятие',
        durationMinutes: '60',
      })
      expect(result.success).toBe(true)
    })

    it('должен удалять неизвестные поля (strip)', () => {
      const result = LessonTypeFormSchema.safeParse({
        ...validData,
        unknownField: 'should be stripped',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('unknownField')
      }
    })
  })
})

describe('LessonTypeInputSchema', () => {
  it('должен принимать форму с id для обновления', () => {
    const result = LessonTypeInputSchema.safeParse({
      id: 'lesson-type-id',
      name: 'Обновлённое занятие',
      durationMinutes: '90',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('lesson-type-id')
    }
  })

  it('должен принимать форму без id для создания', () => {
    const result = LessonTypeInputSchema.safeParse({
      name: 'Новое занятие',
      durationMinutes: '90',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBeUndefined()
    }
  })
})
