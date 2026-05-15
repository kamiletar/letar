'use client'

import { Gender } from '@/generated/prisma'
import { Badge, Box, Button, Table, Text } from '@chakra-ui/react'
import type { DragEndEvent } from '@dnd-kit/core'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import NextLink from 'next/link'
import { Fragment, useEffect, useState, useTransition } from 'react'
import { reorderSizes } from '../_actions/reorder-sizes'

/**
 * Type for size with usage count
 */
type SizeWithCount = {
  id: string
  gender: Gender
  international: string
  ru: string
  de: string
  it: string
  fr: string
  uk: string
  us: string
  jeansFrom: string
  jeansTo: string
  bustMin: number
  bustMax: number
  waistMin: number
  waistMax: number
  hipsMin: number
  hipsMax: number
  sortOrder: number
  _count: {
    items: number
  }
}

/**
 * Format gender for display
 */
function formatGender(gender: Gender): string {
  switch (gender) {
    case Gender.MALE:
      return 'Мужской'
    case Gender.FEMALE:
      return 'Женский'
    default:
      return gender
  }
}

/**
 * Pluralize Russian word based on count
 */
function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) {
    return one
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few
  }
  return many
}

/**
 * Sortable table row component
 */
function SortableSizeRow({ size }: { size: SizeWithCount }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: size.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Table.Row
      ref={setNodeRef}
      style={style}
      {...attributes}
      bg={isDragging ? 'gray.subtle' : undefined}
      cursor="grab"
      _active={{ cursor: 'grabbing' }}
    >
      {/* Drag Handle */}
      <Table.Cell {...listeners}>
        <Text fontSize="lg" color="gray.500" userSelect="none">
          ⋮⋮
        </Text>
      </Table.Cell>

      <Table.Cell>
        <Text fontSize="sm">{formatGender(size.gender)}</Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontWeight="medium">{size.ru}</Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="sm">{size.international}</Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="sm">{size.de}</Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="sm">{size.it}</Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="sm">{size.fr}</Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="sm">{size.uk}</Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="sm">{size.us}</Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="sm">
          {size.jeansFrom} - {size.jeansTo}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="sm">
          {size.bustMin} - {size.bustMax}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="sm">
          {size.waistMin} - {size.waistMax}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="sm">
          {size.hipsMin} - {size.hipsMax}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="sm" color="fg.muted">
          {size.sortOrder}
        </Text>
      </Table.Cell>
      <Table.Cell>
        {size._count.items > 0 ? (
          <Badge colorPalette="green" size="sm">
            {size._count.items} {pluralize(size._count.items, 'товар', 'товара', 'товаров')}
          </Badge>
        ) : (
          <Badge colorPalette="gray" size="sm" variant="subtle">
            Не используется
          </Badge>
        )}
      </Table.Cell>
      <Table.Cell>
        <Button asChild size="sm" variant="outline">
          <NextLink href={`/admin/sizes/${size.id}/edit`}>Редактировать</NextLink>
        </Button>
      </Table.Cell>
    </Table.Row>
  )
}

interface SortableSizesTableProps {
  groupedSizes: Map<Gender, SizeWithCount[]>
}

/**
 * Sortable sizes table with drag-and-drop reordering.
 * Each gender group has independent sorting.
 */
export function SortableSizesTable({ groupedSizes }: SortableSizesTableProps) {
  const [localGroups, setLocalGroups] = useState(groupedSizes)
  const [isPending, startTransition] = useTransition()

  // Sync local state with prop changes (e.g., when filters change)
  useEffect(() => {
    setLocalGroups(groupedSizes)
  }, [groupedSizes])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  /**
   * Handle drag end - reorder items and save to database.
   * Determines gender from dragged item and only allows reordering within same gender.
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    // Find which gender group the active item belongs to
    let activeGender: Gender | null = null
    let currentSizes: SizeWithCount[] | null = null

    for (const [gender, sizes] of localGroups.entries()) {
      if (sizes.some((size) => size.id === active.id)) {
        activeGender = gender
        currentSizes = sizes
        break
      }
    }

    if (!activeGender || !currentSizes) {
      return
    }

    // Verify that 'over' item is in the same gender group
    const overInSameGroup = currentSizes.some((size) => size.id === over.id)
    if (!overInSameGroup) {
      return
    }

    const oldIndex = currentSizes.findIndex((size) => size.id === active.id)
    const newIndex = currentSizes.findIndex((size) => size.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Reorder locally
    const reorderedSizes = arrayMove(currentSizes, oldIndex, newIndex)

    // Update sortOrder values based on new positions
    const updates = reorderedSizes.map((size, index) => ({
      id: size.id,
      sortOrder: index,
    }))

    // Update local state immediately for optimistic UI
    const newGroups = new Map(localGroups)
    newGroups.set(
      activeGender,
      reorderedSizes.map((size, index) => ({ ...size, sortOrder: index }))
    )
    setLocalGroups(newGroups)

    // Save to database
    startTransition(async () => {
      try {
        await reorderSizes(updates)
      } catch (error) {
        console.error('Failed to reorder sizes:', error)
        // Revert on error
        setLocalGroups(groupedSizes)
      }
    })
  }

  // Flatten all items for single DndContext
  const _allItems = Array.from(localGroups.values()).flat()

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <Box overflowX="auto" opacity={isPending ? 0.6 : 1}>
        <Table.Root size="sm" variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader w="40px"></Table.ColumnHeader>
              <Table.ColumnHeader>Пол</Table.ColumnHeader>
              <Table.ColumnHeader>RU</Table.ColumnHeader>
              <Table.ColumnHeader>INT</Table.ColumnHeader>
              <Table.ColumnHeader>DE</Table.ColumnHeader>
              <Table.ColumnHeader>IT</Table.ColumnHeader>
              <Table.ColumnHeader>FR</Table.ColumnHeader>
              <Table.ColumnHeader>UK</Table.ColumnHeader>
              <Table.ColumnHeader>US</Table.ColumnHeader>
              <Table.ColumnHeader>Джинсы</Table.ColumnHeader>
              <Table.ColumnHeader>Грудь (см)</Table.ColumnHeader>
              <Table.ColumnHeader>Талия (см)</Table.ColumnHeader>
              <Table.ColumnHeader>Бедра (см)</Table.ColumnHeader>
              <Table.ColumnHeader>Порядок</Table.ColumnHeader>
              <Table.ColumnHeader>Использование</Table.ColumnHeader>
              <Table.ColumnHeader>Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {Array.from(localGroups.entries()).map(([gender, sizesInGroup]) => (
              <Fragment key={gender}>
                {/* Group header row */}
                <Table.Row bg="gray.subtle" _hover={{ bg: 'gray.subtle' }}>
                  <Table.Cell colSpan={16}>
                    <Text fontWeight="bold" fontSize="md" textTransform="uppercase" color="fg">
                      {formatGender(gender)} ({sizesInGroup.length}{' '}
                      {pluralize(sizesInGroup.length, 'размер', 'размера', 'размеров')})
                    </Text>
                  </Table.Cell>
                </Table.Row>

                {/* Sortable context for this gender group */}
                <SortableContext items={sizesInGroup.map((size) => size.id)} strategy={verticalListSortingStrategy}>
                  {sizesInGroup.map((size) => (
                    <SortableSizeRow key={size.id} size={size} />
                  ))}
                </SortableContext>
              </Fragment>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </DndContext>
  )
}
