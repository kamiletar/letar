import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageMagnifier } from './image-magnifier'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

beforeEach(() => {
  // jsdom не реализует matchMedia — компонент читает prefers-reduced-motion в авто-демо-эффекте
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('ImageMagnifier', () => {
  it('рендерит изображение с alt', () => {
    renderWithProvider(
      <ImageMagnifier src="/full.jpg" naturalWidth={1000} naturalHeight={800} alt="Постер" autoDemo={false} />,
    )

    // role="img" на контейнере (aria-label=alt), плюс скрытая картинка внутри
    expect(screen.getByRole('img', { name: 'Постер' })).toBeInTheDocument()
  })

  it('рендерит бейдж, когда он задан', () => {
    renderWithProvider(
      <ImageMagnifier
        src="/full.jpg"
        naturalWidth={1000}
        naturalHeight={800}
        alt="Постер"
        badge="Фрагмент"
        autoDemo={false}
      />,
    )

    expect(screen.getByText('Фрагмент')).toBeInTheDocument()
  })

  it('не рендерит бейдж, когда он не задан', () => {
    renderWithProvider(
      <ImageMagnifier src="/full.jpg" naturalWidth={1000} naturalHeight={800} alt="Постер" autoDemo={false} />,
    )

    expect(screen.queryByText('Фрагмент')).not.toBeInTheDocument()
  })

  it('рендерит подсказку, когда она задана', () => {
    renderWithProvider(
      <ImageMagnifier
        src="/full.jpg"
        naturalWidth={1000}
        naturalHeight={800}
        alt="Постер"
        hint="Наведите"
        autoDemo={false}
      />,
    )

    expect(screen.getByText('Наведите')).toBeInTheDocument()
  })

  it('контейнер фокусируемый (tabIndex=0) для клавиатурного управления', () => {
    renderWithProvider(
      <ImageMagnifier src="/full.jpg" naturalWidth={1000} naturalHeight={800} alt="Постер" autoDemo={false} />,
    )

    expect(screen.getByRole('img', { name: 'Постер' })).toHaveAttribute('tabIndex', '0')
  })

  it('не бросает исключение при клике до загрузки картинки', () => {
    renderWithProvider(
      <ImageMagnifier src="/full.jpg" naturalWidth={1000} naturalHeight={800} alt="Постер" autoDemo={false} />,
    )

    const container = screen.getByRole('img', { name: 'Постер' })
    expect(() => container.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))).not.toThrow()
  })
})
