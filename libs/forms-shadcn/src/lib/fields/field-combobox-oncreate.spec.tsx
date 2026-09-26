import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FieldCombobox } from './field-combobox'

const options = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
]

function setup(props: Record<string, unknown>, initial = '') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
  let form: any
  render(
    <TestForm defaultValues={{ framework: initial }} onFormReady={(f) => (form = f)}>
      <FieldCombobox name="framework" options={options} {...props} />
    </TestForm>,
  )
  return { values: () => form.state.values as { framework: string } }
}

describe('FieldCombobox (shadcn) — onCreate', () => {
  it('без onCreate пункта создания нет', () => {
    setup({})
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Solid' } })
    expect(screen.queryByRole('option', { name: /Добавить/ })).not.toBeInTheDocument()
  })

  it('с onCreate и поиском без точного совпадения — «+ Добавить "<поиск>"»', () => {
    setup({ onCreate: vi.fn() })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Solid' } })
    expect(screen.getByRole('option', { name: '+ Добавить "Solid"' })).toBeInTheDocument()
  })

  it('точное совпадение не предлагает создание', () => {
    setup({ onCreate: vi.fn() })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'react' } })
    expect(screen.getByRole('option', { name: 'React' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Добавить/ })).not.toBeInTheDocument()
  })

  it('выбор пункта вызывает onCreate с текстом поиска; созданная опция выбирается', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Solid', value: 'solid' })
    const { values } = setup({ onCreate })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Sol' } })
    fireEvent.click(screen.getByRole('option', { name: '+ Добавить "Sol"' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Sol', expect.anything()))
    await waitFor(() => expect(values().framework).toBe('solid'))
    expect(screen.getByRole('combobox')).toHaveValue('Solid')
  })

  it('onCreate вернул null — значение не меняется, служебное значение в форму не попадает', async () => {
    const onCreate = vi.fn().mockResolvedValue(null)
    const { values } = setup({ onCreate }, 'react')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Sol' } })
    fireEvent.click(screen.getByRole('option', { name: '+ Добавить "Sol"' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(values().framework).toBe('react')
  })
})
