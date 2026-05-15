'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { OccasionInfo, OutfitCategory, SavedOccasionOutfit } from '@/hooks/use-occasion-outfit'
import { CATEGORY_CONFIG, useOccasionOutfit } from '@/hooks/use-occasion-outfit'
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Dialog,
  Field,
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Portal,
  Progress,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaEdit,
  FaExclamationTriangle,
  FaLightbulb,
  FaPlus,
  FaSave,
  FaTrash,
} from 'react-icons/fa'

type ViewMode = 'occasions' | 'occasion-detail' | 'outfit-builder' | 'saved-outfits'

export default function OccasionOutfitPage() {
  const {
    occasions,
    savedOutfits,
    isLoading,
    createOutfit,
    getOutfit,
    updateChecklistItem,
    updateOutfitNotes,
    deleteOutfit,
    getOutfitProgress,
  } = useOccasionOutfit()

  const [viewMode, setViewMode] = useState<ViewMode>('occasions')
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionInfo | null>(null)
  const [selectedOutfit, setSelectedOutfit] = useState<SavedOccasionOutfit | null>(null)
  const [isCreatingOutfit, setIsCreatingOutfit] = useState(false)
  const [newOutfitName, setNewOutfitName] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')

  const handleSelectOccasion = (occasion: OccasionInfo) => {
    setSelectedOccasion(occasion)
    setViewMode('occasion-detail')
  }

  const handleCreateOutfit = async () => {
    if (!selectedOccasion || !newOutfitName.trim()) {
      toaster.warning({ title: 'Введите название образа' })
      return
    }

    const result = await createOutfit(selectedOccasion.id, newOutfitName.trim())
    if (result.success && result.outfit) {
      setSelectedOutfit(result.outfit)
      setViewMode('outfit-builder')
      setIsCreatingOutfit(false)
      setNewOutfitName('')
      toaster.success({ title: 'Образ создан' })
    }
  }

  const handleOpenOutfit = (outfit: SavedOccasionOutfit) => {
    setSelectedOutfit(outfit)
    const occasion = occasions.find((o) => o.id === outfit.occasionId)
    setSelectedOccasion(occasion || null)
    setViewMode('outfit-builder')
  }

  const handleToggleItem = async (category: OutfitCategory, filled: boolean) => {
    if (!selectedOutfit) {
      return
    }
    await updateChecklistItem(selectedOutfit.id, category, { filled })
    // Обновляем локальное состояние
    const updated = getOutfit(selectedOutfit.id)
    if (updated) {
      setSelectedOutfit(updated)
    }
  }

  const handleSaveNotes = async () => {
    if (!selectedOutfit) {
      return
    }
    await updateOutfitNotes(selectedOutfit.id, notesValue)
    const updated = getOutfit(selectedOutfit.id)
    if (updated) {
      setSelectedOutfit(updated)
    }
    setEditingNotes(false)
    toaster.success({ title: 'Заметки сохранены' })
  }

  const handleDeleteOutfit = async (outfit: SavedOccasionOutfit) => {
    if (!confirm(`Удалить образ "${outfit.name}"?`)) {
      return
    }
    await deleteOutfit(outfit.id)
    if (selectedOutfit?.id === outfit.id) {
      setSelectedOutfit(null)
      setViewMode('occasions')
    }
    toaster.success({ title: 'Образ удалён' })
  }

  const handleBack = () => {
    if (viewMode === 'outfit-builder') {
      setViewMode('occasion-detail')
      setSelectedOutfit(null)
    } else if (viewMode === 'occasion-detail') {
      setViewMode('occasions')
      setSelectedOccasion(null)
    } else if (viewMode === 'saved-outfits') {
      setViewMode('occasions')
    }
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
          <VStack align="start" gap={1}>
            {viewMode !== 'occasions' && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <Icon as={FaArrowLeft} mr={2} />
                Назад
              </Button>
            )}
            <Heading size="xl">
              <Icon as={FaCalendarAlt} mr={3} />
              {viewMode === 'occasions' && 'Конструктор образа'}
              {viewMode === 'occasion-detail' && selectedOccasion?.name}
              {viewMode === 'outfit-builder' && selectedOutfit?.name}
              {viewMode === 'saved-outfits' && 'Сохранённые образы'}
            </Heading>
            <Text color="fg.muted">
              {viewMode === 'occasions' && 'Выберите событие и соберите идеальный образ'}
              {viewMode === 'occasion-detail' && selectedOccasion?.description}
              {viewMode === 'outfit-builder' && 'Отмечайте элементы по мере подбора'}
              {viewMode === 'saved-outfits' && 'Все ваши сохранённые образы'}
            </Text>
          </VStack>
          {viewMode === 'occasions' && savedOutfits.length > 0 && (
            <Button variant="outline" onClick={() => setViewMode('saved-outfits')}>
              <Icon as={FaSave} mr={2} />
              Мои образы ({savedOutfits.length})
            </Button>
          )}
        </HStack>

        {/* Контент */}
        {viewMode === 'occasions' && <OccasionsGrid occasions={occasions} onSelect={handleSelectOccasion} />}

        {viewMode === 'occasion-detail' && selectedOccasion && (
          <OccasionDetail
            occasion={selectedOccasion}
            savedOutfits={savedOutfits.filter((o) => o.occasionId === selectedOccasion.id)}
            onCreateNew={() => {
              setNewOutfitName(`${selectedOccasion.name} — ${new Date().toLocaleDateString('ru-RU')}`)
              setIsCreatingOutfit(true)
            }}
            onOpenOutfit={handleOpenOutfit}
            onDeleteOutfit={handleDeleteOutfit}
            getProgress={getOutfitProgress}
          />
        )}

        {viewMode === 'outfit-builder' && selectedOutfit && selectedOccasion && (
          <OutfitBuilder
            outfit={selectedOutfit}
            occasion={selectedOccasion}
            onToggleItem={handleToggleItem}
            onEditNotes={() => {
              setNotesValue(selectedOutfit.notes || '')
              setEditingNotes(true)
            }}
            onDelete={() => handleDeleteOutfit(selectedOutfit)}
            progress={getOutfitProgress(selectedOutfit)}
          />
        )}

        {viewMode === 'saved-outfits' && (
          <SavedOutfitsList
            outfits={savedOutfits}
            occasions={occasions}
            onOpenOutfit={handleOpenOutfit}
            onDeleteOutfit={handleDeleteOutfit}
            getProgress={getOutfitProgress}
          />
        )}

        {/* Диалог создания образа */}
        <Dialog.Root open={isCreatingOutfit} onOpenChange={(e) => setIsCreatingOutfit(e.open)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content maxW="sm">
                <Dialog.Header>
                  <Dialog.Title>Новый образ</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Field.Root>
                    <Field.Label>Название</Field.Label>
                    <Input
                      value={newOutfitName}
                      onChange={(e) => setNewOutfitName(e.target.value)}
                      placeholder="Например: Свадьба Маши 15 июня"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateOutfit()
                        }
                      }}
                    />
                    <Field.HelperText>Дайте образу понятное название</Field.HelperText>
                  </Field.Root>
                </Dialog.Body>
                <Dialog.Footer>
                  <HStack gap={2}>
                    <Button variant="ghost" onClick={() => setIsCreatingOutfit(false)}>
                      Отмена
                    </Button>
                    <Button colorPalette="fg" onClick={handleCreateOutfit}>
                      Создать
                    </Button>
                  </HStack>
                </Dialog.Footer>
                <Dialog.CloseTrigger />
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>

        {/* Диалог редактирования заметок */}
        <Dialog.Root open={editingNotes} onOpenChange={(e) => setEditingNotes(e.open)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content maxW="md">
                <Dialog.Header>
                  <Dialog.Title>Заметки к образу</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Field.Root>
                    <Field.Label>Ваши заметки</Field.Label>
                    <Textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Например: не забыть взять запасные колготки..."
                      rows={5}
                    />
                  </Field.Root>
                </Dialog.Body>
                <Dialog.Footer>
                  <HStack gap={2}>
                    <Button variant="ghost" onClick={() => setEditingNotes(false)}>
                      Отмена
                    </Button>
                    <Button colorPalette="fg" onClick={handleSaveNotes}>
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
 * Сетка событий
 */
function OccasionsGrid({
  occasions,
  onSelect,
}: {
  occasions: OccasionInfo[]
  onSelect: (occasion: OccasionInfo) => void
}) {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap={4}>
      {occasions.map((occasion) => (
        <Card.Root
          key={occasion.id}
          cursor="pointer"
          _hover={{ shadow: 'md', borderColor: 'fg.muted' }}
          transition="all 0.2s"
          onClick={() => onSelect(occasion)}
        >
          <Card.Body>
            <VStack gap={3} align="center" textAlign="center">
              <Text fontSize="4xl">{occasion.emoji}</Text>
              <Heading size="md">{occasion.name}</Heading>
              <Text fontSize="sm" color="fg.muted" lineClamp={2}>
                {occasion.description}
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      ))}
    </SimpleGrid>
  )
}

