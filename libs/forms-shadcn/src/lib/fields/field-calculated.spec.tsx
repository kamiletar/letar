import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldCalculated } from './field-calculated'
import { FieldNumber } from './field-number'

describe('FieldCalculated (shadcn)', () => {
  it('вычисляет значение из других полей формы', () => {
    render(
      <TestForm defaultValues={{ price: 100, qty: 2, total: 0 }}>
        <FieldNumber name="price" label="Цена" />
        <FieldNumber name="qty" label="Количество" />
        <FieldCalculated name="total" label="Итого" compute={(v) => (v.price as number) * (v.qty as number)} />
      </TestForm>,
    )

    expect(screen.getByTestId('calculated-value')).toHaveTextContent('200')
  })

  it('пересчитывает при изменении зависимого поля', async () => {
    render(
      <TestForm defaultValues={{ price: 100, qty: 2, total: 0 }}>
        <FieldNumber name="price" label="Цена" />
        <FieldNumber name="qty" label="Количество" />
        <FieldCalculated
          name="total"
          label="Итого"
          compute={(v) => (v.price as number) * (v.qty as number)}
          deps={['price', 'qty']}
        />
      </TestForm>,
    )

    const priceInput = screen.getAllByRole('spinbutton')[0]
    fireEvent.change(priceInput, { target: { value: '50' } })

    expect(await screen.findByText('100')).toBeInTheDocument()
  })

  it('применяет format к отображаемому значению', () => {
    render(
      <TestForm defaultValues={{ price: 1500, qty: 1, total: 0 }}>
        <FieldCalculated
          name="total"
          label="Итого"
          compute={(v) => (v.price as number) * (v.qty as number)}
          format={(v) => `${Number(v).toLocaleString('ru-RU')} ₽`}
        />
      </TestForm>,
    )

    expect(screen.getByTestId('calculated-value')).toHaveTextContent('1 500 ₽')
  })

  it('hidden не рендерит визуальный вывод', () => {
    render(
      <TestForm defaultValues={{ price: 100, qty: 2, total: 0 }}>
        <FieldCalculated name="total" compute={(v) => (v.price as number) * (v.qty as number)} hidden />
      </TestForm>,
    )

    expect(screen.queryByTestId('calculated-value')).not.toBeInTheDocument()
  })

  it('сохраняет вычисленное значение в form state (не только визуально)', () => {
    render(
      <TestForm defaultValues={{ price: 100, qty: 2, total: 0 }}>
        <FieldCalculated name="total" compute={(v) => (v.price as number) * (v.qty as number)} />
        {/* Второе поле, читающее то же значение из form state, подтверждает синхронизацию через field.handleChange */}
        <FieldCalculated name="totalEcho" compute={(v) => v.total} label="Эхо" />
      </TestForm>,
    )

    const values = screen.getAllByTestId('calculated-value')
    expect(values[1]).toHaveTextContent('200')
  })
})
