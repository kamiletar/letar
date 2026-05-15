'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { CollectionItem } from '@/hooks/use-collections'
import { COLLECTION_TEMPLATES, useCollections } from '@/hooks/use-collections'
import {
  Badge,
  Box,
  Button,
  Dialog,
  Field,
  HStack,
  Icon,
  IconButton,
  Input,
  Menu,
  Portal,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FaCheck, FaFolder, FaFolderPlus, FaPlus } from 'react-icons/fa'

interface AddToCollectionButtonProps {
  /** ID варианта товара */
  variantId: string
  /** ID товара (Product) */
  productId: string
  /** Название товара */
  productName: string
  /** Цвет варианта */
  variantColor: string
  /** URL изображения */
  imageUrl?: string
  /** Цена */
  price: number
  /** Размер кнопки */
  size?: 'xs' | 'sm' | 'md'
  /** Вариант отображения */
  variant?: 'ghost' | 'outline' | 'subtle'
}

/**
 * Кнопка добавления товара в коллекцию.
 * Показывает меню с доступными коллекциями и возможностью создать новую.
 */
export function AddToCollectionButton({
  variantId,
  productId,
  productName,
  variantColor,
  imageUrl,
  price,
  size = 'sm',
  variant = 'ghost',
}: AddToCollectionButtonProps) {
  const {
    collections,
    addItemToCollection,
    removeItemFromCollection,
    createCollection,
    createFromTemplate,
    getCollectionsWithItem,
    isLoading,
  } = useCollections()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')

  const collectionsWithItem = getCollectionsWithItem(variantId)
  const isInAnyCollection = collectionsWithItem.length > 0

  const handleToggleCollection = async (collectionId: string) => {
    const isInCollection = collectionsWithItem.some((c) => c.id === collectionId)

    if (isInCollection) {
      await removeItemFromCollection(collectionId, variantId)
      toaster.success({ title: 'Удалено из коллекции' })
    } else {
      const item: Omit<CollectionItem, 'position' | 'addedAt' | 'note'> = {
        variantId,
        productId,
        productName,
        variantColor,
        imageUrl,
        price,
      }

      const result = await addItemToCollection(collectionId, item)
      if (result.success) {
        toaster.success({ title: 'Добавлено в коллекцию' })
      } else if ('error' in result) {
        toaster.warning({ title: result.error })
      }
    }
  }

  const handleCreateAndAdd = async () => {
    if (!newCollectionName.trim()) {
      toaster.warning({ title: 'Введите название коллекции' })
      return
    }

    const result = await createCollection({ name: newCollectionName })
    if (result.success && result.collection) {
      const item: Omit<CollectionItem, 'position' | 'addedAt' | 'note'> = {
        variantId,
        productId,
        productName,
        variantColor,
        imageUrl,
        price,
      }
      await addItemToCollection(result.collection.id, item)
      toaster.success({ title: 'Коллекция создана и товар добавлен' })
      setIsCreateOpen(false)
      setNewCollectionName('')
    }
  }

  const handleCreateFromTemplate = async (template: (typeof COLLECTION_TEMPLATES)[number]) => {
    const result = await createFromTemplate(template)
    if (result.success && result.collection) {
      const item: Omit<CollectionItem, 'position' | 'addedAt' | 'note'> = {
        variantId,
        productId,
        productName,
        variantColor,
        imageUrl,
        price,
      }
      await addItemToCollection(result.collection.id, item)
      toaster.success({ title: `Коллекция "${template.name}" создана` })
      setIsCreateOpen(false)
    }
  }

  if (isLoading) {
    return null
  }

  return (
    <>
      <Menu.Root positioning={{ placement: 'bottom-start' }}>
        <Menu.Trigger asChild>
          <IconButton
            aria-label="Добавить в коллекцию"
            variant={isInAnyCollection ? 'solid' : variant}
            colorPalette={isInAnyCollection ? 'purple' : 'gray'}
            size={size}
          >
            <Icon as={isInAnyCollection ? FaFolder : FaFolderPlus} />
            {isInAnyCollection && collectionsWithItem.length > 0 && (
              <Badge position="absolute" top={-1} right={-1} colorPalette="purple" size="xs" borderRadius="full">
                {collectionsWithItem.length}
              </Badge>
            )}
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content minW="220px">
              <Box px={3} py={2} borderBottomWidth="1px" borderColor="border.muted">
                <Text fontWeight="medium" fontSize="sm">
                  Добавить в коллекцию
                </Text>
              </Box>

              {collections.length === 0 ? (
                <Box px={3} py={4} textAlign="center">
                  <Text fontSize="sm" color="fg.muted">
                    Нет коллекций
                  </Text>
                </Box>
              ) : (
                collections.map((collection) => {
                  const isInCollection = collectionsWithItem.some((c) => c.id === collection.id)
                  return (
                    <Menu.Item
                      key={collection.id}
                      value={collection.id}
                      onClick={() => handleToggleCollection(collection.id)}
                    >
                      <HStack justify="space-between" w="full">
                        <HStack gap={2}>
                          <Text>{collection.emoji || '📁'}</Text>
                          <Text fontSize="sm">{collection.name}</Text>
                        </HStack>
                        {isInCollection && <Icon as={FaCheck} color="green.500" />}
                      </HStack>
                    </Menu.Item>
                  )
                })
              )}

              <Menu.Separator />
              <Menu.Item value="create" onClick={() => setIsCreateOpen(true)}>
                <HStack gap={2}>
                  <Icon as={FaPlus} />
                  <Text fontSize="sm">Создать коллекцию</Text>
                </HStack>
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>

      {/* Диалог создания коллекции */}
      <Dialog.Root open={isCreateOpen} onOpenChange={(e) => setIsCreateOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="md">
              <Dialog.Header>
                <Dialog.Title>Новая коллекция</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={4} align="stretch">
                  {/* Быстрые шаблоны */}
                  <VStack align="stretch" gap={2}>
                    <Text fontWeight="medium" fontSize="sm">
                      Из шаблона
                    </Text>
                    <SimpleGrid columns={2} gap={2}>
                      {COLLECTION_TEMPLATES.slice(0, 4).map((template) => (
                        <Button
                          key={template.name}
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateFromTemplate(template)}
                          justifyContent="flex-start"
                        >
                          <Text as="span" mr={2}>
                            {template.emoji}
                          </Text>
                          {template.name}
                        </Button>
                      ))}
                    </SimpleGrid>
                  </VStack>

                  <Box borderTopWidth="1px" borderColor="border.muted" pt={4}>
                    <Field.Root>
                      <Field.Label>Или введите название</Field.Label>
                      <Input
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        placeholder="Моя коллекция"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateAndAdd()
                          }
                        }}
                      />
                    </Field.Root>
                  </Box>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <HStack gap={2}>
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                    Отмена
                  </Button>
                  <Button colorPalette="fg" onClick={handleCreateAndAdd} disabled={!newCollectionName.trim()}>
                    Создать и добавить
                  </Button>
                </HStack>
              </Dialog.Footer>
              <Dialog.CloseTrigger />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
