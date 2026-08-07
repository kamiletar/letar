import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RatingStars } from './rating-stars'

import type { ReactNode } from 'react'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('RatingStars', () => {
  it('рендерит 5 звёзд', () => {
    renderWithProvider(<RatingStars value={3} />)
    expect(screen.getAllByLabelText(/звёзд/)).toHaveLength(5)
  })

  it('без onChange звёзды не интерактивны (нет role=button)', () => {
    renderWithProvider(<RatingStars value={3} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('с onChange звёзды становятся интерактивными (role=button)', () => {
    renderWithProvider(<RatingStars value={3} onChange={vi.fn()} />)
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })

  it('клик по звезде вызывает onChange с её номером', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProvider(<RatingStars value={0} onChange={onChange} />)

    await user.click(screen.getByLabelText('3 звёзд'))

    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('disabled=true отключает интерактивность даже с onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProvider(<RatingStars value={0} onChange={onChange} disabled />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    await user.click(screen.getByLabelText('3 звёзд'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('заполняет звёзды до value активным цветом', () => {
    const { container } = renderWithProvider(<RatingStars value={3} activeColor="#FFD700" inactiveColor="#CBD5E0" />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(5)

    svgs.forEach((svg, index) => {
      const starNumber = index + 1
      if (starNumber <= 3) {
        expect(svg.getAttribute('fill')).toBe('#FFD700')
      } else {
        expect(svg.getAttribute('fill')).toBe('transparent')
        expect(svg.getAttribute('color')).toBe('#CBD5E0')
      }
    })
  })

  it('showValue=true отображает числовое значение рядом', () => {
    renderWithProvider(<RatingStars value={4.5} showValue />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('showValue=true без значения (value=0) не отображает число', () => {
    renderWithProvider(<RatingStars value={0} showValue />)
    expect(screen.queryByText('0.0')).not.toBeInTheDocument()
  })

  it('showValue=false не отображает число даже при заданном value', () => {
    renderWithProvider(<RatingStars value={4} showValue={false} />)
    expect(screen.queryByText('4.0')).not.toBeInTheDocument()
  })
})
