import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldRating } from './field-rating'

describe('FieldRating (shadcn)', () => {
  it('рендерит нужное число звёзд', () => {
    render(
      <TestForm defaultValues={{ rating: 0 }}>
        <FieldRating name="rating" label="Оценка" count={5} />
      </TestForm>,
    )

    expect(screen.getByText('Оценка')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('клик по звезде устанавливает значение', () => {
    render(
      <TestForm defaultValues={{ rating: 0 }}>
        <FieldRating name="rating" label="Оценка" count={5} />
      </TestForm>,
    )

    const stars = screen.getAllByRole('radio')
    fireEvent.click(stars[2])
    expect(stars[2]).toHaveAttribute('aria-checked', 'true')
    expect(stars[3]).toHaveAttribute('aria-checked', 'false')
  })
})
