import { describe, expect, it } from 'vitest'

import { resolvePasswordStrengthString } from './field-password-strength-strings'

const i18n = (locale: string, t: (key: string) => string = (key) => key) => ({ t, locale, enabled: true })

describe('resolvePasswordStrengthString', () => {
  it('без провайдера — английский (контракт Chakra-скина)', () => {
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.requirement.minLength8')).toBe(
      'Minimum 8 characters',
    )
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.strength.weak')).toBe('Weak')
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.strengthLabel')).toBe('Strength')
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.showPassword')).toBe('Show password')
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.hidePassword')).toBe('Hide password')
  })

  it('без провайдера скин выбирает язык сам (shadcn — русский, как был хардкод)', () => {
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.requirement.minLength8', 'ru')).toBe(
      'Минимум 8 символов',
    )
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.requirement.uppercase', 'ru')).toBe(
      'Хотя бы одна заглавная буква',
    )
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.requirement.lowercase', 'ru')).toBe(
      'Хотя бы одна строчная буква',
    )
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.requirement.number', 'ru')).toBe(
      'Хотя бы одна цифра',
    )
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.requirement.special', 'ru')).toBe(
      'Хотя бы один спецсимвол (!@#$%^&*)',
    )
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.strength.weak', 'ru')).toBe('Слабый')
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.strength.medium', 'ru')).toBe('Средний')
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.strength.good', 'ru')).toBe('Хороший')
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.strength.strong', 'ru')).toBe('Сильный')
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.strengthLabel', 'ru')).toBe('Надёжность')
    expect(resolvePasswordStrengthString(null, 'formPasswordStrength.togglePasswordVisibility', 'ru')).toBe(
      'Показать/скрыть пароль',
    )
  })

  it('провайдер сильнее языка «без провайдера»', () => {
    expect(resolvePasswordStrengthString(i18n('en'), 'formPasswordStrength.strength.weak', 'ru')).toBe('Weak')
    expect(resolvePasswordStrengthString(i18n('ru'), 'formPasswordStrength.strength.weak')).toBe('Слабый')
  })

  it('перевод приложения по ключу сильнее словаря', () => {
    const t = (key: string) => (key === 'formPasswordStrength.strengthLabel' ? 'Надёжность пароля' : key)
    expect(resolvePasswordStrengthString(i18n('en', t), 'formPasswordStrength.strengthLabel', 'ru')).toBe(
      'Надёжность пароля',
    )
  })
})
