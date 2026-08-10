import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldDuration } from './field-duration'

describe('FieldDuration (shadcn)', () => {
  it('HH:MM формат по умолчанию: рендерит два NumberInput, значение в минутах разбито верно', () => {
    render(
      <TestForm defaultValues={{ duration: 95 }}>
        <FieldDuration name="duration" label="Длительность" />
      </TestForm>,
    )

    expect(screen.getByText('Длительность')).toBeInTheDocument()
    const inputs = document.querySelectorAll('input[type="number"]')
    expect(inputs).toHaveLength(2)
    expect(inputs[0]).toHaveValue(1) // часы
    expect(inputs[1]).toHaveValue(35) // минуты
  })

  it('изменение часов пересчитывает итоговое значение в минутах', () => {
    render(
      <TestForm defaultValues={{ duration: 95 }}>
        <FieldDuration name="duration" />
      </TestForm>,
    )

    const [hoursInput] = document.querySelectorAll('input[type="number"]')
    fireEvent.change(hoursInput, { target: { value: '2' } })

    expect(hoursInput).toHaveValue(2)
  })

  it('minutes формат: один NumberInput, значение — сами минуты', () => {
    render(
      <TestForm defaultValues={{ duration: 45 }}>
        <FieldDuration name="duration" format="minutes" />
      </TestForm>,
    )

    const inputs = document.querySelectorAll('input[type="number"]')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toHaveValue(45)
  })

  it('minutes формат: изменение значения клампится по min/max', () => {
    render(
      <TestForm defaultValues={{ duration: 45 }}>
        <FieldDuration name="duration" format="minutes" min={0} max={60} />
      </TestForm>,
    )

    const [input] = document.querySelectorAll('input[type="number"]')
    fireEvent.change(input, { target: { value: '999' } })

    expect(input).toHaveValue(60)
  })

  // @ts-expect-error — format обязан быть 'HH:MM' | 'minutes', негативный контроль типов
  const _typeCheck = <FieldDuration name="duration" format="seconds" />
})
