import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HeaderActions } from './header-actions'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('HeaderActions', () => {
  it('рендерит переданные children', () => {
    renderWithProvider(
      <HeaderActions>
        <button type="button">Действие 1</button>
        <button type="button">Действие 2</button>
      </HeaderActions>,
    )

    expect(screen.getByText('Действие 1')).toBeInTheDocument()
    expect(screen.getByText('Действие 2')).toBeInTheDocument()
  })

  it('прокидывает клик до кнопки-действия', async () => {
    const onClick = vi.fn()
    renderWithProvider(
      <HeaderActions>
        <button type="button" onClick={onClick}>Клик</button>
      </HeaderActions>,
    )

    screen.getByText('Клик').click()

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('пробрасывает дополнительные stack-пропсы', () => {
    renderWithProvider(
      <HeaderActions data-testid="actions" gap={5}>
        <span>Контент</span>
      </HeaderActions>,
    )

    expect(screen.getByTestId('actions')).toBeInTheDocument()
  })
})
