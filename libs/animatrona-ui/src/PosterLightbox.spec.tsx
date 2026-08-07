import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { PosterLightbox } from './PosterLightbox'

/** Обёртка с Chakra-провайдером — Dialog/Portal требуют системы токенов */
function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('PosterLightbox', () => {
  it('не рендерит изображение, когда лайтбокс закрыт', () => {
    renderWithProvider(
      <PosterLightbox posterUrl="/poster.jpg" name="Атака титанов" open={false} onOpenChange={vi.fn()} />,
    )

    expect(screen.queryByAltText('Атака титанов')).not.toBeInTheDocument()
  })

  it('рендерит постер с корректным alt и src, когда открыт', () => {
    renderWithProvider(
      <PosterLightbox posterUrl="/poster.jpg" name="Атака титанов" open={true} onOpenChange={vi.fn()} />,
    )

    const image = screen.getByAltText('Атака титанов')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/poster.jpg')
  })

  it('вызывает onOpenChange(false) при клике на кнопку закрытия', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    renderWithProvider(
      <PosterLightbox posterUrl="/poster.jpg" name="Атака титанов" open={true} onOpenChange={onOpenChange} />,
    )

    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('вызывает onOpenChange(false) при клике на фон контента', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    renderWithProvider(
      <PosterLightbox posterUrl="/poster.jpg" name="Атака титанов" open={true} onOpenChange={onOpenChange} />,
    )

    // клик по самому изображению — контент оборачивает его и вешает onClick
    await user.click(screen.getByAltText('Атака титанов'))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
