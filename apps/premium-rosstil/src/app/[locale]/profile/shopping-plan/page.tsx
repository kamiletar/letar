'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { PlannedItem, ShoppingPriority } from '@/hooks/use-shopping-plan'
import { PRIORITY_CONFIG, useShoppingPlan } from '@/hooks/use-shopping-plan'
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
  Progress,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FaChartPie, FaEdit, FaShoppingCart, FaStickyNote, FaTrash, FaWallet } from 'react-icons/fa'

export default function ShoppingPlanPage() {
  const {
    items,
    budget,
    isLoading,
    setBudget,
    removeItem,
    updatePriority,
    updateNote,
    clearPlan,
    totalNow,
    totalNextMonth,
    totalSomeday,
    totalPlanned,
    isOverBudget,
    budgetRemaining,
    budgetUsedPercent,
    countNow,
    countNextMonth,
    countSomeday,
    totalItems,
  } = useShoppingPlan()

  const [isSettingBudget, setIsSettingBudget] = useState(false)
  const [newBudget, setNewBudget] = useState('')
  const [editingNote, setEditingNote] = useState<{ variantId: string; note: string } | null>(null)

  const handleSaveBudget = async () => {
    const value = parseInt(newBudget, 10)
    if (isNaN(value) || value < 0) {
      toaster.warning({ title: 'Введите корректную сумму' })
      return
    }
    await setBudget(value)
    toaster.success({ title: 'Бюджет обновлён' })
    setIsSettingBudget(false)
    setNewBudget('')
  }

  const handleRemoveItem = async (item: PlannedItem) => {
    if (!confirm(`Удалить "${item.productName}" из плана покупок?`)) {
      return
    }
    await removeItem(item.variantId)
    toaster.success({ title: 'Товар удалён из плана' })
  }

  const handlePriorityChange = async (variantId: string, priority: ShoppingPriority) => {
    await updatePriority(variantId, priority)
    toaster.success({ title: 'Приоритет изменён' })
  }

  const handleSaveNote = async () => {
    if (!editingNote) {
      return
    }
    await updateNote(editingNote.variantId, editingNote.note)
    toaster.success({ title: 'Заметка сохранена' })
    setEditingNote(null)
  }

  const handleClearPlan = async () => {
    if (!confirm('Очистить весь план покупок? Бюджет сохранится.')) {
      return
    }
    await clearPlan()
    toaster.success({ title: 'План очищен' })
  }

  if (isLoading) {
    return (
      <Container maxW="6xl" py={8}>
        <Text>Загрузка...</Text>
      </Container>
    )
  }

  // Группировка товаров по приоритету
  const itemsByPriority: Record<ShoppingPriority, PlannedItem[]> = {
    now: items.filter((i) => i.priority === 'now'),
    next_month: items.filter((i) => i.priority === 'next_month'),
    someday: items.filter((i) => i.priority === 'someday'),
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <VStack align="start" gap={1}>
            <Heading size="xl">
              <Icon as={FaChartPie} mr={3} />
              Планировщик покупок
            </Heading>
            <Text color="fg.muted">Планируйте покупки с учётом бюджета</Text>
          </VStack>
          {totalItems > 0 && (
            <Button variant="ghost" colorPalette="red" onClick={handleClearPlan}>
              <Icon as={FaTrash} mr={2} />
              Очистить план
            </Button>
          )}
        </HStack>

        {/* Виджет бюджета */}
        <Card.Root>
          <Card.Body>
            <VStack gap={4} align="stretch">
              <HStack justify="space-between">
                <HStack gap={2}>
                  <Icon as={FaWallet} color="fg.muted" />
                  <Text fontWeight="medium">Месячный бюджет</Text>
                </HStack>
                <HStack gap={2}>
                  {budget > 0 ? (
                    <Text fontSize="xl" fontWeight="bold">
                      {budget.toLocaleString('ru-RU')} ₽
                    </Text>
                  ) : (
                    <Text color="fg.muted">Не установлен</Text>
                  )}
                  <IconButton
                    aria-label="Изменить бюджет"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setNewBudget(budget > 0 ? budget.toString() : '')
                      setIsSettingBudget(true)
                    }}
                  >
                    <Icon as={FaEdit} />
                  </IconButton>
                </HStack>
              </HStack>

              {budget > 0 && (
                <>
                  <Progress.Root
                    value={budgetUsedPercent}
                    colorPalette={isOverBudget ? 'red' : budgetUsedPercent > 80 ? 'orange' : 'green'}
                    size="lg"
                  >
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>

                  <HStack justify="space-between" fontSize="sm">
                    <Text>
                      Планируется купить:{' '}
                      <Text as="span" fontWeight="bold" color={isOverBudget ? 'red.500' : undefined}>
                        {totalNow.toLocaleString('ru-RU')} ₽
                      </Text>
                    </Text>
                    <Text>
                      {isOverBudget ? (
                        <Text as="span" color="red.500" fontWeight="bold">
                          Превышение: {(totalNow - budget).toLocaleString('ru-RU')} ₽
                        </Text>
                      ) : (
                        <>
                          Остаток:{' '}
                          <Text as="span" color="green.500" fontWeight="bold">
                            {budgetRemaining.toLocaleString('ru-RU')} ₽
                          </Text>
                        </>
                      )}
                    </Text>
                  </HStack>
                </>
              )}

              {/* Сводка по приоритетам */}
              <HStack gap={4} flexWrap="wrap" pt={2} borderTopWidth="1px" borderColor="border.muted">
                <VStack gap={0} align="start">
                  <Text fontSize="xs" color="fg.muted">
                    🔥 Купить сейчас
                  </Text>
                  <Text fontWeight="bold">
                    {totalNow.toLocaleString('ru-RU')} ₽{' '}
                    <Text as="span" fontWeight="normal" color="fg.muted">
                      ({countNow})
                    </Text>
                  </Text>
                </VStack>
                <VStack gap={0} align="start">
                  <Text fontSize="xs" color="fg.muted">
                    📅 В след. месяце
                  </Text>
                  <Text fontWeight="bold">
                    {totalNextMonth.toLocaleString('ru-RU')} ₽{' '}
                    <Text as="span" fontWeight="normal" color="fg.muted">
                      ({countNextMonth})
                    </Text>
                  </Text>
                </VStack>
                <VStack gap={0} align="start">
                  <Text fontSize="xs" color="fg.muted">
                    💭 Когда-нибудь
                  </Text>
                  <Text fontWeight="bold">
                    {totalSomeday.toLocaleString('ru-RU')} ₽{' '}
                    <Text as="span" fontWeight="normal" color="fg.muted">
                      ({countSomeday})
                    </Text>
                  </Text>
                </VStack>
                <VStack gap={0} align="start" ml="auto">
                  <Text fontSize="xs" color="fg.muted">
                    Всего запланировано
                  </Text>
                  <Text fontWeight="bold" fontSize="lg">
                    {totalPlanned.toLocaleString('ru-RU')} ₽
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Товары по приоритетам */}
        {totalItems === 0 ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <Icon as={FaShoppingCart} />
              </EmptyState.Indicator>
              <EmptyState.Title>План покупок пуст</EmptyState.Title>
              <EmptyState.Description>Добавьте товары в план из каталога или страницы товара</EmptyState.Description>
            </EmptyState.Content>
            <Button asChild colorPalette="fg">
              <Link href="/catalog">Перейти в каталог</Link>
            </Button>
          </EmptyState.Root>
        ) : (
          <VStack gap={6} align="stretch">
            {/* Секция "Купить сейчас" */}
            {itemsByPriority.now.length > 0 && (
              <PrioritySection
                priority="now"
                items={itemsByPriority.now}
                onRemove={handleRemoveItem}
                onPriorityChange={handlePriorityChange}
                onEditNote={(item) => setEditingNote({ variantId: item.variantId, note: item.note || '' })}
              />
            )}

            {/* Секция "В следующем месяце" */}
            {itemsByPriority.next_month.length > 0 && (
              <PrioritySection
                priority="next_month"
                items={itemsByPriority.next_month}
                onRemove={handleRemoveItem}
                onPriorityChange={handlePriorityChange}
                onEditNote={(item) => setEditingNote({ variantId: item.variantId, note: item.note || '' })}
              />
            )}

            {/* Секция "Когда-нибудь" */}
            {itemsByPriority.someday.length > 0 && (
              <PrioritySection
                priority="someday"
                items={itemsByPriority.someday}
                onRemove={handleRemoveItem}
                onPriorityChange={handlePriorityChange}
                onEditNote={(item) => setEditingNote({ variantId: item.variantId, note: item.note || '' })}
              />
            )}
          </VStack>
        )}

        {/* Диалог установки бюджета */}
        <Dialog.Root open={isSettingBudget} onOpenChange={(e) => setIsSettingBudget(e.open)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content maxW="sm">
                <Dialog.Header>
                  <Dialog.Title>Месячный бюджет</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Field.Root>
                    <Field.Label>Сумма в рублях</Field.Label>
                    <Input
                      type="number"
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                      placeholder="50000"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveBudget()
                        }
                      }}
                    />
                    <Field.HelperText>Сколько вы готовы потратить в этом месяце на одежду</Field.HelperText>
                  </Field.Root>
                </Dialog.Body>
                <Dialog.Footer>
                  <HStack gap={2}>
                    <Button variant="ghost" onClick={() => setIsSettingBudget(false)}>
                      Отмена
                    </Button>
                    <Button colorPalette="fg" onClick={handleSaveBudget}>
                      Сохранить
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
                  <Dialog.Title>Заметка к товару</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Field.Root>
                    <Field.Label>Комментарий</Field.Label>
                    <Textarea
                      value={editingNote?.note || ''}
                      onChange={(e) => editingNote && setEditingNote({ ...editingNote, note: e.target.value })}
                      placeholder="Например: к чёрному платью, на день рождения..."
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
 * Секция товаров по приоритету
 */
