import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldCheckbox } from './field-checkbox'

describe('FieldCheckbox (shadcn)', () => {
  it('рендерит с меткой и начальным значением', () => {
    render(
      <TestForm defaultValues={{ agree: false }}>
        <FieldCheckbox name="agree" label="Согласен" />
      </TestForm>,
    )

    expect(screen.getByText('Согласен')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('переключается по клику', () => {
    render(
      <TestForm defaultValues={{ agree: false }}>
        <FieldCheckbox name="agree" label="Согласен" />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('checkbox')).toBeChecked()
  })
})
