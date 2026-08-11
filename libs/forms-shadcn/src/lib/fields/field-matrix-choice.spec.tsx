import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldMatrixChoice } from './field-matrix-choice'

const rows = [
  { value: 'speed', label: 'Скорость доставки' },
  { value: 'quality', label: 'Качество товара' },
]
const columns = [
  { value: '1', label: 'Плохо' },
  { value: '3', label: 'Нормально' },
  { value: '5', label: 'Отлично' },
]

describe('FieldMatrixChoice (shadcn)', () => {
  it('рендерит строки и колонки', () => {
    render(
      <TestForm defaultValues={{ satisfaction: {} }}>
        <FieldMatrixChoice name="satisfaction" label="Оцените" rows={rows} columns={columns} />
      </TestForm>,
    )

    expect(screen.getByText('Оцените')).toBeInTheDocument()
    expect(screen.getByText('Скорость доставки')).toBeInTheDocument()
    expect(screen.getByText('Отлично')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(6)
  })

  it('radio-вариант: выбирает одну колонку в строке', () => {
    render(
      <TestForm defaultValues={{ satisfaction: {} }}>
        <FieldMatrixChoice name="satisfaction" label="Оцените" rows={rows} columns={columns} />
      </TestForm>,
    )

    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[1])
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
  })

  it('checkbox-вариант: множественный выбор в строке', () => {
    render(
      <TestForm defaultValues={{ satisfaction: {} }}>
        <FieldMatrixChoice name="satisfaction" label="Оцените" rows={rows} columns={columns} variant="checkbox" />
      </TestForm>,
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).toBeChecked()
  })

  it('rating-вариант: рендерит звёзды с aria-pressed', () => {
    render(
      <TestForm defaultValues={{ satisfaction: {} }}>
        <FieldMatrixChoice name="satisfaction" label="Оцените" rows={rows} columns={columns} variant="rating" />
      </TestForm>,
    )

    const stars = screen.getAllByRole('button')
    fireEvent.click(stars[2])
    expect(stars[2]).toHaveAttribute('aria-pressed', 'true')
  })

  it('disabled блокирует выбор', () => {
    render(
      <TestForm defaultValues={{ satisfaction: {} }}>
        <FieldMatrixChoice name="satisfaction" label="Оцените" rows={rows} columns={columns} disabled />
      </TestForm>,
    )

    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[0])
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
  })
})
