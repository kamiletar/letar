'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, Button, Flex, IconButton, Table, Text } from '@chakra-ui/react'
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
import { useEffect, useState, useTransition } from 'react'
import { LuTrash2 } from 'react-icons/lu'
import { deleteCategory } from '../_actions/delete-category'
import { reorderCategories } from '../_actions/reorder-categories'

type CategoryWithCount = {
  id: string
  name: string
  slug: string
  sortOrder: number
  _count: {
    products: number
  }
}

/**
 * Склонение слова "товар"
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
 * Строка таблицы с поддержкой drag-and-drop
 */
function SortableCategoryRow({ category, onDelete }: { category: CategoryWithCount; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id })

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
      data-testid="category-row"
    >
      {/* Drag Handle */}
      <Table.Cell {...listeners}>
        <Text fontSize="lg" color="gray.500" userSelect="none">
          ⋮⋮
        </Text>
      </Table.Cell>

      <Table.Cell>
        <Text fontWeight="medium">{category.name}</Text>
      </Table.Cell>

      <Table.Cell>
        <Text fontSize="sm" fontFamily="mono" color="fg.muted">
          {category.slug}
        </Text>
      </Table.Cell>

      <Table.Cell>
        <Text fontSize="sm" color="fg.muted">
          {category.sortOrder}
        </Text>
      </Table.Cell>

      <Table.Cell>
        {category._count.products > 0 ? (
          <Badge colorPalette="green" size="sm">
            {category._count.products} {pluralize(category._count.products, 'товар', 'товара', 'товаров')}
          </Badge>
        ) : (
          <Badge colorPalette="gray" size="sm" variant="subtle">
            Пусто
          </Badge>
        )}
      </Table.Cell>

      <Table.Cell>
        <Flex gap={2}>
          <Button asChild size="sm" variant="outline">
            <NextLink href={`/admin/categories/${category.id}/edit`}>Редактировать</NextLink>
          </Button>
          <IconButton
            size="sm"
            variant="ghost"
            colorPalette="red"
            aria-label="Удалить категорию"
            onClick={() => onDelete(category.id)}
            disabled={category._count.products > 0}
            title={category._count.products > 0 ? 'Нельзя удалить категорию с товарами' : 'Удалить категорию'}
          >
            <LuTrash2 />
          </IconButton>
        </Flex>
      </Table.Cell>
    </Table.Row>
  )
}

interface SortableCategoriesTableProps {
  categories: CategoryWithCount[]
}

/**
 * Таблица категорий с drag-and-drop сортировкой
 */
export function SortableCategoriesTable({ categories: initialCategories }: SortableCategoriesTableProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [isPending, startTransition] = useTransition()

  // Синхронизация с props при изменении (например, после удаления)
  useEffect(() => {
    setCategories(initialCategories)
  }, [initialCategories])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = categories.findIndex((c) => c.id === active.id)
    const newIndex = categories.findIndex((c) => c.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Переупорядочиваем локально
    const reordered = arrayMove(categories, oldIndex, newIndex)

    // Обновляем sortOrder
    const updates = reordered.map((cat, index) => ({
      id: cat.id,
      sortOrder: index,
    }))

    // Optimistic UI
    setCategories(reordered.map((cat, index) => ({ ...cat, sortOrder: index })))

    // Сохраняем на сервере
    startTransition(async () => {
      try {
        await reorderCategories(updates)
      } catch (error) {
        console.error('Failed to reorder categories:', error)
        setCategories(initialCategories)
        toaster.error({
          title: 'Ошибка',
          description: 'Не удалось сохранить порядок категорий',
        })
      }
    })
  }

  const handleDelete = (categoryId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту категорию?')) {
      return
    }

    startTransition(async () => {
      try {
        await deleteCategory(categoryId)
        toaster.success({
          title: 'Успешно',
          description: 'Категория удалена',
        })
      } catch (error) {
        toaster.error({
          title: 'Ошибка',
          description: error instanceof Error ? error.message : 'Не удалось удалить категорию',
        })
      }
    })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <Box overflowX="auto" opacity={isPending ? 0.6 : 1} data-testid="categories-list">
        <Table.Root size="sm" variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader w="40px"></Table.ColumnHeader>
              <Table.ColumnHeader>Название</Table.ColumnHeader>
              <Table.ColumnHeader>Slug</Table.ColumnHeader>
              <Table.ColumnHeader>Порядок</Table.ColumnHeader>
              <Table.ColumnHeader>Товаров</Table.ColumnHeader>
              <Table.ColumnHeader>Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {categories.map((category) => (
                <SortableCategoryRow key={category.id} category={category} onDelete={handleDelete} />
              ))}
            </SortableContext>
          </Table.Body>
        </Table.Root>
      </Box>
    </DndContext>
  )
}
