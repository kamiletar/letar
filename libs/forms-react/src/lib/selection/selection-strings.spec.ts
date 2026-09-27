import { describe, expect, it } from 'vitest'

import { resolveSelectionString } from './selection-strings'

const i18n = (locale: string, t: (key: string) => string = (key) => key) => ({ t, locale, enabled: true })

describe('resolveSelectionString', () => {
  it('без провайдера — английский (контракт Chakra-скина)', () => {
    expect(resolveSelectionString(null, 'formSelection.clear')).toBe('Clear')
  })

  it('без провайдера скин выбирает язык сам (shadcn — русский)', () => {
    expect(resolveSelectionString(null, 'formSelection.clear', 'ru')).toBe('Очистить')
    expect(resolveSelectionString(null, 'formSelection.search.aria', 'ru')).toBe('Поиск по списку')
  })

  it('провайдер сильнее языка «без провайдера»', () => {
    expect(resolveSelectionString(i18n('en'), 'formSelection.clear', 'ru')).toBe('Clear')
    expect(resolveSelectionString(i18n('ru'), 'formSelection.clear')).toBe('Очистить')
  })

  it('перевод приложения по ключу сильнее словаря', () => {
    const t = (key: string) => (key === 'formSelection.clear' ? 'Сбросить' : key)
    expect(resolveSelectionString(i18n('en', t), 'formSelection.clear', 'ru')).toBe('Сбросить')
  })
})
