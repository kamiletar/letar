import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { FieldCombobox } from './field-combobox'
import { FieldSelect } from './field-select'

const options = [
  { value: 'msk', label: 'Москва', description: 'ул. Тверская, 1' },
  { value: 'kzn', label: 'Казань', description: 'ул. Баумана, 5' },
  { value: 'spb', label: 'Санкт-Петербург' },
  { value: 'nsk', label: 'Новосибирск', description: <em data-testid="node-desc">узел</em> },
]

beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const descriptions = (slot: string) =>
  Array.from(document.querySelectorAll(`[data-slot="${slot}"]`)).map((el) => el.textContent)
const openSelect = () => fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })

describe('FieldSelect (shadcn) — description (вторая строка опции)', () => {
  it('описание — второй строкой в списке, узел тоже; у опции без описания строки нет', () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldSelect name="city" options={options} />
      </TestForm>,
    )
    openSelect()
    expect(descriptions('select-item-description')).toEqual(['ул. Тверская, 1', 'ул. Баумана, 5', 'узел'])
    expect(screen.getByTestId('node-desc')).toBeInTheDocument()
  })

  it('в триггере выбранного значения только подпись, без описания', () => {
    render(
      <TestForm defaultValues={{ city: 'msk' }}>
        <FieldSelect name="city" options={options} />
      </TestForm>,
    )
    const trigger = screen.getByRole('combobox')
    expect(within(trigger).getByText('Москва')).toBeInTheDocument()
    expect(trigger.textContent).not.toContain('Тверская')
  })

  it('со своим renderOption вторую строку рисует приложение, поле её не добавляет', () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldSelect name="city" options={options} renderOption={(o) => <span>{o.label}</span>} />
      </TestForm>,
    )
    openSelect()
    expect(descriptions('select-item-description')).toEqual([])
  })

  it('loadOptions + getDescription: вторая строка у загруженных записей', async () => {
    type User = { id: string; name: string; email: string }
    const users: User[] = [
      { id: 'u1', name: 'Анна', email: 'anna@x.ru' },
      { id: 'u2', name: 'Борис', email: 'boris@x.ru' },
    ]
    render(
      <TestForm defaultValues={{ userId: '' }}>
        <FieldSelect
          name="userId"
          loadOptions={() => Promise.resolve(users)}
          getLabel={(u: User) => u.name}
          getValue={(u: User) => u.id}
          getDescription={(u: User) => u.email}
        />
      </TestForm>,
    )
    await screen.findByRole('combobox')
    await vi.waitFor(() => {
      openSelect()
      expect(descriptions('select-item-description')).toEqual(['anna@x.ru', 'boris@x.ru'])
    })
  })
})

describe('FieldCombobox (shadcn) — description (вторая строка опции)', () => {
  it('описание в списке; после выбора в инпуте только подпись', async () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldCombobox name="city" options={options} minChars={0} />
      </TestForm>,
    )
    const input = screen.getByRole('combobox') as HTMLInputElement
    fireEvent.focus(input)
    expect(descriptions('combobox-item-description')).toEqual(['ул. Тверская, 1', 'ул. Баумана, 5', 'узел'])
    await userEvent.click(screen.getByRole('option', { name: /Казань/ }))
    expect(input.value).toBe('Казань')
  })

  it('локальный поиск идёт и по описанию', () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldCombobox name="city" options={options} />
      </TestForm>,
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'тверск' } })
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option').textContent).toContain('Москва')
  })

  it('searchInDescription={false}: описание не ищется', () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldCombobox name="city" options={options} searchInDescription={false} />
      </TestForm>,
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'тверск' } })
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })
})
