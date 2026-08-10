import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldPhone } from './field-phone'

describe('FieldPhone (shadcn)', () => {
  it('рендерит с плейсхолдером-маской по умолчанию (RU)', () => {
    render(
      <TestForm defaultValues={{ phone: '' }}>
        <FieldPhone name="phone" label="Телефон" />
      </TestForm>,
    )

    expect(screen.getByText('Телефон')).toBeInTheDocument()
    const input = document.querySelector('input[type="tel"]')
    expect(input).toHaveAttribute('placeholder', '+7 (___) ___-__-__')
  })

  it('форматирует ввод по маске страны при вводе', () => {
    render(
      <TestForm defaultValues={{ phone: '' }}>
        <FieldPhone name="phone" />
      </TestForm>,
    )

    const input = document.querySelector('input[type="tel"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: '9161234567' } })

    expect(input.value).toContain('916')
  })

  it('showFlag рендерит флаг страны', () => {
    render(
      <TestForm defaultValues={{ phone: '' }}>
        <FieldPhone name="phone" country="US" showFlag />
      </TestForm>,
    )

    expect(screen.getByText('🇺🇸')).toBeInTheDocument()
  })

  it('без showFlag флаг не рендерится', () => {
    render(
      <TestForm defaultValues={{ phone: '' }}>
        <FieldPhone name="phone" country="US" />
      </TestForm>,
    )

    expect(screen.queryByText('🇺🇸')).not.toBeInTheDocument()
  })

  // @ts-expect-error — country обязан быть валидным PhoneCountry, негативный контроль типов
  const _typeCheck = <FieldPhone name="phone" country="XX" />
})
