import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { HeaderLogo } from './header-logo'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('HeaderLogo', () => {
  it('рендерит текстовый логотип как Text по умолчанию', () => {
    renderWithProvider(<HeaderLogo>My Brand</HeaderLogo>)

    expect(screen.getByText('My Brand')).toBeInTheDocument()
  })

  it('ссылается на "/" по умолчанию', () => {
    renderWithProvider(<HeaderLogo>My Brand</HeaderLogo>)

    expect(screen.getByText('My Brand').closest('a')).toHaveAttribute('href', '/')
  })

  it('использует переданный href', () => {
    renderWithProvider(<HeaderLogo href="/home">My Brand</HeaderLogo>)

    expect(screen.getByText('My Brand').closest('a')).toHaveAttribute('href', '/home')
  })

  it('рендерит кастомный children как есть, если asText=false', () => {
    renderWithProvider(
      <HeaderLogo asText={false}>
        <img src="/logo.svg" alt="Логотип" />
      </HeaderLogo>,
    )

    expect(screen.getByAltText('Логотип')).toBeInTheDocument()
    // Текстовые стили Text не должны оборачивать img
    expect(screen.getByAltText('Логотип').closest('p')).not.toBeInTheDocument()
  })

  it('рендерит нестроковый children напрямую, даже если asText=true', () => {
    renderWithProvider(
      <HeaderLogo>
        <img src="/logo.svg" alt="Компонент-логотип" />
      </HeaderLogo>,
    )

    expect(screen.getByAltText('Компонент-логотип')).toBeInTheDocument()
  })
})
