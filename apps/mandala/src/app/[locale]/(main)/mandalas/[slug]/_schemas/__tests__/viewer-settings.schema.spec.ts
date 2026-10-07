import { describe, expect, it } from 'vitest'

import { defaultViewerSettings, ViewerSettingsSchema } from '../viewer-settings.schema'

describe('ViewerSettingsSchema — режим дыхания всегда включён', () => {
  it('по умолчанию дыхание включено', () => {
    expect(ViewerSettingsSchema.parse({}).breathingEnabled).toBe(true)
    expect(defaultViewerSettings.breathingEnabled).toBe(true)
  })

  it('сохранённое false из старых настроек превращается в true', () => {
    const parsed = ViewerSettingsSchema.safeParse({ breathingEnabled: false })

    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.breathingEnabled).toBe(true)
  })
})