function PrioritySection({
  priority,
  items,
  onRemove,
  onPriorityChange,
  onEditNote,
}: {
  priority: ShoppingPriority
  items: PlannedItem[]
  onRemove: (item: PlannedItem) => void
  onPriorityChange: (variantId: string, priority: ShoppingPriority) => void
  onEditNote: (item: PlannedItem) => void
}) {
  const config = PRIORITY_CONFIG[priority]
  const total = items.reduce((sum, i) => sum + i.price, 0)

  return (
    <VStack align="stretch" gap={3}>
      <HStack justify="space-between">
        <HStack gap={2}>
          <Text fontSize="xl">{config.emoji}</Text>
          <Heading size="md">{config.label}</Heading>
          <Badge colorPalette={config.color}>{items.length}</Badge>
        </HStack>
        <Text fontWeight="bold">{total.toLocaleString('ru-RU')} ₽</Text>
      </HStack>

      <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }} gap={4}>
        {items.map((item) => (
          <PlannedItemCard
            key={item.variantId}
            item={item}
            onRemove={() => onRemove(item)}
            onPriorityChange={(p) => onPriorityChange(item.variantId, p)}
            onEditNote={() => onEditNote(item)}
          />
        ))}
      </Grid>
    </VStack>
  )
}

/**
 * Карточка запланированного товара
 */
