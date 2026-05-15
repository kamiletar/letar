// globals: true — describe, expect, it доступны глобально
import { PhoneSchema, StudentProfileSchema, UserProfileSchema } from '../student-profile.schema'

describe('PhoneSchema', () => {
  it('должен принимать российский номер +7', () => {
    const result = PhoneSchema.safeParse('+79161234567')
    expect(result.success).toBe(true)
  })

  it('должен принимать российский номер 8', () => {
    const result = PhoneSchema.safeParse('89161234567')
    expect(result.success).toBe(true)
  })

  it('должен принимать номер с пробелами', () => {
    const result = PhoneSchema.safeParse('+7 916 123 45 67')
    expect(result.success).toBe(true)
  })

  it('должен принимать номер с дефисами', () => {
    const result = PhoneSchema.safeParse('+7-916-123-45-67')
    expect(result.success).toBe(true)
  })

  it('должен принимать номер в скобках', () => {
    const result = PhoneSchema.safeParse('+7 (916) 123-45-67')
    expect(result.success).toBe(true)
  })

  it('должен отклонять слишком короткий номер', () => {
    const result = PhoneSchema.safeParse('+7916')
    expect(result.success).toBe(false)
  })

  it('должен отклонять номер с буквами', () => {
    const result = PhoneSchema.safeParse('+7916abc4567')
    expect(result.success).toBe(false)
  })

  it('должен принимать пустой номер (необязательное поле)', () => {
    const result = PhoneSchema.safeParse('')
    expect(result.success).toBe(true)
  })
})

describe('UserProfileSchema', () => {
  it('должен принимать валидный профиль', () => {
    const result = UserProfileSchema.safeParse({
      name: 'Иван Иванов',
      phone: '+79161234567',
    })
    expect(result.success).toBe(true)
  })

  it('должен принимать профиль без телефона', () => {
    const result = UserProfileSchema.safeParse({
      name: 'Иван Иванов',
    })
    expect(result.success).toBe(true)
  })

  it('должен отклонять имя короче 2 символов', () => {
    const result = UserProfileSchema.safeParse({
      name: 'И',
    })
    expect(result.success).toBe(false)
  })

  it('должен отклонять пустое имя', () => {
    const result = UserProfileSchema.safeParse({
      name: '',
    })
    expect(result.success).toBe(false)
  })

  it('должен удалять лишние поля (.strip())', () => {
    const result = UserProfileSchema.safeParse({
      name: 'Иван',
      phone: '+79161234567',
      extraField: 'should be removed',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('extraField')
    }
  })
})

describe('StudentProfileSchema', () => {
  it('должен принимать полный профиль ученика', () => {
    const result = StudentProfileSchema.safeParse({
      preferredAreas: ['Центр', 'Север'],
      noteForInstructor: 'Хочу научиться парковаться',
    })
    expect(result.success).toBe(true)
  })

  it('должен принимать пустой профиль', () => {
    const result = StudentProfileSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('должен принимать профиль только с районами', () => {
    const result = StudentProfileSchema.safeParse({
      preferredAreas: ['Юг', 'Запад'],
    })
    expect(result.success).toBe(true)
  })

  it('должен принимать профиль только с заметкой', () => {
    const result = StudentProfileSchema.safeParse({
      noteForInstructor: 'Боюсь ездить по магистралям',
    })
    expect(result.success).toBe(true)
  })

  it('должен принимать пустой массив районов', () => {
    const result = StudentProfileSchema.safeParse({
      preferredAreas: [],
    })
    expect(result.success).toBe(true)
  })

  it('должен преобразовать строку в массив (FormData совместимость)', () => {
    const result = StudentProfileSchema.safeParse({
      preferredAreas: 'Центр', // строка преобразуется в массив
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.preferredAreas).toEqual(['Центр'])
    }
  })

  it('должен преобразовать пустую строку в пустой массив', () => {
    const result = StudentProfileSchema.safeParse({
      preferredAreas: '',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.preferredAreas).toEqual([])
    }
  })

  it('должен отклонять слишком длинную заметку (>500 символов)', () => {
    const result = StudentProfileSchema.safeParse({
      noteForInstructor: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})
