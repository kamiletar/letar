import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldDateRange } from './field-date-range'

describe('FieldDateRange (shadcn)', () => {
  it('рендерит два input[type=date] с лейблами С/По по умолчанию', () => {
    render(
      <TestForm defaultValues={{ period: { start: '', end: '' } }}>
        <FieldDateRange name="period" label="Период" />
      </TestForm>,
    )

    expect(screen.getByText('Период')).toBeInTheDocument()
    expect(screen.getByText('С')).toBeInTheDocument()
    expect(screen.getByText('По')).toBeInTheDocument()
    expect(document.querySelectorAll('input[type="date"]')).toHaveLength(2)
  })

  it('кастомные лейблы startLabel/endLabel', () => {
    render(
      <TestForm defaultValues={{ period: { start: '', end: '' } }}>
        <FieldDateRange name="period" startLabel="От" endLabel="До" />
      </TestForm>,
    )

    expect(screen.getByText('От')).toBeInTheDocument()
    expect(screen.getByText('До')).toBeInTheDocument()
  })

  it('изменение начала даты обновляет только start в значении', () => {
    render(
      <TestForm defaultValues={{ period: { start: '', end: '2026-08-20' } }}>
        <FieldDateRange name="period" />
      </TestForm>,
    )

    const [startInput, endInput] = document.querySelectorAll('input[type="date"]')
    fireEvent.change(startInput, { target: { value: '2026-08-10' } })

    expect(startInput).toHaveValue('2026-08-10')
    expect(endInput).toHaveValue('2026-08-20')
  })

  it('end.min синхронизируется с текущим start', () => {
    render(
      <TestForm defaultValues={{ period: { start: '2026-08-05', end: '' } }}>
        <FieldDateRange name="period" />
      </TestForm>,
    )

    const [, endInput] = document.querySelectorAll('input[type="date"]')
    expect(endInput).toHaveAttribute('min', '2026-08-05')
  })

  it('пресеты рендерятся и клик применяет диапазон', () => {
    render(
      <TestForm defaultValues={{ period: { start: '', end: '' } }}>
        <FieldDateRange name="period" presets={['today']} />
      </TestForm>,
    )

    const button = screen.getByRole('button', { name: 'Сегодня' })
    fireEvent.click(button)

    const [startInput, endInput] = document.querySelectorAll('input[type="date"]')
    const today = new Date().toISOString().split('T')[0]
    expect(startInput).toHaveValue(today)
    expect(endInput).toHaveValue(today)
  })

  it('без presets кнопки не рендерятся', () => {
    render(
      <TestForm defaultValues={{ period: { start: '', end: '' } }}>
        <FieldDateRange name="period" />
      </TestForm>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  // @ts-expect-error — orientation обязан быть 'horizontal' | 'vertical', негативный контроль типов
  const _typeCheck = <FieldDateRange name="period" orientation="diagonal" />
})
