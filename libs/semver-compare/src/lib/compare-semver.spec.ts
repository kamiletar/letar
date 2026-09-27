import { describe, expect, it } from 'vitest'
import { compareSemver } from './compare-semver'

describe('compareSemver', () => {
  it('возвращает 0 для равных версий', () => {
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0)
  })

  it('возвращает положительное число, если a новее b', () => {
    expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0)
    expect(compareSemver('2.0.0', '1.99.99')).toBeGreaterThan(0)
    expect(compareSemver('1.0.1', '1.0.0')).toBeGreaterThan(0)
  })

  it('возвращает отрицательное число, если a старее b', () => {
    expect(compareSemver('1.9.0', '1.10.0')).toBeLessThan(0)
    expect(compareSemver('0.5.22', '0.5.23')).toBeLessThan(0)
  })

  it('сравнивает не как строки, а по числовым компонентам', () => {
    // Лексикографически '1.9.0' > '1.10.0', но по semver — наоборот
    expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0)
  })

  it('трактует отсутствующий компонент как 0', () => {
    expect(compareSemver('1.2', '1.2.0')).toBe(0)
    expect(compareSemver('1.2.1', '1.2')).toBeGreaterThan(0)
  })
})
