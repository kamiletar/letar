/**
 * Тесты для общих схем валидации.
 */

import {
  emailSchema,
  optionalImageIdSchema,
  optionalSeoStringSchema,
  requiredImageIdSchema,
  slugSchema,
} from '../common.schema'

describe('emailSchema', () => {
  it('должен принимать корректный email', () => {
    const result = emailSchema.safeParse('test@example.com')
    expect(result.success).toBe(true)
  })

  it('должен отклонять email без @', () => {
    const result = emailSchema.safeParse('testexample.com')
    expect(result.success).toBe(false)
  })

  it('должен отклонять email без домена', () => {
    const result = emailSchema.safeParse('test@')
    expect(result.success).toBe(false)
  })

  it('должен отклонять пустую строку', () => {
    const result = emailSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('должен принимать email с поддоменом', () => {
    const result = emailSchema.safeParse('user@mail.example.com')
    expect(result.success).toBe(true)
  })
})

describe('slugSchema', () => {
  it('должен принимать валидный slug', () => {
    const result = slugSchema.safeParse('my-cool-slug')
    expect(result.success).toBe(true)
  })

  it('должен принимать slug с цифрами', () => {
    const result = slugSchema.safeParse('product-123')
    expect(result.success).toBe(true)
  })

  it('должен отклонять пустую строку', () => {
    const result = slugSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('должен отклонять slug с заглавными буквами', () => {
    const result = slugSchema.safeParse('MySlug')
    expect(result.success).toBe(false)
  })

  it('должен отклонять slug с пробелами', () => {
    const result = slugSchema.safeParse('my slug')
    expect(result.success).toBe(false)
  })

  it('должен отклонять slug с подчёркиванием', () => {
    const result = slugSchema.safeParse('my_slug')
    expect(result.success).toBe(false)
  })

  it('должен отклонять slug с кириллицей', () => {
    const result = slugSchema.safeParse('мой-слаг')
    expect(result.success).toBe(false)
  })

  it('должен принимать slug только из цифр', () => {
    const result = slugSchema.safeParse('123')
    expect(result.success).toBe(true)
  })
})

describe('requiredImageIdSchema', () => {
  it('должен принимать непустую строку', () => {
    const result = requiredImageIdSchema.safeParse('cuid12345')
    expect(result.success).toBe(true)
  })

  it('должен отклонять пустую строку', () => {
    const result = requiredImageIdSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('должен отклонять undefined', () => {
    const result = requiredImageIdSchema.safeParse(undefined)
    expect(result.success).toBe(false)
  })

  it('должен отклонять null', () => {
    const result = requiredImageIdSchema.safeParse(null)
    expect(result.success).toBe(false)
  })
})

describe('optionalImageIdSchema', () => {
  it('должен принимать непустую строку', () => {
    const result = optionalImageIdSchema.safeParse('cuid12345')
    expect(result.success).toBe(true)
    expect(result.data).toBe('cuid12345')
  })

  it('должен принимать undefined', () => {
    const result = optionalImageIdSchema.safeParse(undefined)
    expect(result.success).toBe(true)
    expect(result.data).toBeUndefined()
  })

  it('должен трансформировать пустую строку в null', () => {
    const result = optionalImageIdSchema.safeParse('')
    expect(result.success).toBe(true)
    expect(result.data).toBeNull()
  })
})

describe('optionalSeoStringSchema', () => {
  it('должен принимать непустую строку', () => {
    const result = optionalSeoStringSchema.safeParse('SEO описание страницы')
    expect(result.success).toBe(true)
    expect(result.data).toBe('SEO описание страницы')
  })

  it('должен принимать undefined', () => {
    const result = optionalSeoStringSchema.safeParse(undefined)
    expect(result.success).toBe(true)
  })

  it('должен принимать пустую строку', () => {
    const result = optionalSeoStringSchema.safeParse('')
    expect(result.success).toBe(true)
    expect(result.data).toBe('')
  })
})
