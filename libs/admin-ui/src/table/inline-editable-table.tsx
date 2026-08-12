'use client'

import { Box, Button, Card, Flex, Stack, Table, Text } from '@chakra-ui/react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

export interface InlineEditableTableColumn<TItem> {
  /** Заголовок колонки — пустая строка допустима (напр. колонка с бейджами без подписи) */
  header: ReactNode
  render: (item: TItem) => ReactNode
  cellProps?: React.ComponentProps<typeof Table.Cell>
}

export interface InlineEditableTableProps<TItem> {
  title: ReactNode
  items: TItem[]
  getId: (item: TItem) => string
  columns: InlineEditableTableColumn<TItem>[]
  editingId: string | 'new' | null
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onAdd: () => void
  /** Форма редактирования существующей строки — рендерится в ячейке на весь colSpan */
  renderEditForm: (item: TItem) => ReactNode
  /** Форма создания новой строки — рендерится под таблицей */
  renderCreateForm: () => ReactNode
  emptyMessage: ReactNode
  addLabel?: string
  /** Пояснение над таблицей (напр. «Расход указывается на 1 м² работы») */
  note?: ReactNode
  cardProps?: React.ComponentProps<typeof Card.Root>
}

/**
 * Инлайн-CRUD таблица админки: карточка со списком, кнопка «Добавить»,
 * строка редактирования разворачивается в форму на всю ширину таблицы.
 * Общий каркас разметки для секций вида «состав дома», «нормы расхода
 * материалов/маш-часов», «упаковки материала» и т.п. — состояние и
 * create/update/delete берутся из `useInlineCrudList`, форма (набор полей,
 * Zod-схема) остаётся за вызывающим кодом, у каждой секции она своя.
 *
 * @example
 * ```tsx
 * const list = useInlineCrudList({
 *   initialItems, getId: (i) => i.id, sortBy: (i) => i.order,
 *   onCreate: (data) => createHouseExtra(houseId, data),
 *   onUpdate: (id, data) => updateHouseExtra(houseId, id, data),
 *   onDelete: (id) => deleteHouseExtra(houseId, id),
 * })
 *
 * <InlineEditableTable
 *   title="Не входит в цену"
 *   items={list.items}
 *   getId={(i) => i.id}
 *   columns={[
 *     { header: 'Название', render: (i) => i.title },
 *     { header: 'Цена', render: (i) => formatKopecks(i.priceKopecks) },
 *   ]}
 *   editingId={list.editingId}
 *   onEdit={list.setEditingId}
 *   onDelete={list.handleDelete}
 *   onAdd={() => list.setEditingId('new')}
 *   renderEditForm={(item) => (
 *     <ExtraForm initialValue={item} onSubmit={(data) => list.handleUpdate(item.id, data)} onCancel={() => list.setEditingId(null)} />
 *   )}
 *   renderCreateForm={() => (
 *     <ExtraForm initialValue={EMPTY_EXTRA} onSubmit={list.handleCreate} onCancel={() => list.setEditingId(null)} />
 *   )}
 *   emptyMessage="Пока пусто — заказчику ничего не показывается отдельным списком"
 * />
 * ```
 */
export function InlineEditableTable<TItem>({
  title,
  items,
  getId,
  columns,
  editingId,
  onEdit,
  onDelete,
  onAdd,
  renderEditForm,
  renderCreateForm,
  emptyMessage,
  addLabel = 'Добавить',
  note,
  cardProps,
}: InlineEditableTableProps<TItem>) {
  const colSpan = columns.length + 1

  return (
    <Card.Root shadow="sm" {...cardProps}>
      <Card.Header>
        <Flex align="center" justify="space-between">
          <Box fontWeight="semibold" fontSize="sm">
            {title}
          </Box>
          {editingId === null && (
            <Button size="xs" variant="outline" onClick={onAdd}>
              <Plus size={14} />
              {addLabel}
            </Button>
          )}
        </Flex>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          {note}

          {items.length === 0 && editingId !== 'new' && (
            <Text fontSize="sm" color="fg.muted">
              {emptyMessage}
            </Text>
          )}

          {items.length > 0 && (
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  {columns.map((column, index) => (
                    // eslint-disable-next-line react/no-array-index-key -- набор колонок статичен для всей жизни таблицы
                    <Table.ColumnHeader key={index}>{column.header}</Table.ColumnHeader>
                  ))}
                  <Table.ColumnHeader />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {items.map((item) => {
                  const id = getId(item)
                  return editingId === id
                    ? (
                      <Table.Row key={id}>
                        <Table.Cell colSpan={colSpan}>{renderEditForm(item)}</Table.Cell>
                      </Table.Row>
                    )
                    : (
                      <Table.Row key={id} _hover={{ bg: 'bg.subtle' }}>
                        {columns.map((column, index) => (
                          // eslint-disable-next-line react/no-array-index-key -- набор колонок статичен для всей жизни таблицы
                          <Table.Cell key={index} {...column.cellProps}>
                            {column.render(item)}
                          </Table.Cell>
                        ))}
                        <Table.Cell>
                          <Flex gap={1} justify="flex-end">
                            <Button size="xs" variant="ghost" onClick={() => onEdit(id)}>
                              <Pencil size={14} />
                            </Button>
                            <Button size="xs" variant="ghost" colorPalette="red" onClick={() => onDelete(id)}>
                              <Trash2 size={14} />
                            </Button>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    )
                })}
              </Table.Body>
            </Table.Root>
          )}

          {editingId === 'new' && (
            <Box borderWidth="1px" borderRadius="md" p={3}>
              {renderCreateForm()}
            </Box>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
