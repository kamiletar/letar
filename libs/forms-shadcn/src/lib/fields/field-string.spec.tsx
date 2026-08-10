import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TestForm } from '../testing/test-form'
import { FieldString } from './field-string'

describe('FieldString (shadcn)', () => {
  it('рендерит label и текущее значение', () => {
    render(
      <TestForm defaultValues={{ title: 'Привет' }}>
        <FieldString name="title" label="Название" />
      </TestForm>,
    )

    expect(screen.getByText('Название')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('Привет')
  })

  it('обновляет значение поля формы при вводе', () => {
    render(
      <TestForm defaultValues={{ title: '' }}>
        <FieldString name="title" label="Название" />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'новое' } })
    expect(screen.getByRole('textbox')).toHaveValue('новое')
  })

  it('показывает required-маркер', () => {
    render(
      <TestForm defaultValues={{ title: '' }}>
        <FieldString name="title" label="Название" required />
      </TestForm>,
    )

    expect(screen.getByText('*')).toBeInTheDocument()
  })
})
