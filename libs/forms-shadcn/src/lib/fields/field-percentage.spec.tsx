import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldPercentage } from './field-percentage'

describe('FieldPercentage (shadcn)', () => {
  it('рендерит NumberInput и знак процента', () => {
    render(
      <TestForm defaultValues={{ discount: 15 }}>
        <FieldPercentage name="discount" label="Скидка" />
      </TestForm>,
    )

    expect(screen.getByText('Скидка')).toBeInTheDocument()
    expect(document.querySelector('input[type="number"]')).toHaveValue(15)
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('дефолтные min/max — 0 и 100', () => {
    render(
      <TestForm defaultValues={{ discount: 0 }}>
        <FieldPercentage name="discount" />
      </TestForm>,
    )

    const input = document.querySelector('input[type="number"]')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '100')
  })

  it('изменение значения обновляет число', () => {
    render(
      <TestForm defaultValues={{ discount: 0 }}>
        <FieldPercentage name="discount" />
      </TestForm>,
    )

    const input = document.querySelector('input[type="number"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: '42' } })

    expect(input).toHaveValue(42)
  })

  // @ts-expect-error — max обязан быть number, негативный контроль типов
  const _typeCheck = <FieldPercentage name="discount" max="100" />
})
