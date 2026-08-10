import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldCombobox } from './field-combobox'

const options = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
]

describe('FieldCombobox (shadcn)', () => {
  it('рендерит label и placeholder', () => {
    render(
      <TestForm defaultValues={{ framework: '' }}>
        <FieldCombobox name="framework" label="Фреймворк" placeholder="Поиск..." options={options} />
      </TestForm>,
    )

    expect(screen.getByText('Фреймворк')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Поиск...')
  })

  it('фильтрует опции по вводу', () => {
    render(
      <TestForm defaultValues={{ framework: '' }}>
        <FieldCombobox name="framework" label="Фреймворк" options={options} />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'vu' } })
    expect(screen.getByRole('option', { name: 'Vue' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'React' })).not.toBeInTheDocument()
  })

  it('выбор опции меняет значение поля и закрывает список', () => {
    render(
      <TestForm defaultValues={{ framework: '' }}>
        <FieldCombobox name="framework" label="Фреймворк" options={options} />
      </TestForm>,
    )

    fireEvent.focus(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: 'React' }))
    expect(screen.queryByRole('option', { name: 'React' })).not.toBeInTheDocument()
  })
})
