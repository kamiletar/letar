import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldTextarea } from './field-textarea'

describe('FieldTextarea (shadcn)', () => {
  it('рендерит с меткой и начальным значением', () => {
    render(
      <TestForm defaultValues={{ bio: 'Привет' }}>
        <FieldTextarea name="bio" label="О себе" />
      </TestForm>,
    )

    expect(screen.getByText('О себе')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('Привет')
  })

  it('меняет значение при вводе', () => {
    render(
      <TestForm defaultValues={{ bio: '' }}>
        <FieldTextarea name="bio" label="О себе" />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Новый текст' } })
    expect(screen.getByRole('textbox')).toHaveValue('Новый текст')
  })
})
