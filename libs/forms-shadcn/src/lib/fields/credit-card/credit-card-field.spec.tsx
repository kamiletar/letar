import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CreditCardField } from './credit-card-field'

describe('CreditCardField (shadcn)', () => {
  it('рендерит label и три поля ввода', () => {
    render(
      <TestForm defaultValues={{ card: {} }}>
        <CreditCardField name="card" label="Данные карты" />
      </TestForm>,
    )

    expect(screen.getByText('Данные карты')).toBeInTheDocument()
    expect(screen.getByLabelText('Номер карты')).toBeInTheDocument()
    expect(screen.getByLabelText('Срок действия')).toBeInTheDocument()
  })

  it('форматирует номер карты с пробелами (Visa, 4-4-4-4)', () => {
    render(
      <TestForm defaultValues={{ card: {} }}>
        <CreditCardField name="card" />
      </TestForm>,
    )

    const numberInput = screen.getByLabelText('Номер карты') as HTMLInputElement
    fireEvent.change(numberInput, { target: { value: '4111111111111111' } })

    expect(numberInput.value).toBe('4111 1111 1111 1111')
  })

  it('показывает ошибку невалидного номера (Luhn) на blur', () => {
    render(
      <TestForm defaultValues={{ card: {} }}>
        <CreditCardField name="card" />
      </TestForm>,
    )

    const numberInput = screen.getByLabelText('Номер карты')
    fireEvent.change(numberInput, { target: { value: '4111111111111112' } })
    fireEvent.blur(numberInput)

    expect(screen.getByText('Некорректный номер карты')).toBeInTheDocument()
  })

  it('smart expiry: одиночная цифра >1 дополняется нулём слева', () => {
    render(
      <TestForm defaultValues={{ card: {} }}>
        <CreditCardField name="card" />
      </TestForm>,
    )

    const expiryInput = screen.getByLabelText('Срок действия') as HTMLInputElement
    fireEvent.change(expiryInput, { target: { value: '2' } })

    expect(expiryInput.value).toBe('02')
  })
})