function PlannedItemCard({
  item,
  onRemove,
  onPriorityChange,
  onEditNote,
}: {
  item: PlannedItem
  onRemove: () => void
  onPriorityChange: (priority: ShoppingPriority) => void
  onEditNote: () => void
}) {
  return (
    <Card.Root overflow="hidden" _hover={{ shadow: 'md' }} transition="all 0.2s">
      {/* Изображение */}
      <Box position="relative">
        <Link href={`/catalog/${item.productId}`}>
          <Box h={48} bg="bg.subtle">
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={item.productName} w="full" h="full" objectFit="cover" />
            ) : (
              <Box w="full" h="full" display="flex" alignItems="center" justifyContent="center">
                <Icon as={FaShoppingCart} boxSize={12} color="fg.muted" />
              </Box>
            )}
          </Box>
        </Link>

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
        <VStack align="stretch" gap={2}>
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
            <Box bg="yellow.subtle" p={2} borderRadius="md">
              <Text fontSize="xs" color="yellow.700" lineClamp={2}>
                {item.note}
              </Text>
            </Box>
          )}

          {/* Переключатель приоритета */}
          <HStack gap={1} pt={2} borderTopWidth="1px" borderColor="border.muted">
            {(Object.keys(PRIORITY_CONFIG) as ShoppingPriority[]).map((p) => (
              <Button
                key={p}
                size="xs"
                variant={item.priority === p ? 'solid' : 'ghost'}
                colorPalette={item.priority === p ? PRIORITY_CONFIG[p].color : 'gray'}
                onClick={() => onPriorityChange(p)}
                flex={1}
              >
                {PRIORITY_CONFIG[p].emoji}
              </Button>
            ))}
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
