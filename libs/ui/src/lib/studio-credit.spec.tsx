import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StudioCredit } from './studio-credit'

import type { ReactNode } from 'react'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('StudioCredit', () => {
  it('рендерит ссылку на studio.letar.best с UTM-меткой приложения', () => {
    renderWithProvider(<StudioCredit app="kami" />)
    const link = screen.getByRole('link', { name: 'studio.letar.best' })
    expect(link).toHaveAttribute(
      'href',
      'https://studio.letar.best/?utm_source=kami&utm_medium=footer&utm_campaign=studio-credit',
    )
  })

  it('открывает ссылку в новой вкладке безопасно', () => {
    renderWithProvider(<StudioCredit app="driving-school" />)
    const link = screen.getByRole('link', { name: 'studio.letar.best' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('подставляет разные значения app в utm_source', () => {
    renderWithProvider(<StudioCredit app="aboi" />)
    const link = screen.getByRole('link', { name: 'studio.letar.best' })
    expect(link.getAttribute('href')).toContain('utm_source=aboi')
  })

  it('рендерит вводный текст "Сделано в"', () => {
    renderWithProvider(<StudioCredit app="kami" />)
    expect(screen.getByText(/Сделано в/)).toBeInTheDocument()
  })
})
