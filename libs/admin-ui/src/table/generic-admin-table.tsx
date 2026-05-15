'use client'

import {
  Box,
  Card,
  Checkbox,
  Flex,
  HStack,
  IconButton,
  Link,
  Stack,
  Table,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react'
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRouter } from 'next/navigation'
import { type ReactNode, useState, useTransition } from 'react'
import { LuEye, LuGripVertical, LuPencil } from 'react-icons/lu'
import { useSelection } from '../hooks/use-selection'
import type { BulkAction, ColumnDef, TableItem } from '../types'
import { BulkActionsBar } from './bulk-actions-bar'

// =============================================================================
// Props
// =============================================================================

/**
 * Props для GenericAdminTable.
 */
export interface GenericAdminTableProps<T extends TableItem> {
  /** Массив элементов */
  items: T[]
  /** Определения колонок */
  columns: ColumnDef<T>[]
  /** Функция reorder (возвращает Promise с success/error) */
  reorderAction?: (orderedIds: string[]) => Promise<{ success: boolean; error?: string }>
  /** Функция для создания bulk actions */
  bulkActions?: (handleBulkAction: (action: (ids: string[]) => Promise<void>) => Promise<void>) => BulkAction[]
  /** Базовый URL для просмотра (добавляется /{id}) */
  viewHref?: string
  /** Базовый URL для редактирования (добавляется /{id}/edit) */
  editHref?: string
  /** Кастомный рендер ячейки действий */
  renderActions?: (item: T) => ReactNode
  /** Показывать колонку порядка */
  showOrderColumn?: boolean
  /** Цветовая палитра */
  colorPalette?: string
}

// =============================================================================
// Строка таблицы
// =============================================================================

interface SortableRowProps<T extends TableItem> {
  item: T
  columns: ColumnDef<T>[]
  isSelected: boolean
  onToggle: () => void
  viewHref?: string
  editHref?: string
  renderActions?: (item: T) => ReactNode
  showOrderColumn?: boolean
  colorPalette: string
}

/**
 * Строка таблицы с поддержкой перетаскивания.
 */
function SortableRow<T extends TableItem>({
  item,
  columns,
  isSelected,
  onToggle,
  viewHref,
  editHref,
  renderActions,
  showOrderColumn,
  colorPalette,
}: SortableRowProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : undefined,
  }

  /** Рендер значения ячейки */
  const renderCell = (column: ColumnDef<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(item)
    }
    const value = item[column.accessor]
    return value as ReactNode
  }

  return (
    <Table.Row
      ref={setNodeRef}
      style={style}
      _hover={{ bg: 'whiteAlpha.50' }}
      bg={isDragging ? `${colorPalette}.900/50` : isSelected ? `${colorPalette}.900/30` : undefined}
      borderWidth={isDragging ? '2px' : undefined}
      borderColor={isDragging ? `${colorPalette}.500` : undefined}
    >
      {/* Ручка DnD + Checkbox */}
      <Table.Cell>
        <HStack gap={2}>
          <Box
            {...attributes}
            {...listeners}
            cursor="grab"
            color="fg.muted"
            _hover={{ color: `${colorPalette}.400` }}
            _active={{ cursor: 'grabbing' }}
          >
            <LuGripVertical />
          </Box>
          <Checkbox.Root checked={isSelected} onCheckedChange={onToggle}>
            <Checkbox.HiddenInput />
            <Checkbox.Control />
          </Checkbox.Root>
        </HStack>
      </Table.Cell>

      {/* Динамические колонки */}
      {columns.map((column) => (
        <Table.Cell
          key={column.header}
          fontFamily={column.fontFamily}
          fontSize={column.fontSize}
          fontWeight={column.fontWeight}
          textAlign={column.textAlign}
        >
          {renderCell(column)}
        </Table.Cell>
      ))}

      {/* Колонка порядка */}
      {showOrderColumn && <Table.Cell>{item.order}</Table.Cell>}

      {/* Действия */}
      <Table.Cell>
        {renderActions ? (
          renderActions(item)
        ) : (
          <HStack gap={1} justify="flex-end">
            {viewHref && (
              <IconButton aria-label="Просмотр" variant="ghost" size="sm" asChild>
                <Link href={`${viewHref}/${item.id}`}>
                  <LuEye />
                </Link>
              </IconButton>
            )}
            {editHref && (
              <IconButton aria-label="Редактировать" variant="ghost" size="sm" asChild>
                <Link href={`${editHref}/${item.id}/edit`}>
                  <LuPencil />
                </Link>
              </IconButton>
            )}
          </HStack>
        )}
      </Table.Cell>
    </Table.Row>
  )
}

