'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { ChecklistItemStatus, Season, UserChecklistItem } from '@/hooks/use-season-checklist'
import { SEASON_CHECKLISTS, SEASON_CONFIG, STATUS_CONFIG, useSeasonChecklist } from '@/hooks/use-season-checklist'
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Dialog,
  EmptyState,
  Field,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Portal,
  Progress,
  SegmentGroup,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import {
  FaCalendarAlt,
  FaEdit,
  FaLeaf,
  FaLink,
  FaPlus,
  FaRedo,
  FaSnowflake,
  FaStickyNote,
  FaSun,
  FaTrash,
} from 'react-icons/fa'

const SEASON_ICONS: Record<Season, React.ElementType> = {
  spring: FaLeaf,
  summer: FaSun,
  fall: FaLeaf,
  winter: FaSnowflake,
}

export default function SeasonChecklistPage() {
  const {
    checklists,
    isLoading,
    getChecklist,
    createFromTemplate,
    updateItemStatus,
    updateItemNote,
    addCustomItem,
    removeItem,
    deleteChecklist,
    resetChecklist,
    getStats,
    getCurrentSeason,
  } = useSeasonChecklist()

  const [selectedSeason, setSelectedSeason] = useState<Season>(getCurrentSeason())
  const [editingNote, setEditingNote] = useState<{ itemId: string; note: string } | null>(null)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('')

  const checklist = getChecklist(selectedSeason)
  const stats = getStats(selectedSeason)

  const handleCreateChecklist = async () => {
    const result = await createFromTemplate(selectedSeason)
    if (result.success) {
      toaster.success({ title: `Чеклист на ${SEASON_CONFIG[selectedSeason].label.toLowerCase()} создан` })
    } else if ('error' in result) {
      toaster.warning({ title: result.error })
    }
  }

  const handleStatusChange = async (itemId: string, status: ChecklistItemStatus) => {
    await updateItemStatus(selectedSeason, itemId, status)
  }

  const handleSaveNote = async () => {
    if (!editingNote) {
      return
    }
    await updateItemNote(selectedSeason, editingNote.itemId, editingNote.note)
    toaster.success({ title: 'Заметка сохранена' })
    setEditingNote(null)
  }

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      toaster.warning({ title: 'Введите название' })
      return
    }
    if (!newItemCategory.trim()) {
      toaster.warning({ title: 'Введите категорию' })
      return
    }

    await addCustomItem(selectedSeason, newItemName.trim(), newItemCategory.trim())
    toaster.success({ title: 'Элемент добавлен' })
    setNewItemName('')
    setNewItemCategory('')
    setIsAddingItem(false)
  }

  const handleRemoveItem = async (item: UserChecklistItem) => {
    if (!confirm(`Удалить "${item.name}" из чеклиста?`)) {
      return
    }
    await removeItem(selectedSeason, item.id)
    toaster.success({ title: 'Элемент удалён' })
  }

  const handleResetChecklist = async () => {
    if (!confirm('Сбросить все отметки? Все элементы станут "Нужно купить".')) {
      return
    }
    await resetChecklist(selectedSeason)
    toaster.success({ title: 'Чеклист сброшен' })
  }

  const handleDeleteChecklist = async () => {
    if (!confirm('Удалить весь чеклист? Это действие нельзя отменить.')) {
      return
    }
    await deleteChecklist(selectedSeason)
    toaster.success({ title: 'Чеклист удалён' })
  }

  if (isLoading) {
    return (
      <Container maxW="6xl" py={8}>
        <Text>Загрузка...</Text>
      </Container>
    )
  }

  // Группировка элементов по категориям
  const itemsByCategory: Record<string, UserChecklistItem[]> = {}
  if (checklist) {
    for (const item of checklist.items) {
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = []
      }
      itemsByCategory[item.category].push(item)
    }
  }

  // Получить emoji категории из шаблона
  const getCategoryEmoji = (categoryName: string): string => {
    const template = SEASON_CHECKLISTS[selectedSeason]
    const category = template.find((c) => c.name === categoryName)
    return category?.emoji || '📦'
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <VStack align="start" gap={1}>
            <Heading size="xl">
              <Icon as={FaCalendarAlt} mr={3} />
              Чеклист на сезон
            </Heading>
            <Text color="fg.muted">Планируйте обновление гардероба к каждому сезону</Text>
          </VStack>
        </HStack>

        {/* Выбор сезона */}
        <Card.Root>
          <Card.Body>
            <SegmentGroup.Root
              value={selectedSeason}
              onValueChange={(e) => setSelectedSeason(e.value as Season)}
              size="lg"
            >
              <SegmentGroup.Indicator />
              {(Object.keys(SEASON_CONFIG) as Season[]).map((season) => {
                const config = SEASON_CONFIG[season]
                const SeasonIcon = SEASON_ICONS[season]
                const hasChecklist = checklists.some((c) => c.season === season)
                return (
                  <SegmentGroup.Item key={season} value={season}>
                    <SegmentGroup.ItemText>
                      <HStack gap={2}>
                        <Icon as={SeasonIcon} />
                        <Text>
                          {config.emoji} {config.label}
                        </Text>
                        {hasChecklist && (
                          <Badge colorPalette="green" size="sm">
                            ✓
                          </Badge>
                        )}
                      </HStack>
                    </SegmentGroup.ItemText>
                    <SegmentGroup.ItemHiddenInput />
                  </SegmentGroup.Item>
                )
              })}
            </SegmentGroup.Root>
          </Card.Body>
        </Card.Root>

        {/* Контент сезона */}
        {!checklist ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <Text fontSize="4xl">{SEASON_CONFIG[selectedSeason].emoji}</Text>
              </EmptyState.Indicator>
              <EmptyState.Title>
                Чеклист на {SEASON_CONFIG[selectedSeason].label.toLowerCase()} не создан
              </EmptyState.Title>
              <EmptyState.Description>
                Создайте чеклист из готового шаблона, чтобы отслеживать готовность гардероба к сезону
              </EmptyState.Description>
            </EmptyState.Content>
            <Button colorPalette="fg" onClick={handleCreateChecklist}>
              <Icon as={FaPlus} mr={2} />
              Создать чеклист на {SEASON_CONFIG[selectedSeason].label.toLowerCase()}
            </Button>
          </EmptyState.Root>
        ) : (
          <VStack gap={6} align="stretch">
            {/* Прогресс */}
            <Card.Root>
              <Card.Body>
                <VStack gap={4} align="stretch">
                  <HStack justify="space-between">
                    <VStack align="start" gap={0}>
                      <Text fontWeight="medium">
                        {SEASON_CONFIG[selectedSeason].emoji} Готовность к{' '}
                        {SEASON_CONFIG[selectedSeason].label.toLowerCase()}у
                      </Text>
                      <Text fontSize="sm" color="fg.muted">
                        {SEASON_CONFIG[selectedSeason].months}
                      </Text>
                    </VStack>
                    <HStack gap={2}>
                      <Text
                        fontSize="2xl"
                        fontWeight="bold"
                        color={stats.progress >= 70 ? 'green.500' : stats.progress >= 40 ? 'orange.500' : 'red.500'}
                      >
                        {stats.progress}%
                      </Text>
                    </HStack>
                  </HStack>

                  <Progress.Root
                    value={stats.progress}
                    colorPalette={stats.progress >= 70 ? 'green' : stats.progress >= 40 ? 'orange' : 'red'}
                    size="lg"
                  >
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>

                  <HStack gap={6} flexWrap="wrap">
                    <HStack gap={2}>
                      <Badge colorPalette="green">{STATUS_CONFIG.have.emoji}</Badge>
                      <Text fontSize="sm">Есть: {stats.have}</Text>
                    </HStack>
                    <HStack gap={2}>
                      <Badge colorPalette="red">{STATUS_CONFIG.need.emoji}</Badge>
                      <Text fontSize="sm">Нужно: {stats.need}</Text>
                    </HStack>
                    <HStack gap={2}>
                      <Badge colorPalette="purple">{STATUS_CONFIG.want.emoji}</Badge>
                      <Text fontSize="sm">Хочу: {stats.want}</Text>
                    </HStack>
                    <Text fontSize="sm" color="fg.muted" ml="auto">
                      Всего: {stats.total}
                    </Text>
                  </HStack>
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* Действия */}
            <HStack gap={2} flexWrap="wrap">
              <Button variant="outline" size="sm" onClick={() => setIsAddingItem(true)}>
                <Icon as={FaPlus} mr={2} />
                Добавить элемент
              </Button>
              <Button variant="ghost" size="sm" onClick={handleResetChecklist}>
                <Icon as={FaRedo} mr={2} />
                Сбросить
              </Button>
              <Button variant="ghost" size="sm" colorPalette="red" onClick={handleDeleteChecklist}>
                <Icon as={FaTrash} mr={2} />
                Удалить чеклист
              </Button>
            </HStack>

            {/* Категории с элементами */}
            <VStack gap={4} align="stretch">
              {Object.entries(itemsByCategory).map(([category, items]) => (
                <Card.Root key={category}>
                  <Card.Header pb={2}>
                    <HStack justify="space-between">
                      <HStack gap={2}>
                        <Text fontSize="xl">{getCategoryEmoji(category)}</Text>
                        <Heading size="md">{category}</Heading>
                        <Badge colorPalette="gray">
                          {items.filter((i) => i.status === 'have').length}/{items.length}
                        </Badge>
                      </HStack>
                    </HStack>
                  </Card.Header>
                  <Card.Body pt={0}>
                    <VStack gap={2} align="stretch">
                      {items.map((item) => (
                        <ChecklistItemRow
                          key={item.id}
                          item={item}
                          onStatusChange={(status) => handleStatusChange(item.id, status)}
                          onEditNote={() => setEditingNote({ itemId: item.id, note: item.note || '' })}
                          onRemove={() => handleRemoveItem(item)}
                        />
                      ))}
                    </VStack>
                  </Card.Body>
                </Card.Root>
              ))}
            </VStack>
          </VStack>
        )}

        {/* Диалог добавления элемента */}
        <Dialog.Root open={isAddingItem} onOpenChange={(e) => setIsAddingItem(e.open)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content maxW="sm">
                <Dialog.Header>
                  <Dialog.Title>Добавить элемент</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <VStack gap={4}>
                    <Field.Root>
                      <Field.Label>Название</Field.Label>
                      <Input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Например: Кардиган вязаный"
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Категория</Field.Label>
                      <Input
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value)}
                        placeholder="Например: Верхняя одежда"
                        list="categories"
                      />
                      <datalist id="categories">
                        {SEASON_CHECKLISTS[selectedSeason].map((cat) => (
                          <option key={cat.name} value={cat.name} />
                        ))}
                      </datalist>
                    </Field.Root>
                  </VStack>
                </Dialog.Body>
                <Dialog.Footer>
                  <HStack gap={2}>
                    <Button variant="ghost" onClick={() => setIsAddingItem(false)}>
                      Отмена
                    </Button>
                    <Button colorPalette="fg" onClick={handleAddItem}>
                      Добавить
                    </Button>
                  </HStack>
                </Dialog.Footer>
                <Dialog.CloseTrigger />
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>

        {/* Диалог редактирования заметки */}
        <Dialog.Root open={!!editingNote} onOpenChange={(e) => !e.open && setEditingNote(null)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content maxW="md">
                <Dialog.Header>
                  <Dialog.Title>Заметка</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Field.Root>
                    <Field.Label>Комментарий</Field.Label>
                    <Textarea
                      value={editingNote?.note || ''}
                      onChange={(e) => editingNote && setEditingNote({ ...editingNote, note: e.target.value })}
                      placeholder="Например: Хочу бежевый, не синтетику..."
                      rows={4}
                    />
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
 * Строка элемента чеклиста
 */
function ChecklistItemRow({
  item,
  onStatusChange,
  onEditNote,
  onRemove,
}: {
  item: UserChecklistItem
  onStatusChange: (status: ChecklistItemStatus) => void
  onEditNote: () => void
  onRemove: () => void
}) {
  const _statusConfig = STATUS_CONFIG[item.status]

  return (
    <Box
      p={3}
      borderRadius="md"
      bg={item.status === 'have' ? 'green.subtle' : item.status === 'want' ? 'purple.subtle' : 'bg.muted'}
      borderWidth="1px"
      borderColor={item.status === 'have' ? 'green.muted' : item.status === 'want' ? 'purple.muted' : 'border.muted'}
    >
      <HStack justify="space-between" gap={4}>
        <VStack align="start" gap={1} flex={1}>
          <HStack gap={2}>
            <Text fontWeight="medium" textDecoration={item.status === 'have' ? 'line-through' : undefined}>
              {item.name}
            </Text>
            {item.productName && (
              <Badge colorPalette="blue" size="sm">
                <Icon as={FaLink} mr={1} />
                {item.productName}
              </Badge>
            )}
          </HStack>
          {item.note && (
            <Text fontSize="xs" color="fg.muted">
              💬 {item.note}
            </Text>
          )}
        </VStack>

        <HStack gap={1}>
          {/* Кнопки статуса */}
          {(Object.keys(STATUS_CONFIG) as ChecklistItemStatus[]).map((status) => {
            const config = STATUS_CONFIG[status]
            const isActive = item.status === status
            return (
              <IconButton
                key={status}
                aria-label={config.label}
                size="xs"
                variant={isActive ? 'solid' : 'ghost'}
                colorPalette={isActive ? config.color : 'gray'}
                onClick={() => onStatusChange(status)}
                title={config.label}
              >
                {config.emoji}
              </IconButton>
            )
          })}

          {/* Заметка */}
          <IconButton aria-label="Заметка" size="xs" variant="ghost" onClick={onEditNote}>
            <Icon as={item.note ? FaStickyNote : FaEdit} />
          </IconButton>

          {/* Удалить */}
          <IconButton aria-label="Удалить" size="xs" variant="ghost" colorPalette="red" onClick={onRemove}>
            <Icon as={FaTrash} />
          </IconButton>
        </HStack>
      </HStack>
    </Box>
  )
}
