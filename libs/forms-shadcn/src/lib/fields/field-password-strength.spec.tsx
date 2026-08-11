import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldPasswordStrength } from './field-password-strength'

describe('FieldPasswordStrength (shadcn)', () => {
  it('рендерит с меткой, без индикатора при пустом значении', () => {
    render(
      <TestForm defaultValues={{ password: '' }}>
        <FieldPasswordStrength name="password" label="Пароль" />
      </TestForm>,
    )

    expect(screen.getByText('Пароль')).toBeInTheDocument()
    expect(screen.queryByText('Надёжность')).not.toBeInTheDocument()
  })

  it('показывает индикатор силы и чеклист при вводе', () => {
    render(
      <TestForm defaultValues={{ password: '' }}>
        <FieldPasswordStrength name="password" label="Пароль" />
      </TestForm>,
    )

    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'weak' } })
    expect(screen.getByText('Надёжность')).toBeInTheDocument()
    expect(screen.getByText('Минимум 8 символов')).toBeInTheDocument()
  })

  it('сильный пароль удовлетворяет всем требованиям по умолчанию', () => {
    render(
      <TestForm defaultValues={{ password: '' }}>
        <FieldPasswordStrength name="password" label="Пароль" />
      </TestForm>,
    )

    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'Str0ng!Pass' } })
    expect(screen.getByText('Сильный')).toBeInTheDocument()
  })

  it('переключает видимость пароля', () => {
    render(
      <TestForm defaultValues={{ password: 'secret' }}>
        <FieldPasswordStrength name="password" label="Пароль" />
      </TestForm>,
    )

    const input = screen.getByPlaceholderText('Введите пароль')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Показать/скрыть пароль' }))
    expect(input).toHaveAttribute('type', 'text')
  })

  it('кастомный список требований', () => {
    render(
      <TestForm defaultValues={{ password: '' }}>
        <FieldPasswordStrength name="password" label="Пароль" requirements={['minLength:8', 'number']} />
      </TestForm>,
    )

    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'abc' } })
    expect(screen.getByText('Минимум 8 символов')).toBeInTheDocument()
    expect(screen.getByText('Хотя бы одна цифра')).toBeInTheDocument()
    expect(screen.queryByText('Хотя бы одна заглавная буква')).not.toBeInTheDocument()
  })

  it('showRequirements=false скрывает чеклист', () => {
    render(
      <TestForm defaultValues={{ password: '' }}>
        <FieldPasswordStrength name="password" label="Пароль" showRequirements={false} />
      </TestForm>,
    )

    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'abc' } })
    expect(screen.getByText('Надёжность')).toBeInTheDocument()
    expect(screen.queryByText('Минимум 8 символов')).not.toBeInTheDocument()
  })
})
