import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const CREATE_LABEL = 'Добавить'

const baseOptions = [
  { label: 'Кровля', value: 'roof' },
  { label: 'Фундамент', value: 'base' },
]

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

function renderCombobox(
  props: Record<string, unknown> = {},
  initialValue: { categoryId: string } = { categoryId: '' },
  onSubmit = vi.fn(),
) {
  return render(
    <TestWrapper>
      <Form initialValue={initialValue} onSubmit={onSubmit}>
        <Form.Field.Combobox name="categoryId" options={baseOptions} createLabel={CREATE_LABEL} {...props} />
        <button type="submit">go</button>
      </Form>
    </TestWrapper>,
  )
}

/**
 * Задаёт текст поиска одним событием. `userEvent.type` в jsdom теряет символы у Chakra Combobox
 * и без `onCreate` («Фасады» → «Фасаы»), поэтому текст вводится целиком через change.
 */
async function typeSearch(text: string) {
  const input = screen.getByRole('combobox')
  await userEvent.click(input)
  fireEvent.change(input, { target: { value: text } })
}

describe('Field.Combobox — onCreate', () => {
  it('без onCreate пункта создания нет', async () => {
    renderCombobox()
    await typeSearch('Фас')
    await act(async () => {})
    expect(screen.queryByRole('option', { name: /Добавить/ })).not.toBeInTheDocument()
  })

  it('с onCreate и непустым поиском без точного совпадения — «+ Добавить "<поиск>"»', async () => {
    renderCombobox({ onCreate: vi.fn() })
    await typeSearch('Фасады')
    expect(await screen.findByRole('option', { name: '+ Добавить "Фасады"' })).toBeInTheDocument()
  })

  it('точное совпадение с существующей опцией не предлагает создание', async () => {
    renderCombobox({ onCreate: vi.fn() })
    await typeSearch('кровля')
    expect(await screen.findByRole('option', { name: 'Кровля' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Добавить/ })).not.toBeInTheDocument()
  })

  it('выбор пункта вызывает onCreate с текстом поиска, созданная опция выбирается и попадает в данные', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Фасады', value: 'facades' })
    const onSubmit = vi.fn()
    renderCombobox({ onCreate }, { categoryId: '' }, onSubmit)
    await typeSearch('Фас')
    await userEvent.click(await screen.findByRole('option', { name: '+ Добавить "Фас"' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Фас', expect.anything()))
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Фасады'))

    await userEvent.click(screen.getByText('go'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toEqual({ categoryId: 'facades' })
  })

  it('onCreate вернул null — значение не меняется, служебное значение не попадает в форму, поиск остаётся', async () => {
    const onCreate = vi.fn().mockResolvedValue(null)
    const onSubmit = vi.fn()
    renderCombobox({ onCreate }, { categoryId: 'roof' }, onSubmit)
    await typeSearch('Фас')
    await userEvent.click(await screen.findByRole('option', { name: '+ Добавить "Фас"' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    await act(async () => {})
    expect(screen.getByRole('combobox')).toHaveValue('Фас')

    await userEvent.click(screen.getByText('go'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toEqual({ categoryId: 'roof' })
  })

  it('async-режим (useQuery): созданная опция выбирается, хотя в ответе сервера её нет', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Фасады', value: 'facades' })
    const onSubmit = vi.fn()
    render(
      <TestWrapper>
        <Form initialValue={{ categoryId: '' }} onSubmit={onSubmit}>
          <Form.Field.Combobox
            name="categoryId"
            useQuery={() => ({ data: [{ id: 'roof', name: 'Кровля' }], isLoading: false })}
            getLabel={(item: { name: string }) => item.name}
            getValue={(item: { id: string }) => item.id}
            debounce={0}
            createLabel={CREATE_LABEL}
            onCreate={onCreate}
          />
          <button type="submit">go</button>
        </Form>
      </TestWrapper>,
    )
    await typeSearch('Фас')
    await userEvent.click(await screen.findByRole('option', { name: '+ Добавить "Фас"' }))
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Фас', expect.anything()))
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Фасады'))

    await userEvent.click(screen.getByText('go'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toEqual({ categoryId: 'facades' })
  })
})
