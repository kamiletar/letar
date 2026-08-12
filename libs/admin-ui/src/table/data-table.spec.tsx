import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import type { ColumnDef } from '@tanstack/react-table'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataTable } from './data-table'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

function mockRouting({ pathname = '/admin/clients', search = '' }: { pathname?: string; search?: string } = {}) {
  const push = vi.fn()
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    forward: vi.fn(),
  } as unknown as ReturnType<typeof useRouter>)
  vi.mocked(usePathname).mockReturnValue(pathname)
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(search) as unknown as ReturnType<typeof useSearchParams>,
  )
  return { push }
}

interface Client {
  id: string
  name: string
  phone: string
}

const clients: Client[] = [
  { id: 'c1', name: 'Иванов', phone: '+7 900 000-00-01' },
  { id: 'c2', name: 'Петров', phone: '+7 900 000-00-02' },
]

const columns: ColumnDef<Client>[] = [
  { accessorKey: 'name', header: 'Имя' },
  { accessorKey: 'phone', header: 'Телефон', enableSorting: false },
]

beforeEach(() => {
  mockRouting()
})

describe('DataTable', () => {
  it('рендерит заголовки колонок и строки данных', () => {
    renderWithProvider(<DataTable data={clients} columns={columns} />)

    expect(screen.getByRole('columnheader', { name: /Имя/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Телефон' })).toBeInTheDocument()
    expect(screen.getByText('Иванов')).toBeInTheDocument()
    expect(screen.getByText('+7 900 000-00-02')).toBeInTheDocument()
  })

  it('рендерит пустую таблицу без строк, когда data пуст', () => {
    renderWithProvider(<DataTable data={[]} columns={columns} />)

    expect(screen.getAllByRole('row')).toHaveLength(1)
  })

  it('клик по несортированному заголовку устанавливает asc', async () => {
    const user = userEvent.setup()
    const { push } = mockRouting()
    renderWithProvider(<DataTable data={clients} columns={columns} />)

    await user.click(screen.getByRole('columnheader', { name: /Имя/ }))
    expect(push).toHaveBeenCalledWith('/admin/clients?sort=name')
  })

  it('клик по заголовку с активной asc-сортировкой переключает на desc', async () => {
    const user = userEvent.setup()
    const { push } = mockRouting({ search: 'sort=name' })
    renderWithProvider(<DataTable data={clients} columns={columns} />)

    await user.click(screen.getByRole('columnheader', { name: /Имя/ }))
    expect(push).toHaveBeenCalledWith('/admin/clients?sort=-name')
  })

  it('клик по сортируемому заголовку с активной desc-сортировкой сбрасывает параметр', async () => {
    const user = userEvent.setup()
    const { push } = mockRouting({ search: 'sort=-name' })
    renderWithProvider(<DataTable data={clients} columns={columns} />)

    await user.click(screen.getByRole('columnheader', { name: /Имя/ }))
    expect(push).toHaveBeenCalledWith('/admin/clients?')
  })

  it('не реагирует на клик по заголовку с enableSorting: false', async () => {
    const user = userEvent.setup()
    const { push } = mockRouting()
    renderWithProvider(<DataTable data={clients} columns={columns} />)

    await user.click(screen.getByRole('columnheader', { name: 'Телефон' }))
    expect(push).not.toHaveBeenCalled()
  })

  it('использует кастомное имя параметра сортировки', async () => {
    const user = userEvent.setup()
    const { push } = mockRouting()
    renderWithProvider(<DataTable data={clients} columns={columns} sortParamName="order_by" />)

    await user.click(screen.getByRole('columnheader', { name: /Имя/ }))
    expect(push).toHaveBeenCalledWith('/admin/clients?order_by=name')
  })
})
