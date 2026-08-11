import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldTime } from './field-time'

describe('FieldTime (shadcn)', () => {
  it('рендерит с меткой и начальным значением', () => {
    const { container } = render(
      <TestForm defaultValues={{ startTime: '09:00' }}>
        <FieldTime name="startTime" label="Начало" />
      </TestForm>,
    )

    expect(screen.getByText('Начало')).toBeInTheDocument()
    const input = container.querySelector('input[type="time"]')
    expect(input).toHaveValue('09:00')
  })

  it('обновляет значение поля формы', () => {
    const { container } = render(
      <TestForm defaultValues={{ startTime: '' }}>
        <FieldTime name="startTime" label="Начало" />
      </TestForm>,
    )

    const input = container.querySelector('input[type="time"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: '14:30' } })
    expect(input).toHaveValue('14:30')
  })

  it('передаёт min/max/step в нативный инпут', () => {
    const { container } = render(
      <TestForm defaultValues={{ startTime: '' }}>
        <FieldTime name="startTime" label="Начало" min="08:00" max="20:00" step={60} />
      </TestForm>,
    )

    const input = container.querySelector('input[type="time"]')
    expect(input).toHaveAttribute('min', '08:00')
    expect(input).toHaveAttribute('max', '20:00')
    expect(input).toHaveAttribute('step', '60')
  })
})
