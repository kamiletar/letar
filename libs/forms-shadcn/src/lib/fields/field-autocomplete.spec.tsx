import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldAutocomplete } from './field-autocomplete'

const suggestions = ['Moscow', 'Saint Petersburg', 'Kazan', 'Novosibirsk']

describe('FieldAutocomplete (shadcn)', () => {
  it('рендерит label и placeholder', () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldAutocomplete name="city" label="Город" suggestions={suggestions} />
      </TestForm>,
    )

    expect(screen.getByText('Город')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Начните вводить...')
  })

  it('фильтрует подсказки по вводу', () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldAutocomplete name="city" suggestions={suggestions} />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ka' } })
    expect(screen.getByRole('option', { name: 'Kazan' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Moscow' })).not.toBeInTheDocument()
  })

  it('принимает произвольный текст, не входящий в suggestions (allowCustomValue)', () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldAutocomplete name="city" suggestions={suggestions} />
      </TestForm>,
    )

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'Владивосток' } })

    expect(input).toHaveValue('Владивосток')
  })

  it('выбор подсказки кликом обновляет значение', () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldAutocomplete name="city" suggestions={suggestions} />
      </TestForm>,
    )

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'mo' } })
    fireEvent.click(screen.getByRole('option', { name: 'Moscow' }))

    expect(input).toHaveValue('Moscow')
  })

  it('без suggestions — опций нет', () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldAutocomplete name="city" />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'test' } })
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  // @ts-expect-error — minChars обязан быть number, негативный контроль типов
  const _typeCheck = <FieldAutocomplete name="city" minChars="1" />
})
