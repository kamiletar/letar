import type { TranslateFunction } from '@letar/forms-core/i18n'
import { describe, expect, it, vi } from 'vitest'

import { resolveFieldDefaultString } from './field-default-strings'

/** Контекст `FormI18nProvider` в том виде, в каком его отдаёт `useFormI18n` */
function i18nContext(locale: string, t?: TranslateFunction) {
  return {
    t: t ?? ((key: string) => key),
    locale,
    enabled: !!t,
  }
}

describe('resolveFieldDefaultString', () => {
  describe('без FormI18nProvider', () => {
    it('остаётся на английском — провайдер опционален, поведение прежнее', () => {
      expect(resolveFieldDefaultString(null, 'formField.address.placeholder')).toBe('Start typing address...')
      expect(resolveFieldDefaultString(null, 'formField.city.placeholder')).toBe('Enter city')
      expect(resolveFieldDefaultString(null, 'formField.signature.placeholder')).toBe('Sign here')
      expect(resolveFieldDefaultString(null, 'formField.editable.placeholder')).toBe('Click to edit')
      expect(resolveFieldDefaultString(null, 'formField.passwordStrength.placeholder')).toBe('Enter password')
      expect(resolveFieldDefaultString(null, 'formField.richText.placeholder')).toBe('Start typing...')
      expect(resolveFieldDefaultString(null, 'formField.duration.minutesPlaceholder')).toBe('min')
    })
  })

  describe('встроенный словарь по locale (провайдер без своего t)', () => {
    it('переводит строки полей на русский', () => {
      expect(resolveFieldDefaultString(i18nContext('ru'), 'formField.address.placeholder')).toBe(
        'Начните вводить адрес...',
      )
      expect(resolveFieldDefaultString(i18nContext('ru'), 'formField.city.placeholder')).toBe('Введите город')
      expect(resolveFieldDefaultString(i18nContext('ru'), 'formField.signature.placeholder')).toBe(
        'Распишитесь здесь',
      )
      expect(resolveFieldDefaultString(i18nContext('ru'), 'formField.editable.placeholder')).toBe(
        'Нажмите, чтобы изменить',
      )
      expect(resolveFieldDefaultString(i18nContext('ru'), 'formField.passwordStrength.placeholder')).toBe(
        'Введите пароль',
      )
      expect(resolveFieldDefaultString(i18nContext('ru'), 'formField.richText.placeholder')).toBe(
        'Начните вводить...',
      )
      expect(resolveFieldDefaultString(i18nContext('ru'), 'formField.duration.minutesPlaceholder')).toBe('мин')
    })

    it('понимает локаль с регионом', () => {
      expect(resolveFieldDefaultString(i18nContext('ru-RU'), 'formField.city.placeholder')).toBe('Введите город')
    })

    it('откатывается на английский для локали без встроенного словаря', () => {
      expect(resolveFieldDefaultString(i18nContext('de'), 'formField.city.placeholder')).toBe('Enter city')
    })
  })

  describe('перевод приложения', () => {
    it('побеждает встроенный словарь', () => {
      const t = vi.fn((key: string) => (key === 'formField.city.placeholder' ? 'Ваш город' : key))

      expect(resolveFieldDefaultString(i18nContext('ru', t), 'formField.city.placeholder')).toBe('Ваш город')
      expect(t).toHaveBeenCalledWith('formField.city.placeholder', undefined)
    })

    it('откатывается на встроенный словарь, если перевода под ключом нет', () => {
      // next-intl при отсутствии перевода возвращает сам ключ
      const t = (key: string) => key

      expect(resolveFieldDefaultString(i18nContext('ru', t), 'formField.city.placeholder')).toBe('Введите город')
    })
  })
})
