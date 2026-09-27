import { describe, expect, it } from 'vitest'

import { resolveFieldPlaceholderString } from './field-placeholder-strings'

const i18n = (locale: string, t: (key: string) => string = (key) => key) => ({ t, locale, enabled: true })

describe('resolveFieldPlaceholderString', () => {
  it('без провайдера — английский (контракт Chakra-скина)', () => {
    expect(resolveFieldPlaceholderString(null, 'formFieldPlaceholder.address')).toBe('Start typing address...')
    expect(resolveFieldPlaceholderString(null, 'formFieldPlaceholder.passwordStrength')).toBe('Enter password')
  })

  it('без провайдера скин выбирает язык сам (shadcn — русский)', () => {
    expect(resolveFieldPlaceholderString(null, 'formFieldPlaceholder.address', 'ru')).toBe('Начните вводить адрес...')
    expect(resolveFieldPlaceholderString(null, 'formFieldPlaceholder.city', 'ru')).toBe('Введите город...')
    expect(resolveFieldPlaceholderString(null, 'formFieldPlaceholder.passwordStrength', 'ru')).toBe('Введите пароль')
    expect(resolveFieldPlaceholderString(null, 'formFieldPlaceholder.richText', 'ru')).toBe('Начните вводить...')
    expect(resolveFieldPlaceholderString(null, 'formFieldPlaceholder.editable', 'ru')).toBe(
      'Нажмите для редактирования',
    )
  })

  it('провайдер сильнее языка «без провайдера»', () => {
    expect(resolveFieldPlaceholderString(i18n('en'), 'formFieldPlaceholder.city', 'ru')).toBe('Enter city')
    expect(resolveFieldPlaceholderString(i18n('ru'), 'formFieldPlaceholder.city')).toBe('Введите город...')
  })

  it('перевод приложения по ключу сильнее словаря', () => {
    const t = (key: string) => (key === 'formFieldPlaceholder.city' ? 'Ваш город' : key)
    expect(resolveFieldPlaceholderString(i18n('en', t), 'formFieldPlaceholder.city', 'ru')).toBe('Ваш город')
  })
})
