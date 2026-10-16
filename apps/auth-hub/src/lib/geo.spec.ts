import { getClientIp } from '@letar/demo-protection'
import { describe, expect, it, vi } from 'vitest'
import { getCountryCode } from './geo'

vi.mock('@letar/demo-protection', () => ({ getClientIp: vi.fn() }))

describe('getCountryCode', () => {
  it.each([
    ['77.88.8.8', 'RU'],
    ['8.8.8.8', 'US'],
    ['127.0.0.1', ''],
    ['unknown', ''],
  ])('определяет страну доверенного адреса %s как %s', async (ip, country) => {
    vi.mocked(getClientIp).mockResolvedValue(ip)
    expect(await getCountryCode()).toBe(country)
  })
})
