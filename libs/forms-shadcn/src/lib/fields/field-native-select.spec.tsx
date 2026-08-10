import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldNativeSelect } from './field-native-select'

const options = [
  { label: 'Первый', value: 'opt1' },
  { label: 'Второй', value: 'opt2' },
]

describe('FieldNativeSelect (shadcn)', () => {
  it('рендерит опции и начальное значение', () => {
    render(
      <TestForm defaultValues={{ type: 'opt2' }}>
        <FieldNativeSelect name="type" label="Тип" options={options} />
      </TestForm>,
    )

    expect(screen.getByText('Тип')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('opt2')
  })

  it('меняет значение при выборе', () => {
    render(
      <TestForm defaultValues={{ type: 'opt1' }}>
        <FieldNativeSelect name="type" label="Тип" options={options} />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'opt2' } })
    expect(screen.getByRole('combobox')).toHaveValue('opt2')
  })
})
