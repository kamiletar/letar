import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BulkAction, ColumnDef, TableItem } from '../types'
import { GenericAdminTable } from './generic-admin-table'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

/**
 * useBreakpointValue вызывает window.matchMedia в useEffect — в jsdom он не определён по
 * умолчанию, поэтому мокаем его сами, управляя "шириной" через порог min-width в запросе.
 */
function setupMatchMedia(width: number) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    // Chakra переводит breakpoints в rem (toRem), поэтому запрос выглядит как
    // "(min-width: 48rem)", а не "48px" — учитываем оба варианта единиц (1rem/1em ≈ 16px)
    const match = /min-width:\s*([\d.]+)(px|em|rem)/.exec(query)
    let minWidth = 0
    if (match) {
      const value = Number(match[1])
      minWidth = match[2] === 'px' ? value : value * 16
    }
    return {
      matches: width >= minWidth,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })
}

interface Item extends TableItem {
  name: string
  status: string
}

const items: Item[] = [
  { id: 'a1', name: 'Товар 1', status: 'Опубликован', order: 0 },
  { id: 'a2', name: 'Товар 2', status: 'Черновик', order: 1 },
  { id: 'a3', name: 'Товар 3', status: 'Опубликован', order: 2 },
]

const columns: ColumnDef<Item>[] = [
  { header: 'Название', accessor: 'name' },
  { header: 'Статус', accessor: 'status' },
]

beforeEach(() => {
  setupMatchMedia(1024) // десктопный режим по умолчанию
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    forward: vi.fn(),
  } as unknown as ReturnType<typeof useRouter>)
})

