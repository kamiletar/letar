import { describe, expect, it } from 'vitest'
import { ClientProfileEditSchema } from '../client-profile.schema'

describe('ClientProfileEditSchema', () => {
  it('принимает минимальные валидные данные (только имя)', () => {
    const result = ClientProfileEditSchema.safeParse({
      name: 'Иван Петров',
    })
    expect(result.success).toBe(true)
  })

  it('принимает все поля', () => {
    const result = ClientProfileEditSchema.safeParse({
      name: 'Иван Петров',
      phoneNumber: '+7 999 123-45-67',
      image: '/api/files/avatars/test.jpg',
      gender: 'MALE',
      birthdate: '1990-06-15',
      phone: '+7 999 123-45-67',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет короткое имя', () => {
    const result = ClientProfileEditSchema.safeParse({ name: 'И' })
    expect(result.success).toBe(false)
  })

  it('отклоняет слишком длинное имя (>100)', () => {
    const result = ClientProfileEditSchema.safeParse({ name: 'А'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('принимает пустую строку для phoneNumber', () => {
    const result = ClientProfileEditSchema.safeParse({
      name: 'Иван',
      phoneNumber: '',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет некорректный телефон', () => {
    const result = ClientProfileEditSchema.safeParse({
      name: 'Иван',
      phoneNumber: 'abc',
    })
    expect(result.success).toBe(false)
  })

  it('принимает пустую строку для gender', () => {
    const result = ClientProfileEditSchema.safeParse({
      name: 'Иван',
      gender: '',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет невалидный gender', () => {
    const result = ClientProfileEditSchema.safeParse({
      name: 'Иван',
      gender: 'INVALID',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет невалидный формат birthdate', () => {
    const result = ClientProfileEditSchema.safeParse({
      name: 'Иван',
      birthdate: '15.06.1990',
    })
    expect(result.success).toBe(false)
  })

  it('принимает корректный формат birthdate', () => {
    const result = ClientProfileEditSchema.safeParse({
      name: 'Иван',
      birthdate: '1990-06-15',
    })
    expect(result.success).toBe(true)
  })

  it('принимает null для image', () => {
    const result = ClientProfileEditSchema.safeParse({
      name: 'Иван',
      image: null,
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет невалидный URL аватара', () => {
    const result = ClientProfileEditSchema.safeParse({
      name: 'Иван',
      image: 'https://evil.com/hack.jpg',
    })
    expect(result.success).toBe(false)
  })

  it('strip удаляет лишние поля', () => {
    const result = ClientProfileEditSchema.safeParse({
      name: 'Иван',
      $ACTION_ID: 'xxx',
      extraField: 'hack',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('$ACTION_ID')
      expect(result.data).not.toHaveProperty('extraField')
    }
  })
})
