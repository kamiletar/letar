import { describe, expect, it } from 'vitest'
import { createBuiltinTranslateFunction } from './builtin-error-translations'

describe('createBuiltinTranslateFunction', () => {
  it('переводит ключ на русский с интерполяцией параметров', () => {
    const t = createBuiltinTranslateFunction('ru')

    expect(t('validation.too_small.string', { minimum: 2 })).toBe('Минимум 2 символов')
    expect(t('validation.invalid_format.email')).toBe('Некорректный email')
  })

  it('переводит ключ на английский', () => {
    const t = createBuiltinTranslateFunction('en')

    expect(t('validation.too_small.string', { minimum: 2 })).toBe('Minimum 2 characters')
  })

  it('возвращает ключ как есть, если перевода нет (next-intl-совместимое поведение)', () => {
    const t = createBuiltinTranslateFunction('ru')

    expect(t('validation.unknown_code')).toBe('validation.unknown_code')
  })

  it('резолвит региональный код локали к базовому языку (ru-RU → ru)', () => {
    const t = createBuiltinTranslateFunction('ru-RU')

    expect(t('validation.invalid_format.url')).toBe('Некорректный URL')
  })

  it('откатывается на русский для неизвестной локали', () => {
    const t = createBuiltinTranslateFunction('fr')

    expect(t('validation.invalid_type')).toBe('Неверный тип данных')
  })

  it('передаёт custom-сообщение из .refine() как есть', () => {
    const t = createBuiltinTranslateFunction('ru')

    expect(t('validation.custom', { message: 'Пароли не совпадают' })).toBe('Пароли не совпадают')
  })
})
