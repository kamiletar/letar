import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldDateTimePicker } from './field-datetime-picker'

describe('FieldDateTimePicker (shadcn)', () => {
  it('рендерит date и time инпуты, разбирает ISO-значение', () => {
    render(
      <TestForm defaultValues={{ appointmentAt: '2026-08-10T14:30:00' }}>
        <FieldDateTimePicker name="appointmentAt" label="Встреча" />
      </TestForm>,
    )

    expect(screen.getByText('Встреча')).toBeInTheDocument()
    const dateInput = document.querySelector('input[type="date"]')
    const timeInput = document.querySelector('input[type="time"]')
    expect(dateInput).toHaveValue('2026-08-10')
    expect(timeInput).toHaveValue('14:30')
  })

  it('изменение даты сохраняет время и собирает ISO-строку', () => {
    render(
      <TestForm defaultValues={{ appointmentAt: '2026-08-10T14:30:00' }}>
        <FieldDateTimePicker name="appointmentAt" />
      </TestForm>,
    )

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-09-01' } })

    expect(dateInput).toHaveValue('2026-09-01')
    const timeInput = document.querySelector('input[type="time"]')
    expect(timeInput).toHaveValue('14:30')
  })

  it('изменение времени сохраняет дату', () => {
    render(
      <TestForm defaultValues={{ appointmentAt: '2026-08-10T14:30:00' }}>
        <FieldDateTimePicker name="appointmentAt" />
      </TestForm>,
    )

    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement
    fireEvent.change(timeInput, { target: { value: '09:15' } })

    expect(timeInput).toHaveValue('09:15')
    const dateInput = document.querySelector('input[type="date"]')
    expect(dateInput).toHaveValue('2026-08-10')
  })

  it('пустое значение — оба инпута пустые', () => {
    render(
      <TestForm defaultValues={{ appointmentAt: '' }}>
        <FieldDateTimePicker name="appointmentAt" />
      </TestForm>,
    )

    expect(document.querySelector('input[type="date"]')).toHaveValue('')
    expect(document.querySelector('input[type="time"]')).toHaveValue('')
  })

  it('minDateTime/maxDateTime как Date конвертируются в min/max date-инпута', () => {
    render(
      <TestForm defaultValues={{ appointmentAt: '' }}>
        <FieldDateTimePicker
          name="appointmentAt"
          minDateTime={new Date('2026-01-01T00:00:00Z')}
          maxDateTime={new Date('2026-12-31T00:00:00Z')}
        />
      </TestForm>,
    )

    const dateInput = document.querySelector('input[type="date"]')
    expect(dateInput).toHaveAttribute('min', '2026-01-01')
    expect(dateInput).toHaveAttribute('max', '2026-12-31')
  })

  // @ts-expect-error — timeStep обязан быть number, негативный контроль типов
  const _typeCheck = <FieldDateTimePicker name="appointmentAt" timeStep="15" />
})