describe('GenericAdminTable (десктоп)', () => {
  it('рендерит заголовки колонок и колонку «Действия»', () => {
    renderWithProvider(<GenericAdminTable items={items} columns={columns} />)

    expect(screen.getByRole('columnheader', { name: 'Название' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Статус' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Действия' })).toBeInTheDocument()
  })

  it('рендерит строку для каждого элемента с его значениями', () => {
    renderWithProvider(<GenericAdminTable items={items} columns={columns} />)

    expect(screen.getByText('Товар 1')).toBeInTheDocument()
    expect(screen.getByText('Товар 2')).toBeInTheDocument()
    expect(screen.getByText('Товар 3')).toBeInTheDocument()
    expect(screen.getAllByText('Опубликован')).toHaveLength(2)
    expect(screen.getByText('Черновик')).toBeInTheDocument()
  })

  it('не рендерит колонку «Порядок» по умолчанию', () => {
    renderWithProvider(<GenericAdminTable items={items} columns={columns} />)

    expect(screen.queryByRole('columnheader', { name: 'Порядок' })).not.toBeInTheDocument()
  })

  it('рендерит колонку «Порядок» и значения item.order, когда showOrderColumn=true', () => {
    renderWithProvider(<GenericAdminTable items={items} columns={columns} showOrderColumn />)

    expect(screen.getByRole('columnheader', { name: 'Порядок' })).toBeInTheDocument()
    // значения order (0,1,2) рендерятся как текст ячейки
    const rows = screen.getAllByRole('row').slice(1) // без заголовка
    expect(within(rows[0]).getByText('0')).toBeInTheDocument()
    expect(within(rows[1]).getByText('1')).toBeInTheDocument()
    expect(within(rows[2]).getByText('2')).toBeInTheDocument()
  })

  it('рендерит ссылки просмотра/редактирования, когда переданы viewHref/editHref', () => {
    renderWithProvider(
      <GenericAdminTable items={items} columns={columns} viewHref="/admin/products" editHref="/admin/products" />,
    )

    const viewLinks = screen.getAllByRole('link', { name: 'Просмотр' })
    const editLinks = screen.getAllByRole('link', { name: 'Редактировать' })

    expect(viewLinks).toHaveLength(3)
    expect(editLinks).toHaveLength(3)
    expect(viewLinks[0]).toHaveAttribute('href', '/admin/products/a1')
    expect(editLinks[0]).toHaveAttribute('href', '/admin/products/a1/edit')
  })

  it('не рендерит ссылки действий, когда viewHref/editHref не переданы и renderActions отсутствует', () => {
    renderWithProvider(<GenericAdminTable items={items} columns={columns} />)

    expect(screen.queryByRole('link', { name: 'Просмотр' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Редактировать' })).not.toBeInTheDocument()
  })

  it('использует renderActions вместо дефолтных ссылок, когда он передан', () => {
    renderWithProvider(
      <GenericAdminTable
        items={items}
        columns={columns}
        viewHref="/admin/products"
        renderActions={(item) => <button type="button">Кастомное действие {item.name}</button>}
      />,
    )

    expect(screen.getAllByRole('button', { name: /Кастомное действие/ })).toHaveLength(3)
    expect(screen.queryByRole('link', { name: 'Просмотр' })).not.toBeInTheDocument()
  })

  it('чекбокс строки выбирает элемент и показывает BulkActionsBar', async () => {
    const user = userEvent.setup()
    const doPublish = vi.fn().mockResolvedValue(undefined)
    const bulkActions = (handle: (action: (ids: string[]) => Promise<void>) => Promise<void>): BulkAction[] => [
      { key: 'publish', label: 'Опубликовать', onClick: (ids) => handle(() => doPublish(ids)) },
    ]

    renderWithProvider(<GenericAdminTable items={items} columns={columns} bulkActions={bulkActions} />)

    // первый чекбокс — «выбрать все» в заголовке, следующие — строки
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1])

    expect(await screen.findByText('Выбрано: 1')).toBeInTheDocument()
  })

  it('чекбокс «выбрать все» выбирает все строки', async () => {
    const user = userEvent.setup()
    const bulkActions = (): BulkAction[] => [{ key: 'publish', label: 'Опубликовать', onClick: vi.fn() }]

    renderWithProvider(<GenericAdminTable items={items} columns={columns} bulkActions={bulkActions} />)

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])

    expect(await screen.findByText('Выбрано: 3')).toBeInTheDocument()
  })

  it('не рендерит BulkActionsBar, когда bulkActions не передан, даже при наличии выбора', async () => {
    const user = userEvent.setup()

    renderWithProvider(<GenericAdminTable items={items} columns={columns} />)

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1])

    expect(screen.queryByText(/Выбрано:/)).not.toBeInTheDocument()
  })

  it('вызывает переданный bulk action с выбранными id и обновляет router', async () => {
    const user = userEvent.setup()
    const doPublish = vi.fn().mockResolvedValue(undefined)
    const refresh = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      refresh,
      forward: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)

    const bulkActions = (handle: (action: (ids: string[]) => Promise<void>) => Promise<void>): BulkAction[] => [
      { key: 'publish', label: 'Опубликовать', onClick: (ids) => handle(() => doPublish(ids)) },
    ]

    renderWithProvider(<GenericAdminTable items={items} columns={columns} bulkActions={bulkActions} />)

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1])
    await user.click(checkboxes[2])

    await user.click(await screen.findByRole('button', { name: /Опубликовать/ }))

    await vi.waitFor(() => {
      expect(doPublish).toHaveBeenCalledWith(expect.arrayContaining(['a1', 'a2']))
      expect(refresh).toHaveBeenCalled()
    })
  })

  it('рендерит пустую таблицу без строк, когда items пуст', () => {
    renderWithProvider(<GenericAdminTable items={[]} columns={columns} />)

    // только строка заголовка
    expect(screen.getAllByRole('row')).toHaveLength(1)
  })
})

describe('GenericAdminTable (мобильный режим)', () => {
  it('рендерит карточки вместо таблицы на узком экране', () => {
    setupMatchMedia(375)

    renderWithProvider(<GenericAdminTable items={items} columns={columns} />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('Выбрать все')).toBeInTheDocument()
    expect(screen.getByText('Товар 1')).toBeInTheDocument()
  })

  it('в карточках подписи колонок показаны рядом со значением', () => {
    setupMatchMedia(375)

    renderWithProvider(<GenericAdminTable items={items.slice(0, 1)} columns={columns} />)

    expect(screen.getByText('Название:')).toBeInTheDocument()
    expect(screen.getByText('Статус:')).toBeInTheDocument()
  })
})
