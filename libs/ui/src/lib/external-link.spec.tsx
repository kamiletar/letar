import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ExternalLink } from './external-link'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('ExternalLink', () => {
  it('рендерит ссылку с target=_blank и rel=noopener noreferrer', () => {
    renderWithProvider(
      <ExternalLink href="https://vk.com/example" aria-label="ВКонтакте">
        <span>icon</span>
      </ExternalLink>,
    )
    const link = screen.getByRole('link', { name: 'ВКонтакте' })
    expect(link).toHaveAttribute('href', 'https://vk.com/example')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('рендерит children внутри ссылки', () => {
    renderWithProvider(
      <ExternalLink href="https://github.com/example" aria-label="GitHub">
        <span data-testid="icon">gh</span>
      </ExternalLink>,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })
})
