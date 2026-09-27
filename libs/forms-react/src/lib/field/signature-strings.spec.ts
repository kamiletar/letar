import { describe, expect, it } from 'vitest'

import { resolveSignatureString } from './signature-strings'

const i18n = (locale: string, t: (key: string) => string = (key) => key) => ({ t, locale, enabled: true })

describe('resolveSignatureString', () => {
  it('без провайдера — английский (контракт Chakra-скина)', () => {
    expect(resolveSignatureString(null, 'formSignature.placeholder')).toBe('Sign here')
  })

  it('без провайдера скин выбирает язык сам (shadcn — русский)', () => {
    expect(resolveSignatureString(null, 'formSignature.placeholder', 'ru')).toBe('Подпишите здесь')
    expect(resolveSignatureString(null, 'formSignature.drawTab', 'ru')).toBe('Рисовать')
    expect(resolveSignatureString(null, 'formSignature.typedTab', 'ru')).toBe('Ввести текст')
    expect(resolveSignatureString(null, 'formSignature.typedPlaceholder', 'ru')).toBe('Введите ваше имя...')
    expect(resolveSignatureString(null, 'formSignature.ariaLabel', 'ru')).toBe('Область подписи')
  })

  it('провайдер сильнее языка «без провайдера»', () => {
    expect(resolveSignatureString(i18n('en'), 'formSignature.placeholder', 'ru')).toBe('Sign here')
    expect(resolveSignatureString(i18n('ru'), 'formSignature.placeholder')).toBe('Подпишите здесь')
  })

  it('перевод приложения по ключу сильнее словаря', () => {
    const t = (key: string) => (key === 'formSignature.placeholder' ? 'Ваша подпись' : key)
    expect(resolveSignatureString(i18n('en', t), 'formSignature.placeholder', 'ru')).toBe('Ваша подпись')
  })
})
