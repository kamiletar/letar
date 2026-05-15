'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { Gender } from '@/generated/prisma'
import { Box, Text, VStack } from '@chakra-ui/react'
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
import { useEffect, useState, useTransition } from 'react'
import { reorderProducts } from '../_actions/reorder-products'
import { ProductCard } from './product-card'

// Типы для продукта (соответствуют данным из page.tsx)
interface VariantImage {
  url: string
  alt?: string | null
}

interface VariantItem {
  id: string
  price: string
  size: {
    international: string
  }
}

interface Variant {
  id: string
  color: string
  composition: string
  images: VariantImage[]
  items: VariantItem[]
}

interface Product {
  id: string
  name: string
  gender: Gender
  isNewCollection: boolean
  categoryName?: string | null
  sortOrder: number
  createdAt: string
  variants: Variant[]
}

interface SortableProductItemProps {
  product: Product
}

/**
 * Обёртка для ProductCard с поддержкой перетаскивания
 */
function SortableProductItem({ product }: SortableProductItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      position="relative"
      bg={isDragging ? 'gray.subtle' : undefined}
      borderRadius="md"
    >
      {/* Drag handle */}
      <Box
        {...listeners}
        position="absolute"
        left={-8}
        top="50%"
        transform="translateY(-50%)"
        cursor="grab"
        _active={{ cursor: 'grabbing' }}
        p={2}
        zIndex={10}
        display={{ base: 'none', md: 'block' }}
      >
        <Text fontSize="lg" color="gray.500" userSelect="none">
          ⋮⋮
        </Text>
      </Box>
      <ProductCard product={product} />
    </Box>
  )
}

interface SortableProductListProps {
  products: Product[]
}

/**
 * Список продуктов с поддержкой drag-and-drop сортировки
 */
export function SortableProductList({ products }: SortableProductListProps) {
  const [localProducts, setLocalProducts] = useState(products)
  const [isPending, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Синхронизируем локальное состояние с пропсами
  useEffect(() => {
    setLocalProducts(products)
  }, [products])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = localProducts.findIndex((item) => item.id === active.id)
      const newIndex = localProducts.findIndex((item) => item.id === over.id)
      const reordered = arrayMove(localProducts, oldIndex, newIndex)

      // Обновляем локальное состояние для мгновенной реакции
      setLocalProducts(reordered)

      // Сохраняем новый порядок на сервере
      startTransition(async () => {
        try {
          await reorderProducts(reordered.map((product, index) => ({ id: product.id, sortOrder: index })))
          toaster.success({
            title: 'Порядок изменен',
            description: 'Новый порядок продуктов сохранен',
          })
        } catch (error) {
          toaster.error({
            title: 'Ошибка',
            description: error instanceof Error ? error.message : 'Не удалось изменить порядок',
          })
          // Откатываем изменения при ошибке
          setLocalProducts(products)
        }
      })
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={localProducts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <VStack gap={6} align="stretch" opacity={isPending ? 0.6 : 1} pl={{ base: 0, md: 8 }}>
          {localProducts.map((product) => (
            <SortableProductItem key={product.id} product={product} />
          ))}
        </VStack>
      </SortableContext>
    </DndContext>
  )
}
