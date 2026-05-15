import { describe, expect, it } from 'vitest'
import { ClientFormSchema } from '../client-form.schema'

describe('ClientFormSchema', () => {
  it('принимает минимальные валидные данные', () => {
    const result = ClientFormSchema.safeParse({
      name: 'Иван Петров',
      email: 'ivan@mail.ru',
    })
    expect(result.success).toBe(true)
  })

  it('принимает все поля', () => {
    const result = ClientFormSchema.safeParse({
      name: 'Иван Петров',
      email: 'ivan@mail.ru',
      phone: '+7 999 123-45-67',
      gender: 'MALE',
      birthdate: '1990-06-15',
      mainRequest: 'Тревожность',
      notes: 'Первичная консультация',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет пустое имя', () => {
    const result = ClientFormSchema.safeParse({
      name: '',
      email: 'ivan@mail.ru',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет невалидный email', () => {
    const result = ClientFormSchema.safeParse({
      name: 'Иван',
      email: 'not-email',
    })
    expect(result.success).toBe(false)
  })

  it('strip удаляет лишние поля', () => {
    const result = ClientFormSchema.safeParse({
      name: 'Иван',
      email: 'ivan@mail.ru',
      $ACTION_ID: 'xxx',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('$ACTION_ID')
    }
  })
})
