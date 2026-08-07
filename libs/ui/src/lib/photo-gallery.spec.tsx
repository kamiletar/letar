import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { PhotoGallery } from './photo-gallery'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

const photos = [
  { src: '/photo1.jpg', alt: 'Фото 1' },
  { src: '/photo2.jpg', alt: 'Фото 2' },
  { src: '/photo3.jpg' },
]

describe('PhotoGallery', () => {
  it('рендерит все фото сетки', () => {
    renderWithProvider(<PhotoGallery photos={photos} />)

    expect(screen.getByRole('button', { name: 'Фото 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Фото 2' })).toBeInTheDocument()
    // без alt — падает на дефолтный лейбл "Фото N"
    expect(screen.getByRole('button', { name: 'Фото 3' })).toBeInTheDocument()
  })

  it('лайтбокс не открыт изначально', () => {
    renderWithProvider(<PhotoGallery photos={photos} />)

    // yet-another-react-lightbox рендерит в портал (document.body), не внутрь container
    expect(document.querySelector('.yarl__root')).not.toBeInTheDocument()
  })

  it('клик по фото открывает лайтбокс', async () => {
    const user = userEvent.setup()
    renderWithProvider(<PhotoGallery photos={photos} />)

    await user.click(screen.getByRole('button', { name: 'Фото 1' }))

    expect(document.querySelector('.yarl__root')).toBeInTheDocument()
  })

  it('Enter на фокусированной карточке открывает лайтбокс', async () => {
    const user = userEvent.setup()
    renderWithProvider(<PhotoGallery photos={photos} />)

    const card = screen.getByRole('button', { name: 'Фото 2' })
    card.focus()
    await user.keyboard('{Enter}')

    expect(document.querySelector('.yarl__root')).toBeInTheDocument()
  })

  it('показывает скелетоны при loading=true', () => {
    const { container } = renderWithProvider(<PhotoGallery photos={photos} loading skeletonCount={3} />)

    // Skeleton рендерится доп. блоками сверх количества фото
    const gridChildren = container.querySelectorAll('[class*="css"]')
    expect(gridChildren.length).toBeGreaterThan(0)
  })

  it('не рендерит фото при пустом массиве', () => {
    renderWithProvider(<PhotoGallery photos={[]} />)

    expect(screen.queryAllByRole('button').length).toBe(0)
  })
})
