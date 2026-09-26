import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

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
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const open = () => userEvent.click(screen.getByRole('combobox'))

describe('Field.Select — renderOption / renderValue / textValue / data', () => {
  it('renderOption получает опцию с data и состояние selected', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: 2 }} onSubmit={vi.fn()}>
          <Form.Field.Select
            name="city"
            valueType="number"
            options={cityOptions}
            renderOption={(o, s) => <span data-testid="opt">{o.data?.name}:{o.data?.region}:{String(s.selected)}</span>}
          />
        </Form>
      </TestWrapper>,
    )
    await open()
    const items = await screen.findAllByTestId('opt')
    expect(items.map((i) => i.textContent)).toEqual(['Москва:Центр:false', 'Казань:Поволжье:true'])
  })

  it('без renderOption ReactNode-label рисуется узлом, а не сплющивается в строку', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="city" options={cityOptions} />
        </Form>
      </TestWrapper>,
    )
    await open()
    expect(await screen.findByTestId('node-1')).toHaveTextContent('Москва')
  })

  it('подпись в триггере без renderValue — textValue, а не узел и не value', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: 1 }} onSubmit={vi.fn()}>
          <Form.Field.Select name="city" valueType="number" options={cityOptions} />
        </Form>
      </TestWrapper>,
    )
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Москва'))
    // Узел из label остаётся только в списке (закрытый Content уже в DOM), триггер — строка
    expect(screen.getByRole('combobox').querySelector('em')).toBeNull()
  })

  it('renderValue рисует свою подпись в триггере', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: 1 }} onSubmit={vi.fn()}>
          <Form.Field.Select
            name="city"
            valueType="number"
            options={cityOptions}
            renderValue={(o) => <b>{o.data?.region}</b>}
          />
        </Form>
      </TestWrapper>,
    )
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Центр'))
  })

  it('renderValue вернул null — откат к тексту опции', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ city: 1 }} onSubmit={vi.fn()}>
          <Form.Field.Select name="city" valueType="number" options={cityOptions} renderValue={() => null} />
        </Form>
      </TestWrapper>,
    )
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Москва'))
  })

  it('пока ничего не выбрано, показывается placeholder, renderValue не вызывается', () => {
    const renderValue = vi.fn(() => <b>x</b>)
    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="city" options={cityOptions} placeholder="Город" renderValue={renderValue} />
        </Form>
      </TestWrapper>,
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('Город')
    expect(renderValue).not.toHaveBeenCalled()
  })

  it('выбор пункта с renderOption отдаёт в форму value опции', async () => {
    const onSubmit = vi.fn()
    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={onSubmit}>
          <Form.Field.Select
            name="city"
            valueType="number"
            options={cityOptions}
            renderOption={(o) => <span>{o.data?.name}</span>}
          />
          <Form.Button.Submit>ok</Form.Button.Submit>
        </Form>
      </TestWrapper>,
    )
    await open()
    await userEvent.click(await screen.findByRole('option', { name: 'Казань' }))
    await userEvent.click(screen.getByText('ok'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ city: 2 })
  })

  it('служебный пункт «+ Добавить…» не проходит через renderOption', async () => {
    const renderOption = vi.fn((o: { label: ReactNode }) => <span>{o.label}</span>)
    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="city" options={cityOptions} renderOption={renderOption} onCreate={vi.fn()} />
        </Form>
      </TestWrapper>,
    )
    await open()
    expect(await screen.findByRole('option', { name: '+ Add…' })).toBeInTheDocument()
    expect(renderOption.mock.calls.every(([o]) => (o as { value: unknown }).value !== undefined)).toBe(true)
    expect(renderOption.mock.calls.some(([o]) => String((o as { label: unknown }).label).startsWith('+ '))).toBe(false)
  })

  it('регрессия: строковые label и value "" работают как раньше', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ c: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select
            name="c"
            options={[
              { label: 'Все', value: '' },
              { label: 'А', value: 'a' },
            ]}
          />
        </Form>
      </TestWrapper>,
    )
    await open()
    expect(await screen.findByRole('option', { name: 'Все' })).toBeInTheDocument()
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(2)
  })

  it('dev-предупреждение: узел без textValue — один раз на поле', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { rerender } = render(
      <TestWrapper>
        <Form initialValue={{ c: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="c" options={[{ label: <b>A</b>, value: 'a' }]} />
        </Form>
      </TestWrapper>,
    )
    rerender(
      <TestWrapper>
        <Form initialValue={{ c: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="c" options={[{ label: <b>A</b>, value: 'a' }, { label: <b>B</b>, value: 'b' }]} />
        </Form>
      </TestWrapper>,
    )
    expect(warn.mock.calls.filter(([m]) => String(m).includes('textValue'))).toHaveLength(1)
  })

  it('нет предупреждения, если textValue задан', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <TestWrapper>
        <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="city" options={cityOptions} />
        </Form>
      </TestWrapper>,
    )
    expect(warn.mock.calls.filter(([m]) => String(m).includes('textValue'))).toHaveLength(0)
  })
})
