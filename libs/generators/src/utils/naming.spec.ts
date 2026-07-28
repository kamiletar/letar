import { describe, expect, it } from 'vitest'
import { toCamelCase, toDisplayName } from './naming'

describe('toDisplayName', () => {
  it('превращает kebab-case в Title Case', () => {
    expect(toDisplayName('my-cool-app')).toBe('My Cool App')
  })

  it('оставляет односложное имя, подняв первую букву', () => {
    expect(toDisplayName('studio')).toBe('Studio')
  })

  it('не ломается на цифрах в имени', () => {
    expect(toDisplayName('aprel8008-landing')).toBe('Aprel8008 Landing')
  })
})

describe('toCamelCase', () => {
  it('превращает kebab-case в camelCase', () => {
    expect(toCamelCase('my-cool-app')).toBe('myCoolApp')
  })

  it('оставляет имя без дефисов как есть', () => {
    expect(toCamelCase('studio')).toBe('studio')
  })

  it('поднимает цифру после дефиса, не теряя её', () => {
    expect(toCamelCase('app-2fa')).toBe('app2fa')
  })
})
