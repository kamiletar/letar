import type { TranslateFunction, TranslateParams } from '@letar/forms-core/i18n'
import { describe, expect, it, vi } from 'vitest'

import { resolveMinCharsHint } from './min-chars-hint'

/** Контекст `FormI18nProvider` в том виде, в каком его отдаёт `useFormI18n` */
function i18nContext(locale: string, t?: TranslateFunction) {
  return {
    t: t ?? ((key: string) => key),
    locale,
    enabled: !!t,
  }
}

describe('resolveMinCharsHint', () => {
  describe('без FormI18nProvider', () => {
    it('остаётся на английском — провайдер опционален, поведение прежнее', () => {
      expect(resolveMinCharsHint(null, 3)).toBe('Enter at least 3 characters')
    })

    it('склоняет существительное при minChars = 1 (дефолт обоих полей)', () => {
      expect(resolveMinCharsHint(null, 1)).toBe('Enter at least 1 character')
    })
  })

  describe('встроенный словарь по locale (провайдер без своего t)', () => {
    it('переводит на русский', () => {
      expect(resolveMinCharsHint(i18nContext('ru'), 3)).toBe('Введите минимум 3 символа')
    })

    it('склоняет «символ» по правилам русского языка', () => {
      expect(resolveMinCharsHint(i18nContext('ru'), 1)).toBe('Введите минимум 1 символ')
      expect(resolveMinCharsHint(i18nContext('ru'), 2)).toBe('Введите минимум 2 символа')
      expect(resolveMinCharsHint(i18nContext('ru'), 5)).toBe('Введите минимум 5 символов')
    })

    it('понимает локаль с регионом', () => {
      expect(resolveMinCharsHint(i18nContext('ru-RU'), 3)).toBe('Введите минимум 3 символа')
    })

    it('откатывается на английский для локали без встроенного словаря', () => {
      expect(resolveMinCharsHint(i18nContext('de'), 3)).toBe('Enter at least 3 characters')
    })
  })

  describe('перевод приложения', () => {
    it('побеждает встроенный словарь и получает minChars параметром', () => {
      const t = vi.fn((key: string, params?: TranslateParams) =>
        key === 'formSelection.minCharsHint' ? `Ещё ${params?.minChars} символа, пожалуйста` : key
      )

      expect(resolveMinCharsHint(i18nContext('ru', t), 3)).toBe('Ещё 3 символа, пожалуйста')
      expect(t).toHaveBeenCalledWith('formSelection.minCharsHint', { minChars: 3 })
    })

    it('откатывается на встроенный словарь, если перевода под ключом нет', () => {
      // next-intl при отсутствии перевода возвращает сам ключ
      const t = (key: string) => key

      expect(resolveMinCharsHint(i18nContext('ru', t), 3)).toBe('Введите минимум 3 символа')
    })
  })
})
