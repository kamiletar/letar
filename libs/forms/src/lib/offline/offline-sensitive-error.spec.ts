import { describe, expect, it } from 'vitest'
import {
  OfflineSensitiveFieldsError,
  resolveSensitiveFieldsOfflineText,
  SENSITIVE_FIELDS_OFFLINE_CODE,
  SENSITIVE_FIELDS_OFFLINE_KEY,
} from './offline-sensitive-error'

describe('отказ офлайн-очереди для форм с чувствительными полями', () => {
  it('без i18n — английский текст по умолчанию', () => {
    expect(resolveSensitiveFieldsOfflineText(null)).toContain('sensitive data')
  })

  it('по локали провайдера — русский встроенный текст', () => {
    expect(resolveSensitiveFieldsOfflineText({ t: (key) => key, locale: 'ru-RU', enabled: false })).toContain(
      'чувствительные данные',
    )
  })

  it('ключ провайдера перекрывает встроенный текст', () => {
    const t = (key: string) => (key === SENSITIVE_FIELDS_OFFLINE_KEY ? 'Нужна сеть' : key)
    expect(resolveSensitiveFieldsOfflineText({ t, locale: 'ru', enabled: true })).toBe('Нужна сеть')
  })

  it('ошибка типизирована: код и instanceof, не только текст', () => {
    const error = new OfflineSensitiveFieldsError('x')
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe(SENSITIVE_FIELDS_OFFLINE_CODE)
    expect(error.name).toBe('OfflineSensitiveFieldsError')
  })
})
