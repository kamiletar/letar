import { getCountryCode } from '@/lib/geo'
import { Children, isValidElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SignInFlow } from './_components/sign-in-flow'
import SignInPage from './page'

vi.mock('@/lib/geo', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/geo')>(),
  getCountryCode: vi.fn(),
}))
vi.mock('@letar/demo-protection', () => ({ getClientIp: vi.fn() }))
vi.mock('@chakra-ui/react', () => ({ Card: { Root: 'section', Body: 'div' } }))
vi.mock('./_components/sign-in-flow', () => ({ SignInFlow: () => null }))
vi.mock('./_components/oidc-pending-capture', () => ({ OidcPendingCapture: () => null }))

// Читаем переданные серверной страницей props без запуска браузерных компонентов.
function findFlow(node: ReactNode): Record<string, unknown> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) {
      continue
    }
    if (child.type === SignInFlow) {
      return child.props
    }
    const found = findFlow(child.props.children)
    if (found) {
      return found
    }
  }
  return undefined
}

afterEach(() => vi.unstubAllEnvs())

describe('геофильтр страницы входа', () => {
  it.each([
    ['RU', [], false],
    ['US', ['google', 'github', 'facebook'], true],
    ['', ['google', 'github', 'facebook'], true],
  ])('для страны %s передаёт разрешённые способы', async (country, otherProviders, hasTelegram) => {
    vi.mocked(getCountryCode).mockResolvedValue(country)
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token')
    vi.stubEnv('TELEGRAM_BOT_USERNAME', 'test-bot')

    const page = await SignInPage({ searchParams: Promise.resolve({}) })

    expect(findFlow(page)).toEqual({ otherProviders, hasTelegram })
  })

  it('скрывает Telegram без настроенного бота', async () => {
    vi.mocked(getCountryCode).mockResolvedValue('US')
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '')
    vi.stubEnv('TELEGRAM_BOT_USERNAME', '')

    const page = await SignInPage({ searchParams: Promise.resolve({}) })

    expect(findFlow(page)?.hasTelegram).toBe(false)
  })
})
