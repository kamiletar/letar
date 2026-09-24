import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import enMessages from '../../../../../../messages/en.json'
import ruMessages from '../../../../../../messages/ru.json'
import { CORE_SCALE_COUNT } from '../../../_data/bank-stats'
import { ALL_SCALE_CODES, type ScaleCode } from '../../../_data/personality-types'
import { computeDarkCore } from '../../../_lib/dark-core'
import type { IpsativeScale } from '../../../_lib/ipsative'
import { DarkCoreBlock } from './dark-core-block'
import { ExperimentalScalesBlock } from './experimental-scales-block'
import { StabilityMapBlock } from './stability-map-block'

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
    const blocks = [
      <DarkCoreBlock key="dark" index={index} />,
      <ExperimentalScalesBlock key="exp" scores={{} as Record<ScaleCode, number>} />,
    ]
    for (const ui of blocks) {
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

  it.each(['ru', 'en'] as const)(
    '%s: карта стабильности — меняющаяся шкала, plural недостающих, разбивка по настроению',
    (locale) => {
      const all = (v: number) => Object.fromEntries(ALL_SCALE_CODES.map((c) => [c, v])) as Record<ScaleCode, number>
      // PAR сильно меняется при большом n; SAD без ответов — «мало сессий»; валентности 1,1,3,3
      const session = (par: number, valence: number) => ({
        normalized: { ...all(40), PAR: par },
        relevantCounts: { ...all(40), SAD: 0 },
        moodValence: valence,
      })
      const { onError, container } = renderIn(
        locale,
        <StabilityMapBlock sessions={[session(10, 1), session(15, 1), session(85, 3), session(90, 3)]} />,
      )
      expect(onError).not.toHaveBeenCalled()
      expect(container.textContent).not.toMatch(/cabinet\.\w/)
      expect(container.textContent).toMatch(/PAR 10–90%/)
      expect(container.textContent).toMatch(locale === 'ru' ? /1 шкала — мало сессий/ : /1 scale: too few sessions/)
      expect(container.textContent).toMatch(/PAR: 12\.5% → 87\.5%/)
    },
  )

  it('карта стабильности не показывается меньше чем с трёх сессий', () => {
    const { container } = renderIn('ru', <StabilityMapBlock sessions={[]} />)
    expect(container.textContent).toBe('')
  })
})
