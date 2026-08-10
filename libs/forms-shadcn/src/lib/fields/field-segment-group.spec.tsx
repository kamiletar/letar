import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldSegmentGroup } from './field-segment-group'

const options = [
  { label: 'Месяц', value: 'monthly' },
  { label: 'Год', value: 'yearly' },
]

describe('FieldSegmentGroup (shadcn)', () => {
  it('рендерит все сегменты', () => {
    render(
      <TestForm defaultValues={{ billing: 'monthly' }}>
        <FieldSegmentGroup name="billing" label="Тариф" options={options} />
      </TestForm>,
    )

    expect(screen.getByText('Тариф')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Месяц' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Год' })).toBeInTheDocument()
  })

  it('клик по сегменту переключает значение', () => {
    render(
      <TestForm defaultValues={{ billing: 'monthly' }}>
        <FieldSegmentGroup name="billing" label="Тариф" options={options} />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('radio', { name: 'Год' }))
    expect(screen.getByRole('radio', { name: 'Год' })).toHaveAttribute('data-state', 'on')
  })
})
