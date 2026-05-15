import { describe, expect, it } from 'vitest'
describe('FormDependsOn', () => {
  it('exports component', async () => {
    const mod = await import('./form-depends-on')
    expect(typeof mod.FormDependsOn).toBe('function')
  })
})
