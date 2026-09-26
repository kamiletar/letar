import { getOptionText as coreGetOptionText } from '@letar/forms-core/uikit'
import { describe, expect, it } from 'vitest'

import { getOptionText } from './index'

describe('публичный API @letar/forms', () => {
  it('getOptionText доступен из барреля и совпадает с ядром', () => {
    expect(getOptionText).toBe(coreGetOptionText)
  })

  it('getOptionText отдаёт строку для окна правки: textValue, строковая подпись, значение', () => {
    expect(getOptionText({ label: 'Метка', textValue: 'Текст', value: 'v' })).toBe('Текст')
    expect(getOptionText({ label: 'Метка', value: 'v' })).toBe('Метка')
    expect(getOptionText({ label: { type: 'em' }, value: 7 })).toBe('7')
  })
})
