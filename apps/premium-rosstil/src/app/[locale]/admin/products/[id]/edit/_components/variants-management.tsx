'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { Gender, Image as ImageModel, ProductSize, ProductVariant, VariantImage } from '@/generated/prisma'
import { Box, Button, Card, Dialog, Heading, HStack, Portal, Text, VStack } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { createVariant } from '../_actions/create-variant'
import { deleteVariant } from '../_actions/delete-variant'
import { updateVariant } from '../_actions/update-variant'
import { ProductItems } from './product-items'
import { VariantForm } from './variant-form'
import { VariantImages } from './variant-images'

// Тип VariantImage с включённой связью image
type VariantImageWithImage = VariantImage & {
  image: ImageModel
}

// Сериализованный ProductItem с price как number (Decimal сериализуется на сервере)
export type SerializedProductItem = {
  id: string
  variantId: string
  sizeId: string
  price: number
  availableCount: number
  createdAt: Date
  updatedAt: Date
  size: ProductSize
}

interface VariantsManagementProps {
  productId: string
  productGender: Gender
  variants: (ProductVariant & {
    items: SerializedProductItem[]
    images: VariantImageWithImage[]
  })[]
  allSizes: ProductSize[]
}

/**
 * Компонент управления вариантами продукта с полным CRUD функционалом.
 */
export function VariantsManagement({ productId, productGender, variants, allSizes }: VariantsManagementProps) {
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [isPending, startTransition] = useTransition()

  // Создание варианта
  const createAction = createVariant.bind(null, productId)

  // Редактирование варианта
  const editAction = editingVariant ? updateVariant.bind(null, productId, editingVariant.id) : null

  // Удаление варианта
  const handleDelete = (variantId: string) => {
    if (
      !window.confirm(
        'Вы уверены, что хотите удалить этот вариант? Это также удалит все связанные товары и изображения.'
      )
    ) {
      return
    }

    startTransition(async () => {
      try {
        await deleteVariant(productId, variantId)
        toaster.success({
          title: 'Вариант удален',
          description: 'Вариант продукта успешно удален',
        })
      } catch (error) {
        toaster.error({
          title: 'Ошибка',
          description: error instanceof Error ? error.message : 'Не удалось удалить вариант',
        })
      }
    })
  }

  if (variants.length === 0) {
    return (
      <>
        <Card.Root>
          <Card.Body>
            <VStack gap={4}>
              <Text color="fg.muted">
                У этого продукта пока нет вариантов. Создайте первый вариант, чтобы добавить товары и изображения.
              </Text>
              <Button colorPalette="fg" onClick={() => setCreateDialogOpen(true)}>
                Создать вариант
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Диалог создания варианта */}
        <Dialog.Root open={createDialogOpen} onOpenChange={(e) => setCreateDialogOpen(e.open)}>
          <Portal>
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Создать вариант</Dialog.Title>
                </Dialog.Header>

                <Dialog.Body>
                  <VariantForm
                    action={createAction}
                    submitLabel="Создать"
                    onSuccess={() => setCreateDialogOpen(false)}
                  />
                </Dialog.Body>

                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">Отмена</Button>
                  </Dialog.ActionTrigger>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </>
    )
  }

  return (
    <>
      <VStack gap={4} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg" textTransform="none">
            Варианты продукта
          </Heading>
          <Button colorPalette="fg" size="sm" onClick={() => setCreateDialogOpen(true)}>
            Добавить вариант
          </Button>
        </HStack>

        {variants.map((variant) => (
          <Card.Root key={variant.id}>
            <Card.Header>
              <HStack justify="space-between">
                <Box>
                  <Text fontWeight="semibold" fontSize="lg">
                    {variant.color}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    Состав: {variant.composition}
                  </Text>
                </Box>
                <HStack>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedVariantId(expandedVariantId === variant.id ? null : variant.id)}
                  >
                    {expandedVariantId === variant.id ? 'Скрыть' : 'Показать'}
                  </Button>
                  <Button size="sm" variant="outline" colorPalette="fg" onClick={() => setEditingVariant(variant)}>
                    Редактировать
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="red"
                    onClick={() => handleDelete(variant.id)}
                    disabled={isPending}
                  >
                    Удалить
                  </Button>
                </HStack>
              </HStack>
            </Card.Header>

            {expandedVariantId === variant.id && (
              <Card.Body>
                <VStack gap={4} align="stretch">
                  {/* Товары */}
                  <ProductItems
                    productId={productId}
                    variantId={variant.id}
                    gender={productGender}
                    items={variant.items}
                    allSizes={allSizes}
                  />

                  {/* Изображения */}
                  <VariantImages
                    productId={productId}
                    variantId={variant.id}
                    images={variant.images.sort((a, b) => a.order - b.order)}
                  />
                </VStack>
              </Card.Body>
            )}
          </Card.Root>
        ))}
      </VStack>

      {/* Диалог создания варианта */}
      <Dialog.Root open={createDialogOpen} onOpenChange={(e) => setCreateDialogOpen(e.open)}>
        <Portal>
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Создать вариант</Dialog.Title>
              </Dialog.Header>

              <Dialog.Body>
                <VariantForm action={createAction} submitLabel="Создать" onSuccess={() => setCreateDialogOpen(false)} />
              </Dialog.Body>

              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">Отмена</Button>
                </Dialog.ActionTrigger>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Диалог редактирования варианта */}
      {editingVariant && editAction && (
        <Dialog.Root
          open={!!editingVariant}
          onOpenChange={(e) => {
            if (!e.open) {
              setEditingVariant(null)
            }
          }}
        >
          <Portal>
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Редактировать вариант</Dialog.Title>
                </Dialog.Header>

                <Dialog.Body>
                  <VariantForm
                    action={editAction}
                    defaultValue={{
                      color: editingVariant.color,
                      composition: editingVariant.composition,
                    }}
                    submitLabel="Сохранить"
                    onSuccess={() => setEditingVariant(null)}
                  />
                </Dialog.Body>

                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">Отмена</Button>
                  </Dialog.ActionTrigger>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      )}
    </>
  )
}
