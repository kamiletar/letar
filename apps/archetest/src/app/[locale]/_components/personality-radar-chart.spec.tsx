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
        <PersonalityRadarChart data={data} title="Профиль" color="#805AD5" />
      </NextIntlClientProvider>
    </ChakraProvider>,
  )
}

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
