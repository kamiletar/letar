import { describe, expect, it } from 'vitest'

import { system } from './index'

describe('theme', () => {
  it('должна экспортировать систему', () => {
    expect(system).toBeDefined()
  })

  it('система должна иметь theme token', () => {
    expect(system.token).toBeDefined()
  })
})
