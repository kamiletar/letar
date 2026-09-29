import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { OutboundLink } from './outbound-link'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('OutboundLink', () => {
  it('открывает чужой сайт в новой вкладке без передачи opener и referrer', () => {
    renderWithProvider(<OutboundLink href="https://doi.org/10.1126/science">Статья</OutboundLink>)
    const link = screen.getByRole('link', { name: /Статья/ })
    expect(link).toHaveAttribute('href', 'https://doi.org/10.1126/science')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('показывает иконку исходящей ссылки, скрытую от диктора', () => {
    renderWithProvider(<OutboundLink href="https://example.org">Сайт</OutboundLink>)
    const icon = screen.getByRole('link').querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  // \s* — jsdom при расчёте доступного имени съедает пробел перед скрытой подписью, браузер его сохраняет
  it('диктор слышит, что ссылка откроется в новой вкладке', () => {
    renderWithProvider(<OutboundLink href="https://example.org">Сайт</OutboundLink>)
    expect(screen.getByRole('link', { name: /^Сайт\s*\(откроется в новой вкладке\)$/ })).toBeInTheDocument()
  })

  it('подпись для диктора переопределяется для других языков', () => {
    renderWithProvider(
      <OutboundLink href="https://example.org" newTabLabel="(opens in a new tab)">
        Site
      </OutboundLink>,
    )
    expect(screen.getByRole('link', { name: /^Site\s*\(opens in a new tab\)$/ })).toBeInTheDocument()
  })
})
