'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { CollectionItem } from '@/hooks/use-collections'
import { useCollections } from '@/hooks/use-collections'
import { Link } from '@/i18n/navigation'
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Dialog,
  EmptyState,
  Field,
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Image,
  Portal,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { use, useCallback, useState } from 'react'
import { FaArrowLeft, FaEdit, FaFolder, FaGripVertical, FaStickyNote, FaTrash } from 'react-icons/fa'

interface Props {
  params: Promise<{ id: string }>
}

export default function CollectionPage({ params }: Props) {
  const { id } = use(params)
  const { getCollection, removeItemFromCollection, updateItemNote, reorderItems, isLoading } = useCollections()
  const [editingNote, setEditingNote] = useState<{ variantId: string; note: string } | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const collection = getCollection(id)

  const handleRemoveItem = async (item: CollectionItem) => {
    if (!confirm(`Удалить "${item.productName}" из коллекции?`)) {
      return
    }

    await removeItemFromCollection(id, item.variantId)
    toaster.success({ title: 'Товар удалён из коллекции' })
  }

  const handleSaveNote = async () => {
    if (!editingNote) {
      return
    }

    await updateItemNote(id, editingNote.variantId, editingNote.note)
    toaster.success({ title: 'Заметка сохранена' })
    setEditingNote(null)
  }

  // Drag & Drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    async (targetIndex: number) => {
      if (draggedIndex === null || draggedIndex === targetIndex) {
        setDraggedIndex(null)
        return
      }

      await reorderItems(id, draggedIndex, targetIndex)
      setDraggedIndex(null)
    },
    [draggedIndex, id, reorderItems]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
  }, [])

  if (isLoading) {
    return (
      <Container maxW="6xl" py={8}>
        <Text>Загрузка...</Text>
      </Container>
    )
  }

  if (!collection) {
    notFound()
  }

  const totalPrice = collection.items.reduce((sum, item) => sum + item.price, 0)

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <VStack align="start" gap={1}>
            <Button asChild variant="ghost" size="sm">
              <Link href="/profile/collections">
                <Icon as={FaArrowLeft} mr={2} />
                Коллекции
              </Link>
            </Button>
            <HStack gap={3}>
              {collection.emoji && <Text fontSize="3xl">{collection.emoji}</Text>}
              <Heading size="xl">{collection.name}</Heading>
            </HStack>
            {collection.description && <Text color="fg.muted">{collection.description}</Text>}
          </VStack>

          <VStack align="end" gap={1}>
            <Badge colorPalette="fg" size="lg">
              {collection.items.length}{' '}
              {collection.items.length === 1 ? 'товар' : collection.items.length < 5 ? 'товара' : 'товаров'}
            </Badge>
            {totalPrice > 0 && (
              <Text fontSize="lg" fontWeight="bold">
                {totalPrice.toLocaleString('ru-RU')} ₽
              </Text>
            )}
          </VStack>
        </HStack>

        {/* Товары */}
        {collection.items.length === 0 ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <Icon as={FaFolder} />
              </EmptyState.Indicator>
              <EmptyState.Title>Коллекция пуста</EmptyState.Title>
              <EmptyState.Description>
                Добавьте товары в коллекцию из каталога или страницы товара
              </EmptyState.Description>
            </EmptyState.Content>
            <Button asChild colorPalette="fg">
              <Link href="/catalog">Перейти в каталог</Link>
            </Button>
          </EmptyState.Root>
        ) : (
          <>
            <Text fontSize="sm" color="fg.muted">
              Перетащите товары для изменения порядка
            </Text>
            <Grid
              templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }}
              gap={4}
            >
              {collection.items
                .sort((a, b) => a.position - b.position)
                .map((item, index) => (
                  <CollectionItemCard
                    key={item.variantId}
                    item={item}
                    index={index}
                    isDragging={draggedIndex === index}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    onRemove={() => handleRemoveItem(item)}
                    onEditNote={() => setEditingNote({ variantId: item.variantId, note: item.note || '' })}
                  />
                ))}
            </Grid>
          </>
        )}

        {/* Диалог редактирования заметки */}
        <Dialog.Root open={!!editingNote} onOpenChange={(e) => !e.open && setEditingNote(null)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content maxW="md">
                <Dialog.Header>
                  <Dialog.Title>Заметка к товару</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Field.Root>
                    <Field.Label>Комментарий</Field.Label>
                    <Textarea
                      value={editingNote?.note || ''}
                      onChange={(e) => editingNote && setEditingNote({ ...editingNote, note: e.target.value })}
                      placeholder="Например: хочу к свадьбе, подойдёт к синим туфлям..."
                      rows={4}
                    />
                    <Field.HelperText>Заметка видна только вам</Field.HelperText>
                  </Field.Root>
                </Dialog.Body>
                <Dialog.Footer>
                  <HStack gap={2}>
                    <Button variant="ghost" onClick={() => setEditingNote(null)}>
                      Отмена
                    </Button>
                    <Button colorPalette="fg" onClick={handleSaveNote}>
                      Сохранить
                    </Button>
                  </HStack>
                </Dialog.Footer>
                <Dialog.CloseTrigger />
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </VStack>
    </Container>
  )
}

