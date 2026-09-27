import { describe, expect, it } from 'vitest'

import { resolveToolbarString } from './toolbar-strings'

const i18n = (locale: string, t: (key: string) => string = (key) => key) => ({ t, locale, enabled: true })

describe('resolveToolbarString', () => {
  it('без провайдера — английский (контракт Chakra-скина)', () => {
    expect(resolveToolbarString(null, 'formToolbar.bold')).toBe('Bold')
    expect(resolveToolbarString(null, 'formToolbar.image')).toBe('Insert image')
    expect(resolveToolbarString(null, 'formToolbar.linkAdd')).toBe('Add link')
    expect(resolveToolbarString(null, 'formToolbar.linkRemove')).toBe('Remove link')
  })

  it('без провайдера скин выбирает язык сам (shadcn — русский)', () => {
    expect(resolveToolbarString(null, 'formToolbar.bold', 'ru')).toBe('Полужирный')
    expect(resolveToolbarString(null, 'formToolbar.italic', 'ru')).toBe('Курсив')
    expect(resolveToolbarString(null, 'formToolbar.underline', 'ru')).toBe('Подчёркнутый')
    expect(resolveToolbarString(null, 'formToolbar.strike', 'ru')).toBe('Зачёркнутый')
    expect(resolveToolbarString(null, 'formToolbar.code', 'ru')).toBe('Код')
    expect(resolveToolbarString(null, 'formToolbar.heading1', 'ru')).toBe('Заголовок 1')
    expect(resolveToolbarString(null, 'formToolbar.heading2', 'ru')).toBe('Заголовок 2')
    expect(resolveToolbarString(null, 'formToolbar.heading3', 'ru')).toBe('Заголовок 3')
    expect(resolveToolbarString(null, 'formToolbar.bulletList', 'ru')).toBe('Маркированный список')
    expect(resolveToolbarString(null, 'formToolbar.orderedList', 'ru')).toBe('Нумерованный список')
    expect(resolveToolbarString(null, 'formToolbar.blockquote', 'ru')).toBe('Цитата')
    expect(resolveToolbarString(null, 'formToolbar.link', 'ru')).toBe('Ссылка')
    expect(resolveToolbarString(null, 'formToolbar.linkAdd', 'ru')).toBe('Добавить ссылку')
    expect(resolveToolbarString(null, 'formToolbar.linkRemove', 'ru')).toBe('Убрать ссылку')
    expect(resolveToolbarString(null, 'formToolbar.undo', 'ru')).toBe('Отменить')
    expect(resolveToolbarString(null, 'formToolbar.redo', 'ru')).toBe('Повторить')
    expect(resolveToolbarString(null, 'formToolbar.image', 'ru')).toBe('Вставить изображение')
  })

  it('провайдер сильнее языка «без провайдера»', () => {
    expect(resolveToolbarString(i18n('en'), 'formToolbar.bold', 'ru')).toBe('Bold')
    expect(resolveToolbarString(i18n('ru'), 'formToolbar.bold')).toBe('Полужирный')
  })

  it('перевод приложения по ключу сильнее словаря', () => {
    const t = (key: string) => (key === 'formToolbar.bold' ? 'Жирный текст' : key)
    expect(resolveToolbarString(i18n('en', t), 'formToolbar.bold', 'ru')).toBe('Жирный текст')
  })
})