// =============================================================================
// Мобильная карточка
// =============================================================================

interface SortableCardProps<T extends TableItem> {
  item: T
  columns: ColumnDef<T>[]
  isSelected: boolean
  onToggle: () => void
  viewHref?: string
  editHref?: string
  renderActions?: (item: T) => ReactNode
  colorPalette: string
}

/**
 * Карточка для мобильного отображения с поддержкой перетаскивания.
 */
function SortableCard<T extends TableItem>({
  item,
  columns,
  isSelected,
  onToggle,
  viewHref,
  editHref,
  renderActions,
  colorPalette,
}: SortableCardProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  /** Рендер значения ячейки */
  const renderCell = (column: ColumnDef<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(item)
    }
    const value = item[column.accessor]
    return value as ReactNode
  }

  return (
    <Card.Root
      ref={setNodeRef}
      style={style}
      bg={isDragging ? `${colorPalette}.900/50` : isSelected ? `${colorPalette}.900/30` : undefined}
      borderWidth={isDragging ? '2px' : '1px'}
      borderColor={isDragging ? `${colorPalette}.500` : isSelected ? `${colorPalette}.500` : 'border.subtle'}
    >
      <Card.Body py={3} px={4}>
        {/* Header: DnD grip + Checkbox + Actions */}
        <Flex justify="space-between" align="center" mb={3}>
          <HStack gap={3}>
            {/* Увеличенная ручка DnD для touch (44x44px) */}
            <Box
              {...attributes}
              {...listeners}
              minW="44px"
              minH="44px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="grab"
              color="fg.muted"
              borderRadius="md"
              _hover={{ bg: 'whiteAlpha.100', color: `${colorPalette}.400` }}
              _active={{ cursor: 'grabbing', bg: 'whiteAlpha.200' }}
              ml={-2}
            >
              <LuGripVertical size={20} />
            </Box>
            {/* Checkbox с увеличенной зоной касания */}
            <Box minW="44px" minH="44px" display="flex" alignItems="center" justifyContent="center">
              <Checkbox.Root checked={isSelected} onCheckedChange={onToggle} size="lg">
                <Checkbox.HiddenInput />
                <Checkbox.Control />
              </Checkbox.Root>
            </Box>
          </HStack>

          {/* Действия — увеличенные touch targets для мобильных */}
          {renderActions ? (
            renderActions(item)
          ) : (
            <HStack gap={2}>
              {viewHref && (
                <IconButton aria-label="Просмотр" variant="ghost" size="md" minW="44px" minH="44px" asChild>
                  <Link href={`${viewHref}/${item.id}`}>
                    <LuEye size={20} />
                  </Link>
                </IconButton>
              )}
              {editHref && (
                <IconButton aria-label="Редактировать" variant="ghost" size="md" minW="44px" minH="44px" asChild>
                  <Link href={`${editHref}/${item.id}/edit`}>
                    <LuPencil size={20} />
                  </Link>
                </IconButton>
              )}
            </HStack>
          )}
        </Flex>

        {/* Поля данных */}
        <Stack gap={2}>
          {columns.map((column) => (
            <Flex key={column.header} justify="space-between" align="center" gap={2}>
              <Text fontSize="sm" color="fg.muted" flexShrink={0}>
                {column.header}:
              </Text>
              <Box
                fontSize={column.fontSize || 'sm'}
                fontFamily={column.fontFamily}
                fontWeight={column.fontWeight}
                textAlign="right"
                truncate
              >
                {renderCell(column)}
              </Box>
            </Flex>
          ))}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

// =============================================================================
// Основной компонент
// =============================================================================

/**
 * Универсальная таблица для админ-панели с DnD и bulk actions.
 *
 * @example
 * ```tsx
 * <GenericAdminTable
 *   items={mandalas}
 *   columns={[
 *     { header: 'Slug', accessor: 'slug', fontFamily: 'mono', fontSize: 'sm' },
 *     { header: 'Название', accessor: 'name', fontWeight: 'medium' },
 *     { header: 'Статус', accessor: (m) => <StatusBadge type="published" value={m.published} /> },
 *   ]}
 *   reorderAction={reorderMandalas}
 *   bulkActions={(handle) => [
 *     commonBulkActions.publish((ids) => handle(() => bulkPublishMandalas(ids))),
 *     commonBulkActions.delete((ids) => handle(() => bulkDeleteMandalas(ids))),
 *   ]}
 *   viewHref="/admin/mandalas"
 *   editHref="/admin/mandalas"
 *   showOrderColumn
 * />
 * ```
 */
export function GenericAdminTable<T extends TableItem>({
  items: initialItems,
  columns,
  reorderAction,
  bulkActions,
  viewHref,
  editHref,
  renderActions,
  showOrderColumn,
  colorPalette = 'purple',
}: GenericAdminTableProps<T>) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [isPending, startTransition] = useTransition()

  // Определяем мобильный режим
  const isMobile = useBreakpointValue({ base: true, md: false }, { fallback: 'md' })

  const itemIds = items.map((item) => item.id)
  const selection = useSelection(itemIds)

  // Сенсоры для DnD (включая touch с delay для мобильных)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  )

  /** Обработчик bulk action */
  const handleBulkAction = async (action: (ids: string[]) => Promise<void>) => {
    await action(selection.selectedArray)
    router.refresh()
  }

  /** Обработчик завершения перетаскивания */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && reorderAction) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      // Оптимистичное обновление UI
      const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index,
      }))
      setItems(newItems)

      // Сохраняем на сервере
      startTransition(async () => {
        const result = await reorderAction(newItems.map((item) => item.id))
        if (!result.success) {
          // Откатываем при ошибке
          setItems(initialItems)
          console.error('Ошибка сортировки:', result.error)
        }
      })
    }
  }

  // Формируем действия для bulk bar
  const resolvedBulkActions = bulkActions ? bulkActions(handleBulkAction) : []

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        {/* Мобильный режим: карточки */}
        {isMobile ? (
          <Stack gap={3} opacity={isPending ? 0.7 : 1} transition="opacity 0.2s">
            {/* Header с чекбоксом "выбрать все" — увеличенная зона касания */}
            <Flex align="center" gap={2} px={2}>
              <Box minW="44px" minH="44px" display="flex" alignItems="center" justifyContent="center">
                <Checkbox.Root
                  checked={selection.isAllSelected ? true : selection.isIndeterminate ? 'indeterminate' : false}
                  onCheckedChange={() => selection.toggleAll()}
                  size="lg"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
              </Box>
              <Text fontSize="sm" color="fg.muted">
                Выбрать все
              </Text>
            </Flex>

            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableCard
                  key={item.id}
                  item={item}
                  columns={columns}
                  isSelected={selection.isSelected(item.id)}
                  onToggle={() => selection.toggle(item.id)}
                  viewHref={viewHref}
                  editHref={editHref}
                  renderActions={renderActions}
                  colorPalette={colorPalette}
                />
              ))}
            </SortableContext>
          </Stack>
        ) : (
          /* Десктопный режим: таблица */
          <Table.Root opacity={isPending ? 0.7 : 1} transition="opacity 0.2s">
            <Table.Header>
              <Table.Row>
                {/* Ручка + Checkbox */}
                <Table.ColumnHeader w="80px">
                  <HStack gap={2}>
                    <Box w="16px" />
                    <Checkbox.Root
                      checked={selection.isAllSelected ? true : selection.isIndeterminate ? 'indeterminate' : false}
                      onCheckedChange={() => selection.toggleAll()}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </HStack>
                </Table.ColumnHeader>

                {/* Динамические колонки */}
                {columns.map((column) => (
                  <Table.ColumnHeader key={column.header} w={column.width} textAlign={column.textAlign}>
                    {column.header}
                  </Table.ColumnHeader>
                ))}

                {/* Колонка порядка */}
                {showOrderColumn && <Table.ColumnHeader>Порядок</Table.ColumnHeader>}

                {/* Действия */}
                <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                {items.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    columns={columns}
                    isSelected={selection.isSelected(item.id)}
                    onToggle={() => selection.toggle(item.id)}
                    viewHref={viewHref}
                    editHref={editHref}
                    renderActions={renderActions}
                    showOrderColumn={showOrderColumn}
                    colorPalette={colorPalette}
                  />
                ))}
              </SortableContext>
            </Table.Body>
          </Table.Root>
        )}
      </DndContext>

      {resolvedBulkActions.length > 0 && (
        <BulkActionsBar
          selectedCount={selection.selectedCount}
          selectedIds={selection.selectedArray}
          onClear={selection.clear}
          actions={resolvedBulkActions}
          colorPalette={colorPalette}
        />
      )}
    </>
  )
}
