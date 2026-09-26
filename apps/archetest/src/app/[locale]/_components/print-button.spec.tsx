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
