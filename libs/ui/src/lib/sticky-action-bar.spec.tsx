import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StickyActionBar } from './sticky-action-bar'

import type { ReactNode } from 'react'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('StickyActionBar', () => {
  it('рендерит children (CTA-кнопку)', () => {
    renderWithProvider(
      <StickyActionBar>
        <button>Начать</button>
      </StickyActionBar>,
    )
    expect(screen.getByRole('button', { name: 'Начать' })).toBeInTheDocument()
  })

  it('позиционируется как sticky снизу экрана', () => {
    const { container } = renderWithProvider(
      <StickyActionBar>
        <button>Начать</button>
      </StickyActionBar>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(getComputedStyle(root).position).toBe('sticky')
  })

  it('публикует свою высоту в CSS-переменную --letar-sticky-actionbar-height на documentElement', () => {
    renderWithProvider(
      <StickyActionBar>
        <button>Начать</button>
      </StickyActionBar>,
    )
    const value = document.documentElement.style.getPropertyValue('--letar-sticky-actionbar-height')
    expect(value).toMatch(/px$/)
  })

  it('сбрасывает CSS-переменную высоты в 0px при размонтировании', () => {
    const { unmount } = renderWithProvider(
      <StickyActionBar>
        <button>Начать</button>
      </StickyActionBar>,
    )
    unmount()
    const value = document.documentElement.style.getPropertyValue('--letar-sticky-actionbar-height')
    expect(value).toBe('0px')
  })

  it('пробрасывает contentProps во внутренний HStack', () => {
    renderWithProvider(
      <StickyActionBar contentProps={{ 'data-testid': 'inner-stack' } as never}>
        <button>Начать</button>
      </StickyActionBar>,
    )
    expect(screen.getByTestId('inner-stack')).toBeInTheDocument()
  })

  it('рендерит несколько кнопок как children', () => {
    renderWithProvider(
      <StickyActionBar>
        <button>Отмена</button>
        <button>Подтвердить</button>
      </StickyActionBar>,
    )
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Подтвердить' })).toBeInTheDocument()
  })
})
