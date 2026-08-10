import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldCurrency } from './field-currency'

describe('FieldCurrency (shadcn)', () => {
  it('рендерит NumberInput и символ рубля по умолчанию', () => {
    render(
      <TestForm defaultValues={{ price: 100 }}>
        <FieldCurrency name="price" label="Цена" />
      </TestForm>,
    )

    expect(screen.getByText('Цена')).toBeInTheDocument()
    expect(document.querySelector('input[type="number"]')).toHaveValue(100)
    expect(screen.getByText('₽')).toBeInTheDocument()
  })

  it('currency="USD" показывает символ доллара', () => {
    render(
      <TestForm defaultValues={{ price: 0 }}>
        <FieldCurrency name="price" currency="USD" />
      </TestForm>,
    )

    expect(screen.getByText('$')).toBeInTheDocument()
  })

  it('изменение значения обновляет число', () => {
    render(
      <TestForm defaultValues={{ price: 0 }}>
        <FieldCurrency name="price" />
      </TestForm>,
    )

    const input = document.querySelector('input[type="number"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: '250.50' } })

    expect(input).toHaveValue(250.5)
  })

  // @ts-expect-error — min обязан быть number, негативный контроль типов
  const _typeCheck = <FieldCurrency name="price" min="0" />
})
