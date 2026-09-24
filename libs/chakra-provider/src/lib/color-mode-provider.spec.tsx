import { render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'

import { ColorModeProvider } from './chakra-provider'

/** Текст единственного `<style>` в разметке провайдера. */
function styleOf(html: string): string {
  return /<style[^>]*>([^<]*)<\/style>/.exec(html)?.[1] ?? ''
}

describe('ColorModeProvider — закрепление color-scheme', () => {
  beforeEach(() => {
    // jsdom не реализует matchMedia, а next-themes читает системную тему
    vi.stubGlobal('matchMedia', () => ({ matches: false, addListener: () => {}, removeListener: () => {} }))
    document.documentElement.removeAttribute('style')
  })

  it('по умолчанию пишет `only light` для светлой темы и `dark` для тёмной', () => {
    const css = styleOf(renderToString(<ColorModeProvider>x</ColorModeProvider>))
    expect(css).toBe('html.light{color-scheme:only light}html.dark{color-scheme:dark}')
  })

  it('селекторы следуют `attribute` и `value` next-themes', () => {
    const data = styleOf(renderToString(<ColorModeProvider attribute="data-theme">x</ColorModeProvider>))
    expect(data).toBe('html[data-theme=light]{color-scheme:only light}html[data-theme=dark]{color-scheme:dark}')

    const mapped = styleOf(
      renderToString(<ColorModeProvider value={{ light: 'day', dark: 'night' }}>x</ColorModeProvider>),
    )
    expect(mapped).toBe('html.day{color-scheme:only light}html.night{color-scheme:dark}')
  })

  it('lockColorScheme={false} — стиля нет, color-scheme остаётся за next-themes', () => {
    const html = renderToString(<ColorModeProvider lockColorScheme={false}>x</ColorModeProvider>)
    expect(html).not.toMatch(/<style[^>]*>[^<]*color-scheme/)
  })

  it('инлайновый color-scheme на <html> не пишется — он перебил бы правило', () => {
    localStorage.setItem('theme', 'light')
    render(<ColorModeProvider>x</ColorModeProvider>)
    expect(document.documentElement.style.colorScheme).toBe('')
    localStorage.clear()
  })

  it('lockColorScheme={false} — next-themes по-прежнему пишет инлайновый color-scheme', () => {
    localStorage.setItem('theme', 'light')
    render(<ColorModeProvider lockColorScheme={false}>x</ColorModeProvider>)
    expect(document.documentElement.style.colorScheme).toBe('light')
    localStorage.clear()
  })
})
