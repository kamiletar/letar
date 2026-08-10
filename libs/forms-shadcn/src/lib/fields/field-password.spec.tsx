import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldPassword } from './field-password'

describe('FieldPassword (shadcn)', () => {
  it('по умолчанию type=password', () => {
    render(
      <TestForm defaultValues={{ password: 'secret' }}>
        <FieldPassword name="password" label="Пароль" />
      </TestForm>,
    )

    const input = document.querySelector('input[data-field-name="password"]')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('переключает видимость по клику на кнопку', () => {
    render(
      <TestForm defaultValues={{ password: 'secret' }}>
        <FieldPassword name="password" label="Пароль" />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Показать/скрыть пароль' }))
    const input = document.querySelector('input[data-field-name="password"]')
    expect(input).toHaveAttribute('type', 'text')
  })
})
