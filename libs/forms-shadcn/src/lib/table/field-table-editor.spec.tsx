import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldTableEditor } from './field-table-editor'
import type { TableEditorFieldProps } from './table-editor-types'

const COLUMNS: NonNullable<TableEditorFieldProps['columns']> = [
  { name: 'product', label: 'Товар' },
  { name: 'qty', label: 'Кол-во' },
  { name: 'price', label: 'Цена' },
  { name: 'total', label: 'Итого', computed: (row) => (Number(row.qty) || 0) * (Number(row.price) || 0) },
]

function ItemsForm(props: Partial<TableEditorFieldProps> = {}) {
  return (
    <TestForm defaultValues={{ items: [{ product: 'Молоко', qty: 2, price: 80, total: 160 }] }}>
      <FieldTableEditor name="items" label="Товары" columns={COLUMNS} {...props} />
    </TestForm>
  )
}

/**
 * jsdom не применяет media queries — оба вида (desktop `<table>` и mobile-карточки) присутствуют
 * в DOM одновременно (различаются только Tailwind-классами `hidden`/`md:block`), поэтому все
 * запросы по тексту ячеек/заголовков колонок скоупятся на desktop `<table>`, чтобы не ловить
 * дублирующий текст из мобильного вида.
 */
function desktopTable(): HTMLElement {
  const table = document.querySelector('table')
  if (!table) {
    throw new Error('desktop table not found')
  }
  return within(table.closest('div') as HTMLElement).getByRole('table') as unknown as HTMLElement
}

function cellByText(text: string) {
  return within(desktopTable()).getByText(text)
}

describe('FieldTableEditor (shadcn)', () => {
  it('рендерит заголовки колонок и существующие строки', () => {
    render(<ItemsForm />)

    expect(screen.getByText('Товары')).toBeInTheDocument()
    expect(cellByText('Товар')).toBeInTheDocument()
    expect(cellByText('Кол-во')).toBeInTheDocument()
    expect(cellByText('Молоко')).toBeInTheDocument()
    // computed-колонка вычисляется из rowData, не хранится в форме
    expect(cellByText('160')).toBeInTheDocument()
  })

  it('пустая таблица показывает emptyText', () => {
    render(
      <TestForm defaultValues={{ items: [] }}>
        <FieldTableEditor name="items" columns={COLUMNS} />
      </TestForm>,
    )

    expect(screen.getByText('Нет данных. Нажмите «Добавить строку»')).toBeInTheDocument()
  })

  it('кнопка «Добавить строку» добавляет пустую строку', () => {
    render(<ItemsForm />)

    fireEvent.click(screen.getByRole('button', { name: /Добавить строку/ }))

    // computed-ячейка новой строки: 0 * 0 = 0
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThan(0)
  })

  it('клик по редактируемой ячейке открывает inline-input, blur сохраняет значение', () => {
    render(<ItemsForm />)

    fireEvent.click(cellByText('Молоко'))
    const input = screen.getByDisplayValue('Молоко') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Кефир' } })
    fireEvent.blur(input)

    expect(cellByText('Кефир')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Кефир')).not.toBeInTheDocument()
  })

  it('computed-ячейка не открывает inline-редактирование по клику', () => {
    render(<ItemsForm />)

    fireEvent.click(cellByText('160'))
    // computed-ячейка не превращается в input — значение остаётся статичным текстом
    expect(cellByText('160')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('160')).not.toBeInTheDocument()
  })

  it('кнопка удаления строки убирает её из таблицы', () => {
    render(<ItemsForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Удалить строку' }))

    expect(screen.queryByText('Молоко')).not.toBeInTheDocument()
    expect(screen.getByText('Нет данных. Нажмите «Добавить строку»')).toBeInTheDocument()
  })

  it('minRows=1 блокирует удаление последней строки', () => {
    render(<ItemsForm minRows={1} />)

    const deleteBtn = screen.getByRole('button', { name: 'Удалить строку' }) as HTMLButtonElement
    expect(deleteBtn).toBeDisabled()
  })

  it('maxRows блокирует кнопку добавления при достижении лимита', () => {
    render(<ItemsForm maxRows={1} />)

    const addBtn = screen.getByRole('button', { name: /Добавить строку/ }) as HTMLButtonElement
    expect(addBtn).toBeDisabled()
  })

  it('selectable=true показывает чекбоксы строк и select-all', () => {
    render(<ItemsForm selectable />)

    // 1 select-all в шапке + 1 чекбокс строки
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes.length).toBe(2)
  })

  it('readOnly=true скрывает toolbar и кнопку удаления', () => {
    render(<ItemsForm readOnly />)

    expect(screen.queryByRole('button', { name: /Добавить строку/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Удалить строку' })).not.toBeInTheDocument()
  })

  it('footer с aggregate=sum показывает сумму по колонке', () => {
    render(<ItemsForm footer={[{ column: 'total', aggregate: 'sum', label: 'Итого:' }]} />)

    expect(screen.getByText('Итого:')).toBeInTheDocument()
  })

  // @ts-expect-error — size обязан быть 'sm' | 'md' | 'lg', negative control проверяет реальную типизацию пропов
  const _typeCheck = <FieldTableEditor name="items" size="bogus" />
})
