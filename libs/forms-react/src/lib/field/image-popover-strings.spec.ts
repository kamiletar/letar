import { describe, expect, it } from 'vitest'

import { resolveImagePopoverString } from './image-popover-strings'

const i18n = (locale: string, t: (key: string) => string = (key) => key) => ({ t, locale, enabled: true })

describe('resolveImagePopoverString', () => {
  it('без провайдера — английский (контракт Chakra-скина)', () => {
    expect(resolveImagePopoverString(null, 'formImagePopover.dropHint')).toBe('Drag image here')
    expect(resolveImagePopoverString(null, 'formImagePopover.errorGeneric')).toBe('Upload error')
  })

  it('без провайдера скин выбирает язык сам', () => {
    expect(resolveImagePopoverString(null, 'formImagePopover.dropHint', 'ru')).toBe('Перетащите изображение сюда')
    expect(resolveImagePopoverString(null, 'formImagePopover.errorNotImage', 'ru')).toBe(
      'Файл должен быть изображением',
    )
  })

  it('шаблон размера — с плейсхолдером {size}, интерполяция на стороне вызывающего', () => {
    expect(resolveImagePopoverString(null, 'formImagePopover.sizeHint')).toBe('PNG, JPG, WEBP up to {size}MB')
    expect(resolveImagePopoverString(null, 'formImagePopover.errorSizeExceeded', 'ru')).toBe(
      'Размер файла не должен превышать {size}МБ',
    )
  })

  it('провайдер сильнее языка «без провайдера»', () => {
    expect(resolveImagePopoverString(i18n('en'), 'formImagePopover.cancel', 'ru')).toBe('Cancel')
    expect(resolveImagePopoverString(i18n('ru'), 'formImagePopover.cancel')).toBe('Отмена')
  })

  it('перевод приложения по ключу сильнее словаря', () => {
    const t = (key: string) => (key === 'formImagePopover.tryAgain' ? 'Повторить' : key)
    expect(resolveImagePopoverString(i18n('en', t), 'formImagePopover.tryAgain', 'ru')).toBe('Повторить')
  })
})
