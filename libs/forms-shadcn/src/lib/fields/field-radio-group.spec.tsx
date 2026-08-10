import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldRadioGroup } from './field-radio-group'

const options = [
  { label: 'Малый', value: 'sm' },
  { label: 'Средний', value: 'md' },
]

describe('FieldRadioGroup (shadcn)', () => {
  it('рендерит все опции с меткой', () => {
    render(
      <TestForm defaultValues={{ size: 'sm' }}>
        <FieldRadioGroup name="size" label="Размер" options={options} />
      </TestForm>,
    )

    expect(screen.getByText('Размер')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(2)
  })

  it('выбранная опция отмечена', () => {
    render(
      <TestForm defaultValues={{ size: 'md' }}>
        <FieldRadioGroup name="size" label="Размер" options={options} />
      </TestForm>,
    )

    const [small, medium] = screen.getAllByRole('radio')
    expect(medium).toHaveAttribute('data-state', 'checked')
    expect(small).toHaveAttribute('data-state', 'unchecked')
  })

  it('клик по опции переключает значение', () => {
    render(
      <TestForm defaultValues={{ size: 'sm' }}>
        <FieldRadioGroup name="size" label="Размер" options={options} />
      </TestForm>,
    )

    const [, medium] = screen.getAllByRole('radio')
    fireEvent.click(medium)
    expect(medium).toHaveAttribute('data-state', 'checked')
  })
})
