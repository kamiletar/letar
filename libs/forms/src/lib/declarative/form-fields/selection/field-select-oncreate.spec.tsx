import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const CREATE_LABEL = 'Добавить…'

const baseOptions = [
  { label: 'Кровля', value: 'roof' },
  { label: 'Фундамент', value: 'base' },
]

beforeAll(() => {
  // Dropdown Chakra измеряет позицию через ResizeObserver, которого нет в jsdom
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  // Chakra прокручивает список к выбранному пункту; в jsdom этих методов нет
  Element.prototype.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

async function openDropdown() {
  await userEvent.click(screen.getByRole('combobox'))
}

describe('Field.Select — onCreate', () => {
  it('без onCreate пункта «Добавить…» нет', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ category: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="category" options={baseOptions} />
        </Form>
      </TestWrapper>,
    )
    await openDropdown()
    expect(await screen.findByRole('option', { name: 'Фундамент' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Add|Добавить/ })).not.toBeInTheDocument()
  })

  it('с onCreate в конце списка есть пункт «+ Добавить…»', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ category: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="category" options={baseOptions} onCreate={vi.fn()} />
        </Form>
      </TestWrapper>,
    )
    await openDropdown()
    // Без FormI18nProvider дефолты остаются английскими, как у Combobox
    expect(await screen.findByRole('option', { name: '+ Add…' })).toBeInTheDocument()
  })

  it('выбор пункта вызывает onCreate, созданная опция добавляется и выбирается', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Фасады', value: 'facades' })
    render(
      <TestWrapper>
        <Form initialValue={{ category: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="category" options={baseOptions} onCreate={onCreate} createLabel={CREATE_LABEL} />
        </Form>
      </TestWrapper>,
    )
    await openDropdown()
    await userEvent.click(await screen.findByRole('option', { name: `+ ${CREATE_LABEL}` }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(''))
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Фасады'))
  })

  it('onCreate вернул null — значение не меняется', async () => {
    const onCreate = vi.fn().mockResolvedValue(null)
    render(
      <TestWrapper>
        <Form initialValue={{ category: 'roof' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="category" options={baseOptions} onCreate={onCreate} createLabel={CREATE_LABEL} />
        </Form>
      </TestWrapper>,
    )
    await openDropdown()
    await userEvent.click(await screen.findByRole('option', { name: `+ ${CREATE_LABEL}` }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    await act(async () => {})
    expect(screen.getByRole('combobox')).toHaveTextContent('Кровля')
  })

  it('служебное значение пункта не попадает в данные формы', async () => {
    const onSubmit = vi.fn()
    const onCreate = vi.fn().mockResolvedValue(null)
    render(
      <TestWrapper>
        <Form initialValue={{ category: 'roof' }} onSubmit={onSubmit}>
          <Form.Field.Select name="category" options={baseOptions} onCreate={onCreate} createLabel={CREATE_LABEL} />
          <button type="submit">go</button>
        </Form>
      </TestWrapper>,
    )
    await openDropdown()
    await userEvent.click(await screen.findByRole('option', { name: `+ ${CREATE_LABEL}` }))
    await waitFor(() => expect(onCreate).toHaveBeenCalled())
    await userEvent.click(screen.getByText('go'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toEqual({ category: 'roof' })
  })

  it('своя подпись пункта через createLabel', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ category: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="category" options={baseOptions} onCreate={vi.fn()} createLabel="Новая категория" />
        </Form>
      </TestWrapper>,
    )
    await openDropdown()
    expect(await screen.findByRole('option', { name: '+ Новая категория' })).toBeInTheDocument()
  })
})
