'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { type Collection, COLLECTION_TEMPLATES, useCollections } from '@/hooks/use-collections'
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
  Input,
  Portal,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FaArrowLeft, FaEdit, FaFolder, FaPlus, FaTrash } from 'react-icons/fa'

export default function CollectionsPage() {
  const { collections, isLoading, createCollection, createFromTemplate, updateCollection, deleteCollection } =
    useCollections()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', emoji: '' })

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toaster.warning({ title: 'Введите название коллекции' })
      return
    }

    const result = await createCollection(formData)
    if (result.success) {
      toaster.success({ title: 'Коллекция создана', description: formData.name })
      setIsCreateOpen(false)
      setFormData({ name: '', description: '', emoji: '' })
    }
  }

  const handleCreateFromTemplate = async (template: (typeof COLLECTION_TEMPLATES)[number]) => {
    const result = await createFromTemplate(template)
    if (result.success) {
      toaster.success({ title: 'Коллекция создана', description: template.name })
      setIsCreateOpen(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingCollection || !formData.name.trim()) {
      return
    }

    await updateCollection(editingCollection.id, formData)
    toaster.success({ title: 'Коллекция обновлена' })
    setEditingCollection(null)
    setFormData({ name: '', description: '', emoji: '' })
  }

  const handleDelete = async (collection: Collection) => {
    if (!confirm(`Удалить коллекцию "${collection.name}"?`)) {
      return
    }

    await deleteCollection(collection.id)
    toaster.success({ title: 'Коллекция удалена' })
  }

  const openEdit = (collection: Collection) => {
    setEditingCollection(collection)
    setFormData({
      name: collection.name,
      description: collection.description || '',
      emoji: collection.emoji || '',
    })
  }

  if (isLoading) {
    return (
      <Container maxW="6xl" py={8}>
        <Text>Загрузка...</Text>
      </Container>
    )
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <HStack gap={4}>
            <Button asChild variant="ghost" size="sm">
              <Link href="/profile">
                <Icon as={FaArrowLeft} mr={2} />
                Профиль
              </Link>
            </Button>
            <Heading size="xl">
              Мои коллекции
              {collections.length > 0 && (
                <Badge ml={3} colorPalette="fg" size="lg">
                  {collections.length}
                </Badge>
              )}
            </Heading>
          </HStack>
          <Button colorPalette="fg" onClick={() => setIsCreateOpen(true)}>
            <Icon as={FaPlus} mr={2} />
            Новая коллекция
          </Button>
        </HStack>

        {/* Список коллекций */}
        {collections.length === 0 ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <Icon as={FaFolder} />
              </EmptyState.Indicator>
              <EmptyState.Title>Нет коллекций</EmptyState.Title>
              <EmptyState.Description>
                Создайте коллекцию для организации товаров по событиям, сезонам или целям
              </EmptyState.Description>
            </EmptyState.Content>
            <Button colorPalette="fg" onClick={() => setIsCreateOpen(true)}>
              <Icon as={FaPlus} mr={2} />
              Создать коллекцию
            </Button>
          </EmptyState.Root>
        ) : (
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onEdit={() => openEdit(collection)}
                onDelete={() => handleDelete(collection)}
              />
            ))}
          </Grid>
        )}

        {/* Диалог создания коллекции */}
        <Dialog.Root open={isCreateOpen} onOpenChange={(e) => setIsCreateOpen(e.open)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content maxW="lg">
                <Dialog.Header>
                  <Dialog.Title>Новая коллекция</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <VStack gap={6} align="stretch">
                    {/* Шаблоны */}
                    <VStack align="stretch" gap={2}>
                      <Text fontWeight="medium" fontSize="sm">
                        Из шаблона
                      </Text>
                      <SimpleGrid columns={{ base: 2, sm: 3 }} gap={2}>
                        {COLLECTION_TEMPLATES.map((template) => (
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
                      <Text fontWeight="medium" fontSize="sm" mb={4}>
                        Или создайте свою
                      </Text>

                      <VStack gap={4} align="stretch">
                        <HStack gap={4}>
                          <Field.Root flex="0 0 80px">
                            <Field.Label>Эмодзи</Field.Label>
                            <Input
                              value={formData.emoji}
                              onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                              placeholder="📁"
                              maxLength={2}
                              textAlign="center"
                            />
                          </Field.Root>
                          <Field.Root flex="1">
                            <Field.Label>Название</Field.Label>
                            <Input
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="Моя коллекция"
                            />
                          </Field.Root>
                        </HStack>

                        <Field.Root>
                          <Field.Label>Описание (опционально)</Field.Label>
                          <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Для чего эта коллекция?"
                            rows={2}
                          />
                        </Field.Root>
                      </VStack>
                    </Box>
                  </VStack>
                </Dialog.Body>
                <Dialog.Footer>
                  <HStack gap={2}>
                    <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                      Отмена
                    </Button>
                    <Button colorPalette="fg" onClick={handleCreate} disabled={!formData.name.trim()}>
                      Создать
                    </Button>
                  </HStack>
                </Dialog.Footer>
                <Dialog.CloseTrigger />
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>

        {/* Диалог редактирования коллекции */}
        <Dialog.Root open={!!editingCollection} onOpenChange={(e) => !e.open && setEditingCollection(null)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content maxW="md">
                <Dialog.Header>
                  <Dialog.Title>Редактировать коллекцию</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <VStack gap={4} align="stretch">
                    <HStack gap={4}>
                      <Field.Root flex="0 0 80px">
                        <Field.Label>Эмодзи</Field.Label>
                        <Input
                          value={formData.emoji}
                          onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                          placeholder="📁"
                          maxLength={2}
                          textAlign="center"
                        />
                      </Field.Root>
                      <Field.Root flex="1">
                        <Field.Label>Название</Field.Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Моя коллекция"
                        />
                      </Field.Root>
                    </HStack>

                    <Field.Root>
                      <Field.Label>Описание</Field.Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Для чего эта коллекция?"
                        rows={2}
                      />
                    </Field.Root>
                  </VStack>
                </Dialog.Body>
                <Dialog.Footer>
                  <HStack gap={2}>
                    <Button variant="ghost" onClick={() => setEditingCollection(null)}>
                      Отмена
                    </Button>
                    <Button colorPalette="fg" onClick={handleUpdate} disabled={!formData.name.trim()}>
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
 * Карточка коллекции
 */
function CollectionCard({
  collection,
  onEdit,
  onDelete,
}: {
  collection: Collection
  onEdit: () => void
  onDelete: () => void
}) {
  const itemCount = collection.items.length
  const totalPrice = collection.items.reduce((sum, item) => sum + item.price, 0)

  return (
    <Card.Root overflow="hidden" _hover={{ shadow: 'md' }} transition="shadow 0.2s">
      <Link href={`/profile/collections/${collection.id}`}>
        {/* Обложка */}
        <Box h={40} bg="bg.subtle" position="relative" overflow="hidden">
          {collection.coverImage ? (
            <Image src={collection.coverImage} alt={collection.name} w="full" h="full" objectFit="cover" />
          ) : (
            <Box w="full" h="full" display="flex" alignItems="center" justifyContent="center" bg="bg.muted">
              <Text fontSize="5xl">{collection.emoji || '📁'}</Text>
            </Box>
          )}
          {/* Превью товаров */}
          {itemCount > 0 && (
            <HStack position="absolute" bottom={2} left={2} gap={1}>
              {collection.items.slice(0, 4).map((item, i) => (
                <Box
                  key={item.variantId}
                  w={8}
                  h={8}
                  borderRadius="md"
                  overflow="hidden"
                  borderWidth="2px"
                  borderColor="white"
                  shadow="sm"
                  style={{ marginLeft: i > 0 ? -8 : 0 }}
                >
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt="" w="full" h="full" objectFit="cover" />
                  ) : (
                    <Box w="full" h="full" bg="bg.muted" />
                  )}
                </Box>
              ))}
              {itemCount > 4 && (
                <Badge colorPalette="gray" size="sm" ml={1}>
                  +{itemCount - 4}
                </Badge>
              )}
            </HStack>
          )}
        </Box>
      </Link>

      <Card.Body p={4}>
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <Link href={`/profile/collections/${collection.id}`}>
              <HStack gap={2}>
                {collection.emoji && <Text>{collection.emoji}</Text>}
                <Heading size="md" lineClamp={1}>
                  {collection.name}
                </Heading>
              </HStack>
            </Link>
            <HStack gap={1}>
              <IconButton aria-label="Редактировать" variant="ghost" size="xs" onClick={onEdit}>
                <Icon as={FaEdit} />
              </IconButton>
              <IconButton aria-label="Удалить" variant="ghost" size="xs" colorPalette="red" onClick={onDelete}>
                <Icon as={FaTrash} />
              </IconButton>
            </HStack>
          </HStack>

          {collection.description && (
            <Text fontSize="sm" color="fg.muted" lineClamp={2}>
              {collection.description}
            </Text>
          )}

          <HStack justify="space-between" fontSize="sm" color="fg.muted">
            <Text>
              {itemCount} {itemCount === 1 ? 'товар' : itemCount < 5 ? 'товара' : 'товаров'}
            </Text>
            {totalPrice > 0 && <Text fontWeight="medium">{totalPrice.toLocaleString('ru-RU')} ₽</Text>}
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
