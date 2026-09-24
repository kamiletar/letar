import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import enMessages from '../../../../../../messages/en.json'
import ruMessages from '../../../../../../messages/ru.json'
import { CORE_SCALE_COUNT } from '../../../_data/bank-stats'
import type { ScaleCode } from '../../../_data/personality-types'
import { computeDarkCore } from '../../../_lib/dark-core'
import type { IpsativeScale } from '../../../_lib/ipsative'
import { DarkCoreBlock } from './dark-core-block'
import { ExperimentalScalesBlock } from './experimental-scales-block'

/** Нарциссизм выше остальных → анализ чувствительности; ranking → абзац «внутри профиля» */
const ranking: IpsativeScale[] = [
  { code: 'NAR', rank: 1, normalized: 60, ciLow: 50, ciHigh: 70, n: 50, tieGroup: 0 },
  { code: 'HUM', rank: 2, normalized: 50, ciLow: 40, ciHigh: 60, n: 50, tieGroup: 1 },
  { code: 'MAC', rank: 3, normalized: 30, ciLow: 20, ciHigh: 40, n: 50, tieGroup: 2 },
  { code: 'ANT', rank: 4, normalized: 30, ciLow: 20, ciHigh: 40, n: 50, tieGroup: 2 },
  { code: 'SAD', rank: 5, normalized: 30, ciLow: 20, ciHigh: 40, n: 50, tieGroup: 2 },
]
const scores: Partial<Record<ScaleCode, number>> = { MAC: 30, NAR: 60, ANT: 30, SAD: 30 }
const index = computeDarkCore({
  normalized: scores,
  relevantCounts: { MAC: 50, NAR: 50, ANT: 50, SAD: 50 },
  confidence: { MAC: 'high', NAR: 'high', ANT: 'high', SAD: 'high' },
  ranking,
})

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

describe('кабинет: строки блоков из messages', () => {
  it('предусловие фикстуры: есть профиль и анализ чувствительности', () => {
    expect(index.profile).not.toBeNull()
    expect(index.narcissismDrivesEstimate).toBe(true)
  })

  it.each(['ru', 'en'] as const)('%s: блоки без MISSING_MESSAGE и сырых ключей', (locale) => {
    for (
      const ui of [
        <DarkCoreBlock index={index} />,
        <ExperimentalScalesBlock scores={{} as Record<ScaleCode, number>} />,
      ]
    ) {
      const { onError, container, unmount } = renderIn(locale, ui)
      expect(onError).not.toHaveBeenCalled()
      expect(container.textContent).not.toMatch(/cabinet\.\w/)
      unmount()
    }
  })

  it('RU: тёмное ядро — заголовок, ICU select «выше/ниже», покрытие банка', () => {
    renderIn('ru', <DarkCoreBlock index={index} />)
    expect(screen.getByRole('heading', { name: 'Тёмное ядро' })).toBeTruthy()
    const direction = index.profile!.coreVsProfile >= 0 ? 'выше' : 'ниже'
    expect(screen.getByText(new RegExp(`Ядро ${direction} собственного фона профиля`))).toBeTruthy()
    expect(screen.getAllByText(/высокое покрытие банка/).length).toBeGreaterThan(0)
    expect(screen.getByText(new RegExp(`Без нарциссизма ядро составило бы ${index.coreWithoutNarcissism}%`)))
      .toBeTruthy()
  })

  it('EN: тёмное ядро и экспериментальные шкалы', () => {
    renderIn('en', <DarkCoreBlock index={index} />)
    expect(screen.getByRole('heading', { name: 'Dark core' })).toBeTruthy()
    const direction = index.profile!.coreVsProfile >= 0 ? 'above' : 'below'
    expect(screen.getByText(new RegExp(`The core is ${direction} the profile`))).toBeTruthy()
    expect(screen.getAllByText(/high item coverage/).length).toBeGreaterThan(0)
  })

  it('экспериментальные шкалы: подстановка числа шкал ядра', () => {
    renderIn('ru', <ExperimentalScalesBlock scores={{} as Record<ScaleCode, number>} />)
    expect(screen.getByRole('heading', { name: 'Экспериментальные шкалы' })).toBeTruthy()
    expect(screen.getByText(new RegExp(`вне ядра из ${CORE_SCALE_COUNT} шкал`))).toBeTruthy()
  })
})
