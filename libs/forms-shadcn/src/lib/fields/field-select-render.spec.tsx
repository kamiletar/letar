import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { FieldCombobox } from './field-combobox'
import { FieldSelect } from './field-select'

interface City {
  id: number
  name: string
  region: string
}

const cities: City[] = [
  { id: 1, name: 'Москва', region: 'Центр' },
  { id: 2, name: 'Казань', region: 'Поволжье' },
]

const cityOptions = cities.map((c) => ({
  value: c.id,
  label: <em data-testid={`node-${c.id}`}>{c.name}</em>,
  textValue: c.name,
  data: c,
}))

beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const open = () => fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })

describe('FieldSelect (shadcn) — renderOption / renderValue / textValue / data', () => {
  it('renderOption получает опцию с data и состояние selected', () => {
    render(
      <TestForm defaultValues={{ city: '2' }}>
        <FieldSelect
          name="city"
          options={cityOptions}
          renderOption={(o, s) => <span data-testid="opt">{o.data?.name}:{o.data?.region}:{String(s.selected)}</span>}
        />
      </TestForm>,
    )
    open()
    const items = screen.getAllByTestId('opt')
    expect(items.map((i) => i.textContent)).toEqual(['Москва:Центр:false', 'Казань:Поволжье:true'])
  })

  it('без renderOption ReactNode-label рисуется узлом в списке', () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldSelect name="city" options={cityOptions} />
      </TestForm>,
    )
    open()
    expect(screen.getByTestId('node-1')).toHaveTextContent('Москва')
  })

  it('подпись триггера без renderValue — textValue, а не узел', () => {
    render(
      <TestForm defaultValues={{ city: '1' }}>
        <FieldSelect name="city" options={cityOptions} />
      </TestForm>,
    )
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveTextContent('Москва')
    expect(trigger.querySelector('em')).toBeNull()
  })

  it('renderValue рисует свою подпись; пустой результат — откат к тексту опции', () => {
    const { unmount } = render(
      <TestForm defaultValues={{ city: '1' }}>
        <FieldSelect name="city" options={cityOptions} renderValue={(o) => <b>{o.data?.region}</b>} />
      </TestForm>,
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('Центр')
    unmount()

    render(
      <TestForm defaultValues={{ city: '1' }}>
        <FieldSelect name="city" options={cityOptions} renderValue={() => null} />
      </TestForm>,
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('Москва')
  })

  it('пока ничего не выбрано, виден placeholder, renderValue не вызывается', () => {
    const renderValue = vi.fn(() => <b>x</b>)
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldSelect name="city" options={cityOptions} placeholder="Город" renderValue={renderValue} />
      </TestForm>,
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('Город')
    expect(renderValue).not.toHaveBeenCalled()
  })

  it('служебный пункт создания не проходит через renderOption', () => {
    const renderOption = vi.fn((o: { label: unknown }) => <span>{o.label as string}</span>)
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldSelect name="city" options={cityOptions} renderOption={renderOption} onCreate={vi.fn()} />
      </TestForm>,
    )
    open()
    expect(screen.getByRole('option', { name: /Добавить/ })).toBeInTheDocument()
    expect(renderOption.mock.calls.some(([o]) => String(o.label).startsWith('+ '))).toBe(false)
  })

  it('регрессия: опция со значением "" остаётся выбранной и подписанной', () => {
    render(
      <TestForm defaultValues={{ c: '' }}>
        <FieldSelect
          name="c"
          placeholder="Выберите"
          options={[
            { label: 'Все категории', value: '' },
            { label: 'React', value: 'react' },
          ]}
        />
      </TestForm>,
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('Все категории')
  })

  it('dev-предупреждение: узел без textValue — один раз на поле', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { rerender } = render(
      <TestForm defaultValues={{ c: '' }}>
        <FieldSelect name="c" options={[{ label: <b>A</b>, value: 'a' }]} />
      </TestForm>,
    )
    rerender(
      <TestForm defaultValues={{ c: '' }}>
        <FieldSelect name="c" options={[{ label: <b>A</b>, value: 'a' }, { label: <b>B</b>, value: 'b' }]} />
      </TestForm>,
    )
    expect(warn.mock.calls.filter(([m]) => String(m).includes('textValue'))).toHaveLength(1)
  })
})

describe('FieldCombobox (shadcn) — renderOption / textValue / data', () => {
  it('renderOption получает data', async () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldCombobox
          name="city"
          options={cityOptions}
          renderOption={(o) => <span data-testid="opt">{o.data?.name}|{o.data?.region}</span>}
        />
      </TestForm>,
    )
    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.getAllByTestId('opt').map((i) => i.textContent)).toEqual(['Москва|Центр', 'Казань|Поволжье'])
  })

  it('фильтр идёт по textValue при узле в label', async () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldCombobox name="city" options={cityOptions} />
      </TestForm>,
    )
    await userEvent.type(screen.getByRole('combobox'), 'Каз')
    expect(screen.getByTestId('node-2')).toBeInTheDocument()
    expect(screen.queryByTestId('node-1')).not.toBeInTheDocument()
  })

  it('служебный пункт создания не проходит через renderOption', async () => {
    const renderOption = vi.fn(() => <span>x</span>)
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldCombobox name="city" options={cityOptions} renderOption={renderOption} onCreate={vi.fn()} />
      </TestForm>,
    )
    await userEvent.type(screen.getByRole('combobox'), 'Нов')
    expect(screen.getByRole('option', { name: '+ Добавить "Нов"' })).toBeInTheDocument()
    const labels = renderOption.mock.calls.map(([o]) => String((o as { label: unknown }).label))
    expect(labels.some((l) => l.startsWith('+ '))).toBe(false)
  })
})