/**
 * Карточка товара в коллекции
 */
function CollectionItemCard({
  item,
  index: _index,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  onEditNote,
}: {
  item: CollectionItem
  index: number
  isDragging: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
  onRemove: () => void
  onEditNote: () => void
}) {
  return (
    <Card.Root
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      opacity={isDragging ? 0.5 : 1}
      cursor="grab"
      _hover={{ shadow: 'md' }}
      transition="all 0.2s"
      overflow="hidden"
    >
      {/* Изображение */}
      <Box position="relative">
        <Link href={`/catalog/${item.productId}`}>
          <Box h={48} bg="bg.subtle">
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={item.productName} w="full" h="full" objectFit="cover" />
            ) : (
              <Box w="full" h="full" display="flex" alignItems="center" justifyContent="center">
                <Icon as={FaFolder} boxSize={12} color="fg.muted" />
              </Box>
            )}
          </Box>
        </Link>

        {/* Drag handle */}
        <Box
          position="absolute"
          top={2}
          left={2}
          bg="blackAlpha.600"
          color="white"
          p={1}
          borderRadius="md"
          cursor="grab"
        >
          <Icon as={FaGripVertical} boxSize={4} />
        </Box>

        {/* Кнопки действий */}
        <HStack position="absolute" top={2} right={2} gap={1}>
          <IconButton
            aria-label="Заметка"
            size="xs"
            variant="solid"
            bg="blackAlpha.600"
            color="white"
            _hover={{ bg: 'blackAlpha.700' }}
            onClick={onEditNote}
          >
            <Icon as={item.note ? FaStickyNote : FaEdit} />
          </IconButton>
          <IconButton
            aria-label="Удалить"
            size="xs"
            variant="solid"
            bg="red.500"
            color="white"
            _hover={{ bg: 'red.600' }}
            onClick={onRemove}
          >
            <Icon as={FaTrash} />
          </IconButton>
        </HStack>
      </Box>

      <Card.Body p={3}>
        <VStack align="stretch" gap={1}>
          <Link href={`/catalog/${item.productId}`}>
            <Text fontWeight="medium" fontSize="sm" lineClamp={2}>
              {item.productName}
            </Text>
          </Link>
          <Text fontSize="xs" color="fg.muted">
            {item.variantColor}
          </Text>
          <Text fontWeight="bold">{item.price.toLocaleString('ru-RU')} ₽</Text>
          {item.note && (
            <Box bg="yellow.subtle" p={2} borderRadius="md" mt={1}>
              <Text fontSize="xs" color="yellow.700" lineClamp={2}>
                {item.note}
              </Text>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
