import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { OptimizedAvatar } from './optimized-avatar'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('OptimizedAvatar', () => {
  it('рендерит fallback с именем, когда src не задан', () => {
    renderWithProvider(<OptimizedAvatar name="Иван Иванов" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    // Chakra Avatar.Fallback обычно рендерит инициалы текстом
    expect(screen.getByText(/И/)).toBeInTheDocument()
  })

  it('рендерит изображение, когда src задан', () => {
    const { container } = renderWithProvider(<OptimizedAvatar src="/avatar.jpg" name="Иван Иванов" />)

    // Chakra Avatar.Image держит img скрытым (hidden) до события load, которое в jsdom
    // никогда не срабатывает — поэтому ищем через querySelector, а не через role
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', '/avatar.jpg')
    expect(img).toHaveAttribute('alt', 'Иван Иванов')
  })

  it('использует "Avatar" как alt по умолчанию, когда имя не задано', () => {
    const { container } = renderWithProvider(<OptimizedAvatar src="/avatar.jpg" />)

    expect(container.querySelector('img')).toHaveAttribute('alt', 'Avatar')
  })

  it('не рендерит img, если src пустая строка', () => {
    renderWithProvider(<OptimizedAvatar src="" name="Тест" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('не рендерит img, если src null', () => {
    renderWithProvider(<OptimizedAvatar src={null} name="Тест" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
