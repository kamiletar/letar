import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReviewCard, type ReviewData } from './review-card'

import type { ReactNode } from 'react'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

const baseReview: ReviewData = {
  id: 'r1',
  authorId: 'u1',
  author: { id: 'u1', name: 'Иван Иванов', image: null },
  targetType: 'INSTRUCTOR',
  rating: 4,
  text: 'Отличный инструктор!',
  status: 'VISIBLE',
  response: null,
  respondedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

describe('ReviewCard', () => {
  it('рендерит имя автора и текст отзыва', () => {
    renderWithProvider(<ReviewCard review={baseReview} />)
    expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
    expect(screen.getByText('Отличный инструктор!')).toBeInTheDocument()
  })

  it('показывает "Без имени", если имя автора не задано', () => {
    renderWithProvider(<ReviewCard review={{ ...baseReview, author: { ...baseReview.author, name: null } }} />)
    expect(screen.getByText('Без имени')).toBeInTheDocument()
  })

  it('показывает бейдж скрытого отзыва при статусе HIDDEN', () => {
    renderWithProvider(<ReviewCard review={{ ...baseReview, status: 'HIDDEN' }} />)
    expect(screen.getByText('Отзыв скрыт модератором')).toBeInTheDocument()
  })

  it('не показывает бейдж скрытого отзыва при статусе VISIBLE', () => {
    renderWithProvider(<ReviewCard review={baseReview} />)
    expect(screen.queryByText('Отзыв скрыт модератором')).not.toBeInTheDocument()
  })

  it('поддерживает кастомный hiddenStatus и hiddenBadgeText', () => {
    renderWithProvider(
      <ReviewCard
        review={{ ...baseReview, status: 'MODERATION' }}
        hiddenStatus="MODERATION"
        hiddenBadgeText="На модерации"
      />,
    )
    expect(screen.getByText('На модерации')).toBeInTheDocument()
  })

  it('рендерит ответ на отзыв, если он есть', () => {
    renderWithProvider(
      <ReviewCard
        review={{ ...baseReview, response: 'Спасибо за отзыв!', respondedAt: new Date('2026-01-02T00:00:00Z') }}
      />,
    )
    expect(screen.getByText('Спасибо за отзыв!')).toBeInTheDocument()
    expect(screen.getByText(/Ответ инструктора/)).toBeInTheDocument()
  })

  it('использует кастомный getResponderLabel', () => {
    renderWithProvider(
      <ReviewCard
        review={{ ...baseReview, targetType: 'PRODUCT', response: 'Спасибо!' }}
        getResponderLabel={() => 'магазина'}
      />,
    )
    expect(screen.getByText(/Ответ магазина/)).toBeInTheDocument()
  })

  it('не показывает кнопку "Ответить", если canRespond=false', () => {
    renderWithProvider(<ReviewCard review={baseReview} canRespond={false} />)
    expect(screen.queryByRole('button', { name: /Ответить/ })).not.toBeInTheDocument()
  })

  it('показывает кнопку "Ответить" при canRespond=true и без ответа', () => {
    renderWithProvider(<ReviewCard review={baseReview} canRespond />)
    expect(screen.getByRole('button', { name: /Ответить/ })).toBeInTheDocument()
  })

  it('не показывает кнопку "Ответить", если ответ уже есть', () => {
    renderWithProvider(<ReviewCard review={{ ...baseReview, response: 'Уже ответили' }} canRespond />)
    expect(screen.queryByRole('button', { name: /Ответить/ })).not.toBeInTheDocument()
  })

  it('открывает форму ответа и вызывает onRespond с введённым текстом', async () => {
    const user = userEvent.setup()
    const onRespond = vi.fn().mockResolvedValue(undefined)
    renderWithProvider(<ReviewCard review={baseReview} canRespond onRespond={onRespond} />)

    await user.click(screen.getByRole('button', { name: /Ответить/ }))
    const textarea = screen.getByPlaceholderText('Напишите ответ на отзыв...')
    await user.type(textarea, 'Спасибо за оценку!')
    await user.click(screen.getByRole('button', { name: /Отправить/ }))

    expect(onRespond).toHaveBeenCalledWith('r1', 'Спасибо за оценку!')
  })

  it('кнопка "Отправить" заблокирована при пустом тексте ответа', async () => {
    const user = userEvent.setup()
    renderWithProvider(<ReviewCard review={baseReview} canRespond onRespond={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /Ответить/ }))

    expect(screen.getByRole('button', { name: /Отправить/ })).toBeDisabled()
  })

  it('кнопка "Отмена" закрывает форму ответа', async () => {
    const user = userEvent.setup()
    renderWithProvider(<ReviewCard review={baseReview} canRespond onRespond={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /Ответить/ }))
    expect(screen.getByPlaceholderText('Напишите ответ на отзыв...')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Отмена/ }))
    expect(screen.queryByPlaceholderText('Напишите ответ на отзыв...')).not.toBeInTheDocument()
  })

  it('показывает кнопку "Пожаловаться" для не-автора при переданном onReport', () => {
    renderWithProvider(<ReviewCard review={baseReview} currentUserId="u2" onReport={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Пожаловаться/ })).toBeInTheDocument()
  })

  it('не показывает кнопку "Пожаловаться" для автора отзыва', () => {
    renderWithProvider(<ReviewCard review={baseReview} currentUserId="u1" onReport={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /Пожаловаться/ })).not.toBeInTheDocument()
  })

  it('вызывает onReport с id отзыва при клике "Пожаловаться"', async () => {
    const user = userEvent.setup()
    const onReport = vi.fn()
    renderWithProvider(<ReviewCard review={baseReview} currentUserId="u2" onReport={onReport} />)

    await user.click(screen.getByRole('button', { name: /Пожаловаться/ }))

    expect(onReport).toHaveBeenCalledWith('r1')
  })
})
