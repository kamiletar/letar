import { join } from 'node:path'

import { findUndeclaredMetadataRoutes } from '@letar/i18n-proxy'
import { describe, expect, it } from 'vitest'

describe('proxy matcher', () => {
  it('перечисляет все metadata-роуты приложения явно (иначе next-intl middleware даст на них 404)', () => {
    const appDir = join(__dirname, 'app')
    // должно совпадать с metadataRoutes в proxy.ts
    const declared = ['icon', 'apple-icon']

    expect(findUndeclaredMetadataRoutes(appDir, declared)).toEqual([])
  })
})
