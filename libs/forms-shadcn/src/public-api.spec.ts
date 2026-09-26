import { getOptionText as coreGetOptionText } from '@letar/forms-core/uikit'
import { describe, expect, it } from 'vitest'

import { getOptionText } from './index'

describe('публичный API @letar/forms-shadcn', () => {
  it('getOptionText доступен из барреля и совпадает с ядром', () => {
    expect(getOptionText).toBe(coreGetOptionText)
  })
})
