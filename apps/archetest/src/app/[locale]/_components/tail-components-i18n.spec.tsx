import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import enMessages from '../../../../messages/en.json'
import ruMessages from '../../../../messages/ru.json'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { PERSONALITY_TYPES } from '../_data/personality-types'
import { HexagramChart } from './hexagram-chart'
import { HighContrastToggle } from './high-contrast-toggle'
import { PsychologistLinkBlock } from './psychologist-link-block'
import { QuizProgressBar } from './quiz-progress-bar'
import { StatesBlock } from './states-block'

vi.mock('@/app/_hooks/use-psychologist', () => ({ useShowClinicalNames: () => false }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
vi.mock('@/lib/auth-client', () => ({ useSession: () => ({ data: { user: { id: 'u1' } } }) }))
vi.mock('../_actions/psychologist.action', () => ({
  getMyLinkedPsychologistsAction: vi.fn(async () => ({ data: [] })),
  linkPsychologistAction: vi.fn(),
}))

// jsdom не реализует matchMedia, а гексаграмма спрашивает prefers-reduced-motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }),
})

const scores = {
  ...Object.fromEntries(PERSONALITY_TYPES.map((t) => [t.code, 30])),
  DPR: 70,
} as Record<PersonalityTypeCode, number>

function renderIn(locale: 'ru' | 'en', ui: ReactElement) {
  const onError = vi.fn()
  const view = render(
    <ChakraProvider value={defaultSystem}>
      <NextIntlClientProvider locale={locale} messages={locale === 'ru' ? ruMessages : enMessages} onError={onError}>
        {ui}
      </NextIntlClientProvider>
    </ChakraProvider>,
  )
  return { ...view, onError }
}

const all = () => (
  <>
    <HexagramChart scores={scores} showIntegrationIndex showNarrative />
    <StatesBlock
      scores={scores}
      confidence={{ ...Object.fromEntries(PERSONALITY_TYPES.map((t) => [t.code, 'high'])), DPR: 'low' } as never}
    />
    <HighContrastToggle />
    <QuizProgressBar
      current={3}
      total={50}
      answered={2}
      globalProgress={{ totalAnswered: 120, totalQuestions: 2096 }}
    />
    <PsychologistLinkBlock />
  </>
)

describe('хвост волны 5: строки из messages', () => {
  it.each(['ru', 'en'] as const)('%s: без MISSING_MESSAGE и сырых ключей', async (locale) => {
    const { onError, container } = renderIn(locale, all())
    await waitFor(() =>
      expect(container.textContent).toMatch(locale === 'ru' ? /Поделиться с психологом/ : /Share with psychologist/)
    )
    expect(onError).not.toHaveBeenCalled()
    expect(container.textContent).not.toMatch(
      /(hexagram|statesBlock|highContrast|psychologistLink|progressBar|scaleConfidence)\.\w/,
    )
  })

  it('RU: подстановки и общие подписи точности', async () => {
    renderIn('ru', all())
    expect(screen.getByText('Всего: 120 / 2096')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Состояния' })).toBeTruthy()
    expect(screen.getAllByText(/Низкая точность/).length).toBeGreaterThan(0)
    expect(screen.getByText(/^Зона интеграции: \d+%/)).toBeTruthy()
  })

  it('EN: те же места на английском', async () => {
    renderIn('en', all())
    expect(screen.getByText('Total: 120 / 2096')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'States' })).toBeTruthy()
    expect(screen.getAllByText(/Low accuracy/).length).toBeGreaterThan(0)
    expect(screen.getByText(/^Integration zone: \d+%/)).toBeTruthy()
  })
})