/**
 * Детали события
 */
function OccasionDetail({
  occasion,
  savedOutfits,
  onCreateNew,
  onOpenOutfit,
  onDeleteOutfit,
  getProgress,
}: {
  occasion: OccasionInfo
  savedOutfits: SavedOccasionOutfit[]
  onCreateNew: () => void
  onOpenOutfit: (outfit: SavedOccasionOutfit) => void
  onDeleteOutfit: (outfit: SavedOccasionOutfit) => void
  getProgress: (outfit: SavedOccasionOutfit) => { total: number; filled: number; percent: number }
}) {
  return (
    <VStack gap={6} align="stretch">
      {/* Советы */}
      <Card.Root>
        <Card.Header>
          <HStack gap={2}>
            <Icon as={FaLightbulb} color="yellow.500" />
            <Heading size="sm">Советы стилиста</Heading>
          </HStack>
        </Card.Header>
        <Card.Body pt={0}>
          <VStack align="stretch" gap={2}>
            {occasion.tips.map((tip) => (
              <HStack key={tip} align="start" gap={2}>
                <Text color="fg.muted">•</Text>
                <Text fontSize="sm">{tip}</Text>
              </HStack>
            ))}
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Рекомендации и что избегать */}
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
        <Card.Root borderColor="green.muted">
          <Card.Header>
            <HStack gap={2}>
              <Icon as={FaCheckCircle} color="green.500" />
              <Heading size="sm">Рекомендуется</Heading>
            </HStack>
          </Card.Header>
          <Card.Body pt={0}>
            <HStack gap={2} flexWrap="wrap">
              {occasion.recommended.map((item) => (
                <Badge key={item} colorPalette="green" variant="subtle">
                  {item}
                </Badge>
              ))}
            </HStack>
          </Card.Body>
        </Card.Root>

        <Card.Root borderColor="red.muted">
          <Card.Header>
            <HStack gap={2}>
              <Icon as={FaExclamationTriangle} color="red.500" />
              <Heading size="sm">Лучше избегать</Heading>
            </HStack>
          </Card.Header>
          <Card.Body pt={0}>
            <HStack gap={2} flexWrap="wrap">
              {occasion.avoid.map((item) => (
                <Badge key={item} colorPalette="red" variant="subtle">
                  {item}
                </Badge>
              ))}
            </HStack>
          </Card.Body>
        </Card.Root>
      </Grid>

      {/* Сохранённые образы и кнопка создания */}
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <Heading size="sm">Мои образы на это событие</Heading>
            <Button size="sm" colorPalette="fg" onClick={onCreateNew}>
              <Icon as={FaPlus} mr={2} />
              Создать образ
            </Button>
          </HStack>
        </Card.Header>
        <Card.Body pt={0}>
          {savedOutfits.length === 0 ? (
            <Text color="fg.muted" textAlign="center" py={4}>
              У вас пока нет сохранённых образов на это событие
            </Text>
          ) : (
            <VStack gap={2} align="stretch">
              {savedOutfits.map((outfit) => {
                const progress = getProgress(outfit)
                return (
                  <HStack
                    key={outfit.id}
                    p={3}
                    bg="bg.muted"
                    borderRadius="md"
                    justify="space-between"
                    cursor="pointer"
                    _hover={{ bg: 'bg.subtle' }}
                    onClick={() => onOpenOutfit(outfit)}
                  >
                    <VStack align="start" gap={1}>
                      <Text fontWeight="medium">{outfit.name}</Text>
                      <HStack gap={2}>
                        <Progress.Root value={progress.percent} size="sm" w="100px" colorPalette="green">
                          <Progress.Track>
                            <Progress.Range />
                          </Progress.Track>
                        </Progress.Root>
                        <Text fontSize="xs" color="fg.muted">
                          {progress.filled}/{progress.total}
                        </Text>
                      </HStack>
                    </VStack>
                    <IconButton
                      aria-label="Удалить"
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteOutfit(outfit)
                      }}
                    >
                      <Icon as={FaTrash} />
                    </IconButton>
                  </HStack>
                )
              })}
            </VStack>
          )}
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

