import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldNumber } from './field-number'

describe('FieldNumber (shadcn)', () => {
  it('рендерит с начальным значением', () => {
    render(
      <TestForm defaultValues={{ portions: 4 }}>
        <FieldNumber name="portions" label="Порции" />
      </TestForm>,
    )

    expect(screen.getByText('Порции')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveValue(4)
  })

  it('пустое значение отдаёт null, не NaN', () => {
    render(
      <TestForm defaultValues={{ portions: 4 }}>
        <FieldNumber name="portions" label="Порции" />
      </TestForm>,
    )

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue(null)
  })

  it('передаёт min/max/step в input', () => {
    render(
      <TestForm defaultValues={{ portions: 4 }}>
        <FieldNumber name="portions" label="Порции" min={1} max={10} step={1} />
      </TestForm>,
    )

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('max', '10')
    expect(input).toHaveAttribute('step', '1')
  })
})
