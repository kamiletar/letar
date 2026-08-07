import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RatingDisplay } from './rating-display'

import type { ReactNode } from 'react'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('RatingDisplay', () => {
  it('показывает текст об отсутствии отзывов при rating=null', () => {
    renderWithProvider(<RatingDisplay rating={null} />)
    expect(screen.getByText('Нет отзывов')).toBeInTheDocument()
  })

  it('показывает текст об отсутствии отзывов при rating=0', () => {
    renderWithProvider(<RatingDisplay rating={0} />)
    expect(screen.getByText('Нет отзывов')).toBeInTheDocument()
  })

  it('поддерживает кастомный noReviewsText', () => {
    renderWithProvider(<RatingDisplay rating={null} noReviewsText="Пока нет оценок" />)
    expect(screen.getByText('Пока нет оценок')).toBeInTheDocument()
  })

  it('в компактном режиме ничего не рендерит при отсутствии рейтинга', () => {
    const { container } = renderWithProvider(<RatingDisplay rating={null} compact />)
    expect(container).toBeEmptyDOMElement()
  })

  it('отображает округлённое до одного знака значение рейтинга', () => {
    renderWithProvider(<RatingDisplay rating={4.567} />)
    expect(screen.getByText('4.6')).toBeInTheDocument()
  })

  it('не показывает количество отзывов, если reviewCount=0', () => {
    renderWithProvider(<RatingDisplay rating={4.5} reviewCount={0} />)
    expect(screen.queryByText(/отзыв/)).not.toBeInTheDocument()
  })

  it('склоняет слово "отзыв" для количества 1', () => {
    renderWithProvider(<RatingDisplay rating={4.5} reviewCount={1} />)
    expect(screen.getByText('(1 отзыв)')).toBeInTheDocument()
  })

  it('склоняет слово "отзыва" для количества 2', () => {
    renderWithProvider(<RatingDisplay rating={4.5} reviewCount={2} />)
    expect(screen.getByText('(2 отзыва)')).toBeInTheDocument()
  })

  it('склоняет слово "отзывов" для количества 5', () => {
    renderWithProvider(<RatingDisplay rating={4.5} reviewCount={5} />)
    expect(screen.getByText('(5 отзывов)')).toBeInTheDocument()
  })

  it('склоняет слово "отзывов" для количества 11 (исключение из общего правила)', () => {
    renderWithProvider(<RatingDisplay rating={4.5} reviewCount={11} />)
    expect(screen.getByText('(11 отзывов)')).toBeInTheDocument()
  })

  it('поддерживает кастомную функцию склонения', () => {
    renderWithProvider(<RatingDisplay rating={4.5} reviewCount={3} reviewWordFn={(count) => `review(${count})`} />)
    expect(screen.getByText('(3 review(3))')).toBeInTheDocument()
  })

  it('в компактном режиме отображает бейдж со значением рейтинга', () => {
    renderWithProvider(<RatingDisplay rating={4.5} compact />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })
})
