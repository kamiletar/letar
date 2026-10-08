import { createTranslator } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import { createFormTranslate } from '../form-translate'

function makeTranslate(onError: (error: unknown) => void) {
  const nextIntlT = createTranslator({
    locale: 'ru',
    messages: { formErrors: { title: 'Исправьте ошибки' }, greeting: 'Привет, {name}' },
    onError,
  })
  return createFormTranslate(nextIntlT as never)
}

describe('createFormTranslate', () => {
  it('отдаёт перевод приложения, если ключ есть в messages', () => {
    const t = makeTranslate(vi.fn())

    expect(t('formErrors.title')).toBe('Исправьте ошибки')
  })

  it('передаёт параметры интерполяции', () => {
    const t = makeTranslate(vi.fn())

    expect(t('greeting', { name: 'Ким' })).toBe('Привет, Ким')
  })

  it('на отсутствующий ключ возвращает сам ключ и не вызывает onError next-intl (нет MISSING_MESSAGE)', () => {
    const onError = vi.fn()
    const t = makeTranslate(onError)

    // Сам ключ — библиотека форм воспринимает это как «перевода нет» и берёт встроенный словарь
    expect(t('formDirtyGuard.message')).toBe('formDirtyGuard.message')
    expect(onError).not.toHaveBeenCalled()
  })

  it('если сообщение не отформатировалось (нет параметра), возвращает ключ, а не бросает', () => {
    const t = makeTranslate(vi.fn())

    expect(t('greeting')).toBe('greeting')
  })
})
