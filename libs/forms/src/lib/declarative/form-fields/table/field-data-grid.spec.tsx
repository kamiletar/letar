import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const employees = [
  { name: 'Иван', salary: 90000 },
  { name: 'Мария', salary: 120000 },
  { name: 'Пётр', salary: 75000 },
]

describe('Form.Field.DataGrid', () => {
  it('рендерит строки и заголовки колонок', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ employees }} onSubmit={vi.fn()}>
          <Form.Field.DataGrid
            name="employees"
            label="Сотрудники"
            columns={[{ name: 'name', label: 'Имя' }, { name: 'salary', label: 'Оклад', align: 'right' }]}
          />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => expect(screen.getByText('Иван')).toBeInTheDocument())
    expect(screen.getByText('Сотрудники')).toBeInTheDocument()
    expect(screen.getByText('Имя')).toBeInTheDocument()
    expect(screen.getByText('Мария')).toBeInTheDocument()
  })

  it('показывает "Нет данных" для пустого массива', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ employees: [] }} onSubmit={vi.fn()}>
          <Form.Field.DataGrid name="employees" label="Сотрудники" columns={[{ name: 'name', label: 'Имя' }]} />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => expect(screen.getByText('Нет данных')).toBeInTheDocument())
  })

  it('сортировка по клику на заголовок переставляет строки', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ employees }} onSubmit={vi.fn()}>
          <Form.Field.DataGrid name="employees" label="Сотрудники" columns={[{ name: 'name', label: 'Имя' }]} />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => expect(screen.getByText('Иван')).toBeInTheDocument())

    const rows = () => screen.getAllByRole('row').slice(1) // без заголовка
    expect(rows().map((r) => r.textContent)).toEqual(['Иван', 'Мария', 'Пётр'])

    fireEvent.click(screen.getByText('Имя'))
    await waitFor(() => expect(rows().map((r) => r.textContent)).toEqual(['Иван', 'Мария', 'Пётр'].sort()))

    fireEvent.click(screen.getByText('Имя'))
    await waitFor(() => expect(rows().map((r) => r.textContent)).toEqual(['Иван', 'Мария', 'Пётр'].sort().reverse()))
  })

  it('текстовый фильтр сужает строки (регистрация filterFns через "auto")', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ employees }} onSubmit={vi.fn()}>
          <Form.Field.DataGrid
            name="employees"
            label="Сотрудники"
            columns={[{ name: 'name', label: 'Имя', filter: 'text' }]}
          />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => expect(screen.getByText('Иван')).toBeInTheDocument())
    const filterInput = screen.getByPlaceholderText('Фильтр: Имя')
    fireEvent.change(filterInput, { target: { value: 'Мари' } })

    await waitFor(() => {
      expect(screen.queryByText('Иван')).not.toBeInTheDocument()
      expect(screen.getByText('Мария')).toBeInTheDocument()
    })
  })

  it('пагинация: показывает счётчик страниц и листает', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ employees }} onSubmit={vi.fn()}>
          <Form.Field.DataGrid
            name="employees"
            label="Сотрудники"
            columns={[{ name: 'name', label: 'Имя' }]}
            pageSize={2}
          />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => expect(screen.getByText(/Страница 1 из 2/)).toBeInTheDocument())
    expect(screen.getByText('Иван')).toBeInTheDocument()
    expect(screen.queryByText('Пётр')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Далее →'))

    await waitFor(() => expect(screen.getByText(/Страница 2 из 2/)).toBeInTheDocument())
    expect(screen.getByText('Пётр')).toBeInTheDocument()
  })

  it('rowSelection: выбор части строк даёт indeterminate на чекбоксе "выбрать всё"', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ employees }} onSubmit={vi.fn()}>
          <Form.Field.DataGrid
            name="employees"
            label="Сотрудники"
            columns={[{ name: 'name', label: 'Имя' }]}
            rowSelection
          />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => expect(screen.getByText('Иван')).toBeInTheDocument())
    const checkboxes = screen.getAllByRole('checkbox')
    const [selectAll, ...rowCheckboxes] = checkboxes

    // Ничего не выбрано — unchecked
    expect(selectAll.closest('[data-scope="checkbox"]')).toHaveAttribute('data-state', 'unchecked')

    fireEvent.click(rowCheckboxes[0])

    // Частичный выбор — indeterminate на шапке
    await waitFor(() =>
      expect(selectAll.closest('[data-scope="checkbox"]')).toHaveAttribute('data-state', 'indeterminate')
    )
    expect(screen.getByText(/Удалить выбранные \(1\)/)).toBeInTheDocument()

    fireEvent.click(rowCheckboxes[1])
    fireEvent.click(rowCheckboxes[2])

    // Всё выбрано — checked
    await waitFor(() => expect(selectAll.closest('[data-scope="checkbox"]')).toHaveAttribute('data-state', 'checked'))
  })

  it('rowSelection: bulk-удаление выбранных строк', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ employees }} onSubmit={vi.fn()}>
          <Form.Field.DataGrid
            name="employees"
            label="Сотрудники"
            columns={[{ name: 'name', label: 'Имя' }]}
            rowSelection
          />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => expect(screen.getByText('Иван')).toBeInTheDocument())
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    await waitFor(() => expect(screen.getByText(/Удалить выбранные \(1\)/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Удалить выбранные/))

    await waitFor(() => expect(screen.queryByText('Иван')).not.toBeInTheDocument())
    expect(screen.getByText('Мария')).toBeInTheDocument()
  })

  it('virtualized: не падает при рендере и показывает данные', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ employees }} onSubmit={vi.fn()}>
          <Form.Field.DataGrid
            name="employees"
            label="Сотрудники"
            columns={[{ name: 'name', label: 'Имя' }]}
            virtualized
          />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => expect(screen.getByText('Сотрудники')).toBeInTheDocument())
    // manualPagination: virtualized — счётчик записей без "Страница X из Y"
    expect(screen.getByText(/3 записей/)).toBeInTheDocument()
  })

  it('enum-колонка редактируется через select, boolean — через чекбокс', async () => {
    const EmployeeSchema = z.object({
      employees: z.array(z.object({
        name: z.string(),
        status: z.enum(['active', 'vacation']),
        remote: z.boolean(),
      })),
    })
    const staff = [
      { name: 'Иван', status: 'active' as const, remote: false },
      { name: 'Мария', status: 'vacation' as const, remote: true },
    ]

    render(
      <TestWrapper>
        <Form schema={EmployeeSchema} initialValue={{ employees: staff }} onSubmit={vi.fn()}>
          <Form.Field.DataGrid
            name="employees"
            label="Сотрудники"
            columns={[
              { name: 'name', label: 'Имя' },
              { name: 'status', label: 'Статус', editable: true },
              { name: 'remote', label: 'Удалённо', editable: true },
            ]}
          />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => expect(screen.getByText('Иван')).toBeInTheDocument())

    // Открываем ячейку статуса первой строки — рендерится native select
    fireEvent.click(screen.getByText('active'))
    const select = await screen.findByRole('combobox')
    expect(select).toBeInTheDocument()
    fireEvent.change(select, { target: { value: 'vacation' } })
    await waitFor(() => expect(screen.getAllByText('vacation')).not.toHaveLength(0))

    // Открываем ячейку boolean — рендерится чекбокс
    fireEvent.click(screen.getByText('false'))
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    fireEvent.click(checkbox)
    await waitFor(() => expect(screen.getAllByText('true')).not.toHaveLength(0))
  })
})
