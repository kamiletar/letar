import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBaseUrl, isProductionDomain } from './is-production-domain'

const PRODUCTION_URL = 'https://example.com'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getBaseUrl', () => {
  it('возвращает NEXT_PUBLIC_BASE_URL, если он задан', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://staging.example.com')
    expect(getBaseUrl(PRODUCTION_URL)).toBe('https://staging.example.com')
  })

  it('возвращает productionUrl, если переменная не задана', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '')
    expect(getBaseUrl(PRODUCTION_URL)).toBe(PRODUCTION_URL)
  })
})

describe('isProductionDomain', () => {
  it('true на боевом домене', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', PRODUCTION_URL)
    expect(isProductionDomain(PRODUCTION_URL)).toBe(true)
  })

  it('false на staging-домене, даже если NODE_ENV=production', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://staging.example.com')
    vi.stubEnv('NODE_ENV', 'production')
    expect(isProductionDomain(PRODUCTION_URL)).toBe(false)
  })

  it('true без NEXT_PUBLIC_BASE_URL — getBaseUrl падает обратно на productionUrl (унаследовано из aboi/seo.ts)', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '')
    expect(isProductionDomain(PRODUCTION_URL)).toBe(true)
  })
})