/**
 * Конструктор образа
 */
function OutfitBuilder({
  outfit,
  occasion,
  onToggleItem,
  onEditNotes,
  onDelete,
  progress,
}: {
  outfit: SavedOccasionOutfit
  occasion: OccasionInfo
  onToggleItem: (category: OutfitCategory, filled: boolean) => void
  onEditNotes: () => void
  onDelete: () => void
  progress: { total: number; filled: number; percent: number }
}) {
  return (
    <VStack gap={6} align="stretch">
      {/* Прогресс */}
      <Card.Root>
        <Card.Body>
          <VStack gap={3} align="stretch">
            <HStack justify="space-between">
              <Text fontWeight="medium">Прогресс сборки образа</Text>
              <Text fontWeight="bold" color={progress.percent === 100 ? 'green.500' : undefined}>
                {progress.percent}%
              </Text>
            </HStack>
            <Progress.Root value={progress.percent} colorPalette={progress.percent === 100 ? 'green' : 'fg'} size="lg">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            {progress.percent === 100 && (
              <HStack gap={2} color="green.500">
                <Icon as={FaCheck} />
                <Text fontWeight="medium">Образ собран!</Text>
              </HStack>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Чеклист */}
      <Card.Root>
        <Card.Header>
          <Heading size="sm">Чеклист образа</Heading>
        </Card.Header>
        <Card.Body pt={0}>
          <VStack gap={3} align="stretch">
            {outfit.checklist.map((item) => {
              const categoryConfig = CATEGORY_CONFIG[item.category]
              const occasionChecklist = occasion.checklist.find((c) => c.category === item.category)
              return (
                <Box
                  key={item.category}
                  p={3}
                  bg={item.filled ? 'green.subtle' : 'bg.muted'}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={item.filled ? 'green.muted' : 'border.muted'}
                >
                  <HStack justify="space-between">
                    <HStack gap={3}>
                      <Checkbox.Root
                        checked={item.filled}
                        onCheckedChange={(e) => onToggleItem(item.category, !!e.checked)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control>
                          <Checkbox.Indicator>
                            <FaCheck />
                          </Checkbox.Indicator>
                        </Checkbox.Control>
                      </Checkbox.Root>
                      <VStack align="start" gap={0}>
                        <HStack gap={2}>
                          <Text>{categoryConfig.emoji}</Text>
                          <Text fontWeight="medium" textDecoration={item.filled ? 'line-through' : undefined}>
                            {categoryConfig.label}
                          </Text>
                          {occasionChecklist?.required && (
                            <Badge colorPalette="red" size="sm">
                              Обязательно
                            </Badge>
                          )}
                        </HStack>
                        {occasionChecklist && (
                          <Text fontSize="xs" color="fg.muted">
                            Например: {occasionChecklist.suggestions.join(', ')}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                    {item.productName && <Badge colorPalette="blue">{item.productName}</Badge>}
                  </HStack>
                </Box>
              )
            })}
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Заметки */}
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <Heading size="sm">Заметки</Heading>
            <IconButton aria-label="Редактировать заметки" size="sm" variant="ghost" onClick={onEditNotes}>
              <Icon as={FaEdit} />
            </IconButton>
          </HStack>
        </Card.Header>
        <Card.Body pt={0}>
          {outfit.notes ? (
            <Text>{outfit.notes}</Text>
          ) : (
            <Text color="fg.muted">Нет заметок. Нажмите на карандаш, чтобы добавить.</Text>
          )}
        </Card.Body>
      </Card.Root>

      {/* Действия */}
      <HStack justify="flex-end">
        <Button variant="ghost" colorPalette="red" onClick={onDelete}>
          <Icon as={FaTrash} mr={2} />
          Удалить образ
        </Button>
      </HStack>
    </VStack>
  )
}

/**
 * Список сохранённых образов
 */
function SavedOutfitsList({
  outfits,
  occasions,
  onOpenOutfit,
  onDeleteOutfit,
  getProgress,
}: {
  outfits: SavedOccasionOutfit[]
  occasions: OccasionInfo[]
  onOpenOutfit: (outfit: SavedOccasionOutfit) => void
  onDeleteOutfit: (outfit: SavedOccasionOutfit) => void
  getProgress: (outfit: SavedOccasionOutfit) => { total: number; filled: number; percent: number }
}) {
  if (outfits.length === 0) {
    return (
      <Card.Root>
        <Card.Body py={12} textAlign="center">
          <VStack gap={4}>
            <Icon as={FaSave} boxSize={12} color="fg.muted" />
            <Text color="fg.muted">У вас пока нет сохранённых образов</Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <VStack gap={3} align="stretch">
      {outfits.map((outfit) => {
        const occasion = occasions.find((o) => o.id === outfit.occasionId)
        const progress = getProgress(outfit)
        return (
          <Card.Root
            key={outfit.id}
            cursor="pointer"
            _hover={{ shadow: 'md' }}
            transition="all 0.2s"
            onClick={() => onOpenOutfit(outfit)}
          >
            <Card.Body>
              <HStack justify="space-between">
                <HStack gap={4}>
                  <Text fontSize="2xl">{occasion?.emoji}</Text>
                  <VStack align="start" gap={1}>
                    <Text fontWeight="medium">{outfit.name}</Text>
                    <Text fontSize="sm" color="fg.muted">
                      {occasion?.name}
                    </Text>
                  </VStack>
                </HStack>
                <HStack gap={4}>
                  <VStack align="end" gap={1}>
                    <HStack gap={2}>
                      <Progress.Root value={progress.percent} size="sm" w="80px" colorPalette="green">
                        <Progress.Track>
                          <Progress.Range />
                        </Progress.Track>
                      </Progress.Root>
                      <Text fontSize="sm" fontWeight="medium">
                        {progress.percent}%
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="fg.muted">
                      {progress.filled} из {progress.total}
                    </Text>
                  </VStack>
                  <IconButton
                    aria-label="Удалить"
                    size="sm"
                    variant="ghost"
                    colorPalette="red"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteOutfit(outfit)
                    }}
                  >
                    <Icon as={FaTrash} />
                  </IconButton>
                </HStack>
              </HStack>
            </Card.Body>
          </Card.Root>
        )
      })}
    </VStack>
  )
}
