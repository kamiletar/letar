import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import en from '../../../../messages/en.json'
import ru from '../../../../messages/ru.json'
import { ResultReport } from './result-report'

describe('Печатный отчёт', () => {
  it.each(['ru', 'en'] as const)(
    '%s: все строки, расшифровки, практики и статичный радар, без личных выводов при отсутствии данных',
    (locale) => {
      render(
        <ChakraProvider value={defaultSystem}>
          <NextIntlClientProvider locale={locale} messages={locale === 'ru' ? ru : en}>
            <ResultReport
              id="report-test"
              scores={{ INA: 0, HYI: 60 }}
              relevantCounts={{ INA: 2, HYI: 0 }}
              source="cumulative"
            />
          </NextIntlClientProvider>
        </ChakraProvider>,
      )
      const report = document.getElementById('report-test')!
      expect(report.parentElement).toBe(document.body)
      expect(report.querySelectorAll('tbody tr')).toHaveLength(27)
      const ina = report.querySelector('[data-report-scale="INA"]')!
      expect(ina.textContent).toContain('0%')
      expect(ina.querySelectorAll('li')).toHaveLength(2)
      expect(report.querySelector('[data-report-scale="HYI"] li')).toBeNull()
      expect(screen.getByRole('img', { hidden: true, name: locale === 'ru' ? 'Радар профиля' : 'Profile radar' }))
        .toBeTruthy()
      expect(report.textContent).not.toMatch(/resultReport\./)
    },
  )
})
