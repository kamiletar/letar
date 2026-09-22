import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_STATIC_TEXT_LOCALE, resolveStaticFormText, type StaticTextI18nContext } from './resolve-static-text'
import type { TranslateParams } from './types'

function i18nContext(locale: string, t?: (key: string, params?: TranslateParams) => string): StaticTextI18nContext {
  return {
    t: t ?? ((key: string) => key),
    locale,
    enabled: !!t,
  }
}

describe('resolveStaticFormText', () => {
  it('без i18n резолвит builtin по DEFAULT_STATIC_TEXT_LOCALE', () => {
    const builtin = vi.fn((locale: string) => `builtin:${locale}`)

    expect(resolveStaticFormText(null, 'some.key', builtin)).toBe(`builtin:${DEFAULT_STATIC_TEXT_LOCALE}`)
    expect(builtin).toHaveBeenCalledWith(DEFAULT_STATIC_TEXT_LOCALE)
  })

  it('без своего t в провайдере откатывается на builtin по фактической locale', () => {
    const builtin = (locale: string) => `builtin:${locale}`

    expect(resolveStaticFormText(i18nContext('ru'), 'some.key', builtin)).toBe('builtin:ru')
  })

  it('перевод приложения побеждает builtin', () => {
    const t = (key: string) => (key === 'some.key' ? 'translated' : key)
    const builtin = () => 'builtin'

    expect(resolveStaticFormText(i18nContext('ru', t), 'some.key', builtin)).toBe('translated')
  })

  it('откатывается на builtin, если t() вернул сам ключ (next-intl без перевода)', () => {
    const t = (key: string) => key
    const builtin = (locale: string) => `builtin:${locale}`

    expect(resolveStaticFormText(i18nContext('ru', t), 'some.key', builtin)).toBe('builtin:ru')
  })

  it('передаёт params в t() для интерполяции', () => {
    const t = vi.fn((key: string, params?: TranslateParams) => (params ? `${key}:${JSON.stringify(params)}` : key))
    const builtin = () => 'builtin'

    resolveStaticFormText(i18nContext('ru', t), 'some.key', builtin, { count: 3 })

    expect(t).toHaveBeenCalledWith('some.key', { count: 3 })
  })

  it('builtin без собственного словаря может игнорировать locale и всегда отдавать один fallback', () => {
    const fallback = 'русский дефолт из пропов'

    expect(resolveStaticFormText(null, 'some.key', () => fallback)).toBe(fallback)
    expect(resolveStaticFormText(i18nContext('en'), 'some.key', () => fallback)).toBe(fallback)
  })
})
