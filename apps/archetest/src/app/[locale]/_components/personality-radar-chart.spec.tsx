import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, fireEvent, render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { cloneElement, isValidElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import ruMessages from '../../../../messages/ru.json'
import { PersonalityRadarChart } from './personality-radar-chart'

vi.mock('@/app/_hooks/use-psychologist', () => ({ useShowClinicalNames: () => false }))

// jsdom не меряет размеры: ResponsiveContainer отдал бы 0×0 и диаграмма не отрисовалась бы.
// Подменяем его на фиксированный размер, остальной recharts — настоящий.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) =>
      isValidElement(children)
        ? cloneElement(children as React.ReactElement<{ width: number; height: number }>, { width: 400, height: 400 })
        : null,
  }
})

const data = [
  { type: 'PAR', label: 'Бдительный Страж', value: 55 },
  { type: 'SZD', label: 'Отшельник', value: 20 },
  { type: 'OBC', label: 'Архитектор', value: 70 },
]

function renderChart() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <NextIntlClientProvider locale="ru" messages={ruMessages}>
        <PersonalityRadarChart data={data} title="Профиль" color="currentColor" />
      </NextIntlClientProvider>
    </ChakraProvider>,
  )
}

describe('PersonalityRadarChart: расшифровка сокращений', () => {
  it('черты идут по убыванию балла, состояния (BAR/DPR) — отдельной группой', () => {
    const { container } = render(
      <ChakraProvider value={defaultSystem}>
        <NextIntlClientProvider locale="ru" messages={ruMessages}>
          <PersonalityRadarChart
            data={[...data, { type: 'DPR', label: 'Философ', value: 36 }, { type: 'BAR', label: 'Маятник', value: 46 }]}
            title="Профиль"
            color="currentColor"
          />
        </NextIntlClientProvider>
      </ChakraProvider>,
    )
    const legend = container.querySelector('[data-scope="collapsible"][data-part="root"]')
    expect(legend).toBeTruthy()
    const text = legend?.textContent ?? ''
    const at = (s: string) => text.indexOf(s)

    // Черты: Архитектор 70 → Бдительный Страж 55 → Отшельник 20
    expect(at('Архитектор')).toBeGreaterThan(at('Черты'))
    expect(at('Бдительный Страж')).toBeGreaterThan(at('Архитектор'))
    expect(at('Отшельник')).toBeGreaterThan(at('Бдительный Страж'))
    // Состояния — после всех черт, тоже по убыванию: Маятник 46 → Философ 36
    expect(at('Состояния')).toBeGreaterThan(at('Отшельник'))
    expect(at('Маятник')).toBeGreaterThan(at('Состояния'))
    expect(at('Философ')).toBeGreaterThan(at('Маятник'))
  })

  it('шкалы с малым числом ответов — отдельным списком между чертами и состояниями', () => {
    const { container } = render(
      <ChakraProvider value={defaultSystem}>
        <NextIntlClientProvider locale="ru" messages={ruMessages}>
          <PersonalityRadarChart
            data={[...data, { type: 'BAR', label: 'Маятник', value: 46 }]}
            confidence={{ OBC: 'low' }}
            title="Профиль"
            color="currentColor"
          />
        </NextIntlClientProvider>
      </ChakraProvider>,
    )
    const legend = container.querySelector('[data-scope="collapsible"][data-part="root"]')
    const text = legend?.textContent ?? ''
    const at = (s: string) => text.indexOf(s)
    const uncertainTitle = ruMessages.radar.lowConfidence

    // Надёжные (Бдительный Страж 55 → Отшельник 20) → «Мало ответов» (Архитектор 70, хоть и выше) → состояния
    expect(at('Отшельник')).toBeGreaterThan(at('Бдительный Страж'))
    expect(at(uncertainTitle)).toBeGreaterThan(at('Отшельник'))
    expect(at('Архитектор')).toBeGreaterThan(at(uncertainTitle))
    expect(at('Состояния')).toBeGreaterThan(at('Архитектор'))
    expect(at('Маятник')).toBeGreaterThan(at('Состояния'))
  })

  it('без шкал с малым числом ответов третьего списка нет', () => {
    const { container } = renderChart()
    const legend = container.querySelector('[data-scope="collapsible"][data-part="root"]')
    expect(legend?.textContent).not.toContain(ruMessages.radar.lowConfidence)
  })

  it('без состояний заголовка «Состояния» нет', () => {
    const { container } = renderChart()
    const legend = container.querySelector('[data-scope="collapsible"][data-part="root"]')
    expect(legend?.textContent).not.toContain('Состояния')
  })
})

describe('PersonalityRadarChart: доступ с клавиатуры', () => {
  it('поверхность диаграммы фокусируется по Tab (accessibilityLayer)', () => {
    const { container } = renderChart()
    const surface = container.querySelector('.recharts-surface')
    expect(surface).toBeTruthy()
    expect(surface?.getAttribute('tabindex')).toBe('0')
    expect(surface?.getAttribute('role')).toBe('application')
  })

  it('стрелка вправо открывает тултип оси', async () => {
    const { container } = renderChart()
    const surface = container.querySelector('.recharts-surface') as SVGElement
    await act(async () => {
      surface.focus()
      fireEvent.keyDown(surface, { key: 'ArrowRight' })
    })
    expect(container.querySelector('.recharts-tooltip-wrapper')?.textContent ?? '').toMatch(
      /Бдительный Страж|Отшельник|Архитектор/,
    )
  })
})
