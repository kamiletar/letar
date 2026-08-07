import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AdminEditOverlay } from './admin-edit-overlay'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('AdminEditOverlay', () => {
  it('рендерит ссылку на href', () => {
    renderWithProvider(<AdminEditOverlay href="/admin/some-slug" />)
    const link = screen.getByRole('link', { name: 'Редактировать' })
    expect(link).toHaveAttribute('href', '/admin/some-slug')
  })

  it('использует кастомный aria-label', () => {
    renderWithProvider(<AdminEditOverlay href="/admin/x" aria-label="Изменить запись" />)
    expect(screen.getByRole('link', { name: 'Изменить запись' })).toBeInTheDocument()
  })

  it('прокидывает дополнительные пропсы (colorPalette не ломает рендер)', () => {
    renderWithProvider(<AdminEditOverlay href="/admin/y" colorPalette="brand" />)
    expect(screen.getByRole('link', { name: 'Редактировать' })).toBeInTheDocument()
  })
})
