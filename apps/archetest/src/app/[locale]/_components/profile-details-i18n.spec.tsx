import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import enMessages from '../../../../messages/en.json'
import ruMessages from '../../../../messages/ru.json'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { getPersonalityType, PERSONALITY_TYPES } from '../_data/personality-types'
import type { ScaleConfidence } from '../_lib/scoring-core'
import { ProfileDetails } from './profile-details'

vi.mock('@/app/_hooks/use-psychologist', () => ({ useShowClinicalNames: () => false }))

const codes = PERSONALITY_TYPES.map((t) => t.code)
const fill = <T,>(v: T) => Object.fromEntries(codes.map((c) => [c, v])) as Record<PersonalityTypeCode, T>
// Три выраженные шкалы (топ-3 и взаимодействие), PAG ≥ 40 — модификатор, одна шкала с низкой точностью
const scores = { ...fill(10), PAR: 80, OBC: 70, SZD: 60, PAG: 45 }
const confidence: Record<PersonalityTypeCode, ScaleConfidence> = { ...fill<ScaleConfidence>('high'), SZD: 'low' }
const relevantCounts = fill(60)

function renderIn(locale: 'ru' | 'en') {
  const onError = vi.fn()
  const view = render(
    <ChakraProvider value={defaultSystem}>
      <NextIntlClientProvider locale={locale} messages={locale === 'ru' ? ruMessages : enMessages} onError={onError}>
        <ProfileDetails scores={scores} confidence={confidence} relevantCounts={relevantCounts} />
      </NextIntlClientProvider>
    </ChakraProvider>,
  )
  return { ...view, onError }
}

describe('ProfileDetails + DevelopmentalProfileCard: строки из messages', () => {
  it.each(['ru', 'en'] as const)('%s: без MISSING_MESSAGE и сырых ключей', (locale) => {
    const { onError, container } = renderIn(locale)
    expect(onError).not.toHaveBeenCalled()
    expect(container.textContent).not.toMatch(/(profileDetails|developmentalCard)\.\w/)
  })

  it('RU: заголовок, подпись точности, модификатор — поля данных на русском', () => {
    renderIn('ru')
    const pag = getPersonalityType('PAG')!
    expect(screen.getByRole('heading', { name: 'Ваши ведущие черты' })).toBeTruthy()
    expect(screen.getAllByText(/Низкая точность/).length).toBeGreaterThan(0)
    // регрессия склейки переменных: в RU-заголовок модификатора должно идти русское название
    expect(screen.getByRole('heading', { name: `Если у вас выражен ${pag.label} (${pag.archetype})` })).toBeTruthy()
    expect(screen.getAllByRole('heading', { name: 'Суперсила' }).length).toBe(3)
  })

  it('EN: те же места — английские поля данных', () => {
    renderIn('en')
    const pag = getPersonalityType('PAG')!
    expect(screen.getByRole('heading', { name: 'Your leading traits' })).toBeTruthy()
    expect(screen.getAllByText(/Low accuracy/).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: `If ${pag.labelEn} (${pag.archetypeEn}) is pronounced` })).toBeTruthy()
    expect(screen.getAllByRole('heading', { name: 'Superpower' }).length).toBe(3)
  })
})
