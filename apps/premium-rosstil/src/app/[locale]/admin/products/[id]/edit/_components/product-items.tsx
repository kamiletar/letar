'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { Gender, ProductSize } from '@/generated/prisma'
import { Button, Card, Dialog, Heading, HStack, Portal, Table, Text } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { createItem } from '../_actions/create-item'
import { deleteItem } from '../_actions/delete-item'
import { updateItem } from '../_actions/update-item'
import { ProductItemForm } from './product-item-form'
import type { SerializedProductItem } from './variants-management'

interface ProductItemsProps {
  productId: string
  variantId: string
  gender: Gender
  items: SerializedProductItem[]
  allSizes: ProductSize[]
}

/**
 * Компонент управления товарами варианта продукта.
 * Поддерживает CRUD операции для ProductItem.
 */
export function ProductItems({ productId, variantId, gender, items, allSizes }: ProductItemsProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SerializedProductItem | null>(null)
  const [isPending, startTransition] = useTransition()

  // Фильтруем размеры по полу
  const availableSizes = allSizes.filter((size) => size.gender === gender)

  // Создание товара
  const createAction = createItem.bind(null, productId, variantId)

  // Редактирование товара
  const editAction = editingItem ? updateItem.bind(null, productId, editingItem.id) : null

  // Удаление товара
  const handleDelete = (itemId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      return
    }

    startTransition(async () => {
      try {
        await deleteItem(productId, itemId)
        toaster.success({
          title: 'Товар удален',
        })
      } catch (error) {
        toaster.error({
          title: 'Ошибка',
          description: error instanceof Error ? error.message : 'Не удалось удалить товар',
        })
      }
    })
  }

  return (
    <>
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <Heading size="md" textTransform="none">
              Товары ({items.length})
            </Heading>
            <Button size="sm" colorPalette="fg" onClick={() => setCreateDialogOpen(true)}>
              Добавить товар
            </Button>
          </HStack>
        </Card.Header>

        <Card.Body>
          {items.length === 0 ? (
            <Text color="fg.muted" fontSize="sm">
              Нет товаров. Добавьте размеры и цены для этого варианта.
            </Text>
          ) : (
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Размер</Table.ColumnHeader>
                  <Table.ColumnHeader>Цена</Table.ColumnHeader>
                  <Table.ColumnHeader>В наличии</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {items.map((item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell>
                      {item.size.international} (RU {item.size.ru})
                    </Table.Cell>
                    <Table.Cell>
                      {Number(item.price).toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      })}
                    </Table.Cell>
                    <Table.Cell>{item.availableCount} шт</Table.Cell>
                    <Table.Cell textAlign="end">
                      <HStack gap={2} justify="end">
                        <Button size="xs" variant="outline" colorPalette="fg" onClick={() => setEditingItem(item)}>
                          Изменить
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          colorPalette="red"
                          onClick={() => handleDelete(item.id)}
                          loading={isPending}
                        >
                          Удалить
                        </Button>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card.Body>
      </Card.Root>

      {/* Диалог создания товара */}
      <Dialog.Root open={createDialogOpen} onOpenChange={(e) => setCreateDialogOpen(e.open)}>
        <Portal>
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Добавить товар</Dialog.Title>
              </Dialog.Header>

              <Dialog.Body>
                <ProductItemForm
                  action={createAction}
                  sizes={availableSizes}
                  submitLabel="Добавить"
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

      {/* Диалог редактирования товара */}
      {editingItem && editAction && (
        <Dialog.Root
          open={!!editingItem}
          onOpenChange={(e) => {
            if (!e.open) {
              setEditingItem(null)
            }
          }}
        >
          <Portal>
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Редактировать товар</Dialog.Title>
                </Dialog.Header>

                <Dialog.Body>
                  <ProductItemForm
                    action={editAction}
                    sizes={availableSizes}
                    defaultValue={{
                      sizeId: editingItem.sizeId,
                      price: editingItem.price.toString(),
                      availableCount: editingItem.availableCount.toString(),
                    }}
                    submitLabel="Сохранить"
                    onSuccess={() => setEditingItem(null)}
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
