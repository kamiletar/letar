// globals: true — describe, expect, it доступны глобально
import { InstructorProfileSchema, LicenseCategorySchema } from '../instructor-profile.schema'

describe('LicenseCategorySchema', () => {
  it('должен принимать категорию B', () => {
    const result = LicenseCategorySchema.safeParse(['B'])
    expect(result.success).toBe(true)
  })

  it('должен принимать несколько категорий', () => {
    const result = LicenseCategorySchema.safeParse(['A', 'B', 'C'])
    expect(result.success).toBe(true)
  })

  it('должен принимать пустой массив', () => {
    const result = LicenseCategorySchema.safeParse([])
    expect(result.success).toBe(true)
  })

  it('должен отклонять невалидную категорию', () => {
    const result = LicenseCategorySchema.safeParse(['X'])
    expect(result.success).toBe(false)
  })

  it('должен принимать категорию BE', () => {
    const result = LicenseCategorySchema.safeParse(['BE'])
    expect(result.success).toBe(true)
  })
})

describe('InstructorProfileSchema', () => {
  it('должен принимать полный профиль инструктора', () => {
    const result = InstructorProfileSchema.safeParse({
      bio: 'Опытный инструктор с 10-летним стажем',
      experienceStartDate: new Date('2015-01-01'),
      licenseCategories: ['B'],
    })
    expect(result.success).toBe(true)
  })

  it('должен принимать пустой профиль', () => {
    const result = InstructorProfileSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('должен отклонять дату начала деятельности в будущем', () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const result = InstructorProfileSchema.safeParse({
      experienceStartDate: futureDate,
    })
    expect(result.success).toBe(false)
  })

  it('должен отклонять слишком старую дату начала деятельности', () => {
    const result = InstructorProfileSchema.safeParse({
      experienceStartDate: new Date('1940-01-01'),
    })
    expect(result.success).toBe(false)
  })

  it('должен отклонять слишком длинное bio', () => {
    const result = InstructorProfileSchema.safeParse({
      bio: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})
