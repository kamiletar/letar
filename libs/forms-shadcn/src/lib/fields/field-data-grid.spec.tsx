import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { FieldDataGrid } from './field-data-grid'

const employees = [
  { name: 'Иван', salary: 90000 },
  { name: 'Мария', salary: 120000 },
  { name: 'Пётр', salary: 75000 },
]

describe('FieldDataGrid (shadcn)', () => {
  // Регресс-тест: см. комментарий в field-data-grid.tsx — до фикса Suspense монтировался сразу,
  // сервер отдавал настоящий SSR-стриминг boundary, чьё раскрытие зависит от requestAnimationFrame
  // и виснет навсегда в скрытой/фоновой вкладке. Разбор:
  // .claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md
  it('не создаёт Suspense-boundary на сервере — SSR отдаёт только fallback', () => {
    const html = renderToString(
      <TestForm defaultValues={{ employees }}>
        <FieldDataGrid name="employees" label="Сотрудники" columns={[{ name: 'name' }]} />
      </TestForm>,
    )

    expect(html).not.toContain('Иван')
    expect(html).toContain('animate-pulse')
  })

  it('рендерит строки и заголовки колонок', async () => {
    render(
      <TestForm defaultValues={{ employees }}>
        <FieldDataGrid
          name="employees"
          label="Сотрудники"
          columns={[{ name: 'name' }, { name: 'salary', align: 'right' }]}
        />
      </TestForm>,
    )

    await waitFor(() => expect(screen.getByText('Иван')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText('Сотрудники')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Мария')).toBeInTheDocument()
  })

  it('показывает "Нет данных" для пустого массива', async () => {
    render(
      <TestForm defaultValues={{ employees: [] }}>
        <FieldDataGrid name="employees" label="Сотрудники" columns={[{ name: 'name' }]} />
      </TestForm>,
    )

    await waitFor(() => expect(screen.getByText('Нет данных')).toBeInTheDocument(), { timeout: 3000 })
  })

  it('инлайн-редактирование: клик по ячейке → изменение → сохранение по Enter', async () => {
    const onRowSave = vi.fn()
    render(
      <TestForm defaultValues={{ employees }}>
        <FieldDataGrid name="employees" label="Сотрудники" columns={[{ name: 'name' }]} onRowSave={onRowSave} />
      </TestForm>,
    )

    await waitFor(() => expect(screen.getByText('Иван')).toBeInTheDocument(), { timeout: 3000 })
    fireEvent.click(screen.getByText('Иван'))
    const input = screen.getByDisplayValue('Иван')
    fireEvent.change(input, { target: { value: 'Иван Петрович' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(onRowSave).toHaveBeenCalled())
  })

  it('текстовый фильтр сужает строки', async () => {
    render(
      <TestForm defaultValues={{ employees }}>
        <FieldDataGrid name="employees" label="Сотрудники" columns={[{ name: 'name', filter: true }]} />
      </TestForm>,
    )

    await waitFor(() => expect(screen.getByText('Иван')).toBeInTheDocument(), { timeout: 3000 })
    const filterInput = screen.getByPlaceholderText('Фильтр: name')
    fireEvent.change(filterInput, { target: { value: 'Мари' } })

    await waitFor(() => {
      expect(screen.queryByText('Иван')).not.toBeInTheDocument()
      expect(screen.getByText('Мария')).toBeInTheDocument()
    })
  })

  it('rowSelection: чекбоксы выбора и bulk-удаление', async () => {
    render(
      <TestForm defaultValues={{ employees }}>
        <FieldDataGrid name="employees" label="Сотрудники" columns={[{ name: 'name' }]} rowSelection />
      </TestForm>,
    )

    await waitFor(() => expect(screen.getByText('Иван')).toBeInTheDocument(), { timeout: 3000 })
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    await waitFor(() => expect(screen.getByText(/Удалить выбранные \(1\)/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Удалить выбранные/))

    await waitFor(() => expect(screen.queryByText('Иван')).not.toBeInTheDocument())
  })

  it('пагинация: показывает счётчик страниц', async () => {
    render(
      <TestForm defaultValues={{ employees }}>
        <FieldDataGrid name="employees" label="Сотрудники" columns={[{ name: 'name' }]} pageSize={2} />
      </TestForm>,
    )

    await waitFor(() => expect(screen.getByText(/Страница 1 из 2/)).toBeInTheDocument())
  })
})
