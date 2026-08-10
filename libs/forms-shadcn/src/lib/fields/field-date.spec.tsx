import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldDate } from './field-date'

describe('FieldDate (shadcn)', () => {
  it('рендерит нативный input[type=date] с начальным значением', () => {
    render(
      <TestForm defaultValues={{ birthday: '2000-01-15' }}>
        <FieldDate name="birthday" label="Дата рождения" />
      </TestForm>,
    )

    expect(screen.getByText('Дата рождения')).toBeInTheDocument()
    const input = document.querySelector('input[type="date"]')
    expect(input).toHaveValue('2000-01-15')
  })

  it('меняет значение при вводе', () => {
    render(
      <TestForm defaultValues={{ birthday: '' }}>
        <FieldDate name="birthday" label="Дата рождения" />
      </TestForm>,
    )

    const input = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: '2026-08-10' } })
    expect(input).toHaveValue('2026-08-10')
  })
})
