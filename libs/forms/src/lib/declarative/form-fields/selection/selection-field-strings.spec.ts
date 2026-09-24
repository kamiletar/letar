import type { TranslateFunction } from '@letar/forms-core/i18n'
import { describe, expect, it, vi } from 'vitest'

import { resolveSelectionString } from './selection-field-strings'

/** Контекст `FormI18nProvider` в том виде, в каком его отдаёт `useFormI18n` */
function i18nContext(locale: string, t?: TranslateFunction) {
  return {
    t: t ?? ((key: string) => key),
    locale,
    enabled: !!t,
  }
}

describe('resolveSelectionString', () => {
  describe('без FormI18nProvider', () => {
    it('остаётся на английском — провайдер опционален, поведение прежнее', () => {
      expect(resolveSelectionString(null, 'formSelection.combobox.placeholder')).toBe('Search...')
      expect(resolveSelectionString(null, 'formSelection.combobox.loadingMessage')).toBe('Loading...')
      expect(resolveSelectionString(null, 'formSelection.combobox.emptyMessage')).toBe('Nothing found')
      expect(resolveSelectionString(null, 'formSelection.autocomplete.placeholder')).toBe('Start typing...')
      expect(resolveSelectionString(null, 'formSelection.autocomplete.loadingMessage')).toBe('Loading...')
      expect(resolveSelectionString(null, 'formSelection.autocomplete.emptyMessage')).toBe('No suggestions')
      expect(resolveSelectionString(null, 'formSelection.createOption')).toBe('Add')
    })
  })

  describe('встроенный словарь по locale (провайдер без своего t)', () => {
    it('переводит глагол пункта «Добавить» на русский', () => {
      expect(resolveSelectionString(i18nContext('ru'), 'formSelection.createOption')).toBe('Добавить')
    })

    it('переводит строки Combobox на русский', () => {
      expect(resolveSelectionString(i18nContext('ru'), 'formSelection.combobox.placeholder')).toBe('Поиск...')
      expect(resolveSelectionString(i18nContext('ru'), 'formSelection.combobox.loadingMessage')).toBe('Загрузка...')
      expect(resolveSelectionString(i18nContext('ru'), 'formSelection.combobox.emptyMessage')).toBe(
        'Ничего не найдено',
      )
    })

    it('переводит строки Autocomplete на русский', () => {
      expect(resolveSelectionString(i18nContext('ru'), 'formSelection.autocomplete.placeholder')).toBe(
        'Начните вводить...',
      )
      expect(resolveSelectionString(i18nContext('ru'), 'formSelection.autocomplete.emptyMessage')).toBe(
        'Нет подсказок',
      )
    })

    it('понимает локаль с регионом', () => {
      expect(resolveSelectionString(i18nContext('ru-RU'), 'formSelection.combobox.placeholder')).toBe('Поиск...')
    })

    it('откатывается на английский для локали без встроенного словаря', () => {
      expect(resolveSelectionString(i18nContext('de'), 'formSelection.combobox.placeholder')).toBe('Search...')
    })
  })

  describe('перевод приложения', () => {
    it('побеждает встроенный словарь', () => {
      const t = vi.fn((key: string) => (key === 'formSelection.combobox.placeholder' ? 'Найти...' : key))

      expect(resolveSelectionString(i18nContext('ru', t), 'formSelection.combobox.placeholder')).toBe('Найти...')
      expect(t).toHaveBeenCalledWith('formSelection.combobox.placeholder', undefined)
    })

    it('откатывается на встроенный словарь, если перевода под ключом нет', () => {
      // next-intl при отсутствии перевода возвращает сам ключ
      const t = (key: string) => key

      expect(resolveSelectionString(i18nContext('ru', t), 'formSelection.combobox.placeholder')).toBe('Поиск...')
    })
  })
})
