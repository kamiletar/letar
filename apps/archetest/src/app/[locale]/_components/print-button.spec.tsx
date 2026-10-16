import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it, vi } from 'vitest'
import enMessages from '../../../../messages/en.json'
import ruMessages from '../../../../messages/ru.json'
import { PrintButton } from './print-button'

/*
 * «Сохранить в PDF» (волна 7.6): кнопка зовёт системную печать, сама на бумагу не попадает,
 * а на время печати тёмная тема подменяется светлой — и возвращается ровно она.
 */

function renderIn(locale: 'ru' | 'en') {
  return render(
    <ChakraProvider value={defaultSystem}>
      <NextIntlClientProvider locale={locale} messages={locale === 'ru' ? ruMessages : enMessages}>
        <PrintButton />
      </NextIntlClientProvider>
    </ChakraProvider>,
  )
}

const root = document.documentElement

afterEach(() => {
  root.className = ''
  vi.restoreAllMocks()
})

describe('PrintButton', () => {
  it('печатает отдельный полный отчёт и убирает режим после отмены или размонтирования', () => {
    const report = document.createElement('article')
    report.id = 'test-report'
    document.body.append(report)
    const { unmount } = render(
      <ChakraProvider value={defaultSystem}>
        <NextIntlClientProvider locale="ru" messages={ruMessages}>
          <PrintButton reportId="test-report" />
        </NextIntlClientProvider>
      </ChakraProvider>,
    )
    window.dispatchEvent(new Event('beforeprint'))
    expect(document.body.hasAttribute('data-print-report')).toBe(true)
    expect(report.hasAttribute('data-print-active')).toBe(true)
    window.dispatchEvent(new Event('afterprint'))
    expect(document.body.hasAttribute('data-print-report')).toBe(false)
    window.dispatchEvent(new Event('beforeprint'))
    unmount()
    expect(report.hasAttribute('data-print-active')).toBe(false)
    expect(document.body.hasAttribute('data-print-report')).toBe(false)
    report.remove()
  })
  it('подпись в обеих локалях; клик — window.print; помечена как непечатаемая', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    renderIn('en')
    expect(screen.getByRole('button', { name: 'Save as PDF' })).toBeTruthy()
    renderIn('ru')
    const button = screen.getByRole('button', { name: 'Сохранить в PDF' })
    expect(button.hasAttribute('data-print-hide')).toBe(true)
    fireEvent.click(button)
    expect(print).toHaveBeenCalledOnce()
  })

  it('тёмная тема: на печать — светлая, после — снова тёмная, даже при двойном beforeprint', () => {
    root.className = 'dark'
    renderIn('ru')
    window.dispatchEvent(new Event('beforeprint'))
    window.dispatchEvent(new Event('beforeprint'))
    expect(root.className).toBe('light')
    window.dispatchEvent(new Event('afterprint'))
    expect(root.className).toBe('dark')
  })

  it('светлая тема печати не трогается', () => {
    root.className = 'light'
    renderIn('ru')
    window.dispatchEvent(new Event('beforeprint'))
    window.dispatchEvent(new Event('afterprint'))
    expect(root.className).toBe('light')
  })
})
