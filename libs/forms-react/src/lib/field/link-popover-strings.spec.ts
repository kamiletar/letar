import { describe, expect, it } from 'vitest'

import { resolveLinkPopoverString } from './link-popover-strings'

const i18n = (locale: string, t: (key: string) => string = (key) => key) => ({ t, locale, enabled: true })

describe('resolveLinkPopoverString', () => {
  it('без провайдера — английский (контракт Chakra-скина)', () => {
    expect(resolveLinkPopoverString(null, 'formLinkPopover.placeholder')).toBe('https://example.com')
    expect(resolveLinkPopoverString(null, 'formLinkPopover.apply')).toBe('Apply')
  })

  it('без провайдера скин выбирает язык сам', () => {
    expect(resolveLinkPopoverString(null, 'formLinkPopover.remove', 'ru')).toBe('Убрать')
    expect(resolveLinkPopoverString(null, 'formLinkPopover.cancel', 'ru')).toBe('Отмена')
    expect(resolveLinkPopoverString(null, 'formLinkPopover.apply', 'ru')).toBe('Применить')
  })

  it('провайдер сильнее языка «без провайдера»', () => {
    expect(resolveLinkPopoverString(i18n('en'), 'formLinkPopover.cancel', 'ru')).toBe('Cancel')
    expect(resolveLinkPopoverString(i18n('ru'), 'formLinkPopover.cancel')).toBe('Отмена')
  })

  it('перевод приложения по ключу сильнее словаря', () => {
    const t = (key: string) => (key === 'formLinkPopover.apply' ? 'Сохранить' : key)
    expect(resolveLinkPopoverString(i18n('en', t), 'formLinkPopover.apply', 'ru')).toBe('Сохранить')
  })
})
