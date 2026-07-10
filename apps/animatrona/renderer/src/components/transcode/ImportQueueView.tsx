'use client'

/**
 * Полный вид очереди импорта (Event-driven версия)
 *
 * Отображает:
 * - Список элементов очереди импорта
 * - Общий прогресс
 * - Кнопки управления (старт, пауза, очистка)
 * - Drag & drop для изменения порядка pending элементов
 *
 * Использует useImportQueue hook который подписан на события от main process.
 */

import {
  Box,
  Button,
  Card,
  EmptyState,
  HStack,
  Icon,
  Input,
  Progress,
  Separator,
  Spinner,
  Text,
  VisuallyHidden,
  VStack,
} from '@chakra-ui/react'
import { NativeSelectField, NativeSelectRoot } from '@chakra-ui/react/native-select'
import type { DragEndEvent } from '@dnd-kit/core'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuCheck, LuClock, LuList, LuPause, LuPlay, LuPlus, LuRows3, LuSearch, LuTrash2 } from 'react-icons/lu'

import { useImportQueue } from '@/hooks/useImportQueue'
import { useTranscodeHotkeys } from '@/hooks/useTranscodeHotkeys'
import { CompactQueueItem } from './CompactQueueItem'
import { ConcurrencyControls } from './ConcurrencyControls'
import { ImportQueueItem } from './ImportQueueItem'
import { ImportQueueItemExpanded } from './ImportQueueItemExpanded'
import { SortableQueueItem } from './SortableQueueItem'

interface ImportQueueViewProps {
  /** Callback для открытия wizard'а импорта */
  onAddImport?: () => void
}

export function ImportQueueView({ onAddImport }: ImportQueueViewProps) {
  // Hook — подписка на события от main process
  const {
    items,
    currentItem,
    isPaused,
    isLoading,
    start,
    pause,
    resume,
    cancelItem,
    removeItem,
    retryItem,
    markItemFailed,
    retryMissing,
    clearCompleted,
    reorderItems,
    updateItem,
  } = useImportQueue()

  // Keyboard shortcuts
  useTranscodeHotkeys({
    onTogglePause: useCallback(() => {
      if (isPaused) {
        resume()
      } else if (currentItem) {
        pause()
      }
    }, [isPaused, currentItem, pause, resume]),
    onClearCompleted: clearCompleted,
    onStart: start,
    disabled: isLoading,
  })

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'error'>('all')

  // View mode (compact vs expanded)
  const [isCompactView, setIsCompactView] = useState(false)

  // Keyboard navigation
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)

  // Live region для screen readers
  const [liveAnnouncement, setLiveAnnouncement] = useState('')
  const prevStatusesRef = useRef<Map<string, string>>(new Map())

  // Загрузка настройки из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('animatrona:queue-compact-view')
    if (saved !== null) {
      setIsCompactView(saved === 'true')
    }
  }, [])

  // Сохранение настройки в localStorage
  const toggleCompactView = useCallback(() => {
    setIsCompactView((prev) => {
      const newValue = !prev
      localStorage.setItem('animatrona:queue-compact-view', String(newValue))
      return newValue
    })
  }, [])

  // Фильтрация items по поиску и статусу
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Фильтр по статусу
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && item.status !== 'pending') {
          return false
        }
        if (
          statusFilter === 'processing' &&
          !['vmaf', 'preparing', 'transcoding', 'postprocess'].includes(item.status)
        ) {
          return false
        }
        if (statusFilter === 'completed' && item.status !== 'completed') {
          return false
        }
        if (statusFilter === 'error' && item.status !== 'error' && item.status !== 'cancelled') {
          return false
        }
      }

      // Фильтр по поиску
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const animeName = (item.selectedAnime.russian || item.selectedAnime.name).toLowerCase()
        if (!animeName.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [items, searchQuery, statusFilter])

  // Drag & drop сенсоры
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Обработчик drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        reorderItems(active.id as string, over.id as string)
      }
    },
    [reorderItems]
  )

  // Вычисляемые значения через useMemo (используем filteredItems для поиска/фильтра)
  const pendingItems = useMemo(
    () => filteredItems.filter((i) => i.status === 'pending').sort((a, b) => a.priority - b.priority),
    [filteredItems]
  )

  const completedItems = useMemo(
    () => filteredItems.filter((i) => ['completed', 'error', 'cancelled'].includes(i.status)),
    [filteredItems]
  )

  // Все элементы для навигации (pending + completed, без текущего)
  const allNavigableItems = useMemo(() => [...pendingItems, ...completedItems], [pendingItems, completedItems])

  // Keyboard navigation в очереди
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Игнорируем если фокус в input/textarea
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Игнорируем если список пуст или модификаторы нажаты
      if (allNavigableItems.length === 0 || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const currentIndex = focusedItemId ? allNavigableItems.findIndex((i) => i.id === focusedItemId) : -1

      switch (event.key) {
        case 'ArrowDown':
        case 'j': {
          event.preventDefault()
          const nextIndex = currentIndex < allNavigableItems.length - 1 ? currentIndex + 1 : 0
          setFocusedItemId(allNavigableItems[nextIndex].id)
          break
        }
        case 'ArrowUp':
        case 'k': {
          event.preventDefault()
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : allNavigableItems.length - 1
          setFocusedItemId(allNavigableItems[prevIndex].id)
          break
        }
        case 'Delete':
        case 'Backspace': {
          if (focusedItemId) {
            const item = allNavigableItems.find((i) => i.id === focusedItemId)
            if (
              item &&
              (item.status === 'pending' ||
                item.status === 'completed' ||
                item.status === 'error' ||
                item.status === 'cancelled')
            ) {
              event.preventDefault()
              removeItem(focusedItemId)
              // Перемещаем фокус на следующий элемент
              if (currentIndex < allNavigableItems.length - 1) {
                setFocusedItemId(allNavigableItems[currentIndex + 1].id)
              } else if (currentIndex > 0) {
                setFocusedItemId(allNavigableItems[currentIndex - 1].id)
              } else {
                setFocusedItemId(null)
              }
            }
          }
          break
        }
        case 'Escape': {
          setFocusedItemId(null)
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [allNavigableItems, focusedItemId, removeItem])

  // Live region: отслеживание изменений статусов для анонсов
  useEffect(() => {
    const announcements: string[] = []
    const currentStatuses = new Map<string, string>()

    for (const item of items) {
      currentStatuses.set(item.id, item.status)
      const prevStatus = prevStatusesRef.current.get(item.id)
      const animeName = item.selectedAnime.russian || item.selectedAnime.name

      // Новый элемент добавлен
      if (!prevStatus && item.status === 'pending') {
        announcements.push(`${animeName} добавлен в очередь`)
      } // Статус изменился
      else if (prevStatus && prevStatus !== item.status) {
        switch (item.status) {
          case 'vmaf':
            announcements.push(`${animeName}: начат подбор VMAF`)
            break
          case 'transcoding':
            announcements.push(`${animeName}: начато кодирование`)
            break
          case 'completed':
            announcements.push(`${animeName}: успешно завершён`)
            break
          case 'error':
            announcements.push(`${animeName}: ошибка обработки`)
            break
          case 'cancelled':
            announcements.push(`${animeName}: отменён`)
            break
        }
      }
    }

    // Обновляем ref для следующего сравнения
    prevStatusesRef.current = currentStatuses

    // Если есть анонсы — объявляем (с небольшой задержкой для корректной работы screen readers)
    if (announcements.length > 0) {
      setLiveAnnouncement(announcements.join('. '))
      // Очищаем после анонса
      const timeout = setTimeout(() => setLiveAnnouncement(''), 1000)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [items])

  // Расчёт Total ETA (v0.19.0: учитываем активные воркеры)
  const totalEta = useMemo(() => {
    // Вспомогательная функция для расчёта ETA воркера
    const calculateWorkerEta = (elapsedMs: number | undefined, progress: number): number => {
      if (!elapsedMs || elapsedMs <= 0 || progress <= 0 || progress >= 100) {
        return 0
      }
      return Math.round((elapsedMs * (100 - progress)) / progress)
    }

    // 1. ETA активных видео воркеров (реальное оставшееся время)
    let activeWorkersEta = 0
    const videoWorkers = currentItem?.detailProgress?.videoWorkers ?? []
    for (const worker of videoWorkers) {
      if (worker.elapsedMs && worker.progress > 0 && worker.progress < 100) {
        activeWorkersEta = Math.max(activeWorkersEta, calculateWorkerEta(worker.elapsedMs, worker.progress))
      }
    }

    // 2. Количество видео в очереди транскода (ещё не обрабатываются)
    const videoTotal = currentItem?.detailProgress?.videoTotal ?? 0
    const videoCompleted = currentItem?.detailProgress?.videoCompleted ?? 0
    const activeWorkerCount = videoWorkers.length
    const queuedVideos = Math.max(0, videoTotal - videoCompleted - activeWorkerCount)

    // 3. Среднее время на видео из истории
    const completedWithTime = items.filter((i) => i.status === 'completed' && i.startedAt && i.completedAt)

    let avgTimePerVideo: number
    if (completedWithTime.length > 0) {
      const totalTime = completedWithTime.reduce((sum, item) => {
        const start = new Date(item.startedAt as string).getTime()
        const end = new Date(item.completedAt as string).getTime()
        const episodesCount = item.files.filter((f) => f.selected).length
        return sum + (end - start) / episodesCount
      }, 0)
      avgTimePerVideo = totalTime / completedWithTime.length
    } else {
      // Дефолт — 3 минуты на видео
      avgTimePerVideo = 3 * 60 * 1000
    }

    // 4. ETA для оставшихся видео в очереди (с учётом параллельных воркеров)
    const maxConcurrentWorkers = Math.max(1, activeWorkerCount)
    const queuedVideosEta = (queuedVideos / maxConcurrentWorkers) * avgTimePerVideo

    // 5. ETA для pending элементов (ещё не начались)
    const pendingItems = items.filter((i) => i.status === 'pending' || i.status === 'vmaf' || i.status === 'preparing')
    const pendingEpisodes = pendingItems.reduce((sum, i) => sum + i.files.filter((f) => f.selected).length, 0)
    const pendingEta = (pendingEpisodes / maxConcurrentWorkers) * avgTimePerVideo

    // Итого: активные воркеры + очередь + pending
    return activeWorkersEta + queuedVideosEta + pendingEta
  }, [items, currentItem])

  // Форматирование ETA
  const formatEta = (ms: number): string => {
    if (ms <= 0) {
      return ''
    }
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) {
      return `~${hours}ч ${minutes}м`
    }
    return `~${minutes}м`
  }

  // Рассчитываем общий прогресс (включая прогресс текущего элемента)
  const totalItems = items.length
  const completedCount = completedItems.length
  const currentProgress = currentItem?.progress ?? 0
  const overallProgress = totalItems > 0 ? ((completedCount * 100 + currentProgress) / (totalItems * 100)) * 100 : 0

  // Можем ли начать обработку
  const canStart = pendingItems.length > 0 && !currentItem && !isPaused

  // Обработка (кодирование идёт)
  const isProcessing = currentItem !== null

  // Loading state при инициализации
  if (isLoading) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <VStack py={8} gap={4}>
            <Spinner size="lg" colorPalette="purple" />
            <Text color="fg.muted">Загрузка очереди...</Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  // Пустая очередь
  if (items.length === 0) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <Icon as={LuPlus} boxSize={10} color="fg.subtle" />
              </EmptyState.Indicator>
              <EmptyState.Title>Очередь импорта пуста</EmptyState.Title>
              <EmptyState.Description>Добавьте сериалы через импорт в библиотеке</EmptyState.Description>
            </EmptyState.Content>
          </EmptyState.Root>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <VStack gap={4} align="stretch">
      {/* Live region для screen readers — объявляет изменения статусов */}
      <VisuallyHidden>
        <div role="status" aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </div>
      </VisuallyHidden>

      {/* Шапка с прогрессом и управлением */}
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <HStack justify="space-between" mb={4}>
            <VStack align="start" gap={0}>
              <Text fontWeight="medium">Очередь импорта</Text>
              <Text fontSize="sm" color="fg.muted">
                {completedCount} / {totalItems} завершено
                {pendingItems.length > 0 && ` • ${pendingItems.length} ожидает`}
                {totalEta > 0 && ` • ETA: ${formatEta(totalEta)}`}
              </Text>
            </VStack>

            <HStack gap={2}>
              {/* Добавить */}
              {onAddImport && (
                <Button size="sm" variant="ghost" onClick={onAddImport} aria-label="Добавить импорт">
                  <LuPlus />
                  Добавить
                </Button>
              )}

              {/* Очистить завершённые */}
              {completedItems.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => clearCompleted()} aria-label="Очистить завершённые">
                  <LuTrash2 />
                  Очистить
                </Button>
              )}

              {/* Пауза */}
              {isProcessing && !isPaused && (
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="yellow"
                  onClick={pause}
                  aria-label="Приостановить обработку"
                >
                  <LuPause />
                  Пауза
                </Button>
              )}

              {/* Возобновить */}
              {isPaused && (
                <Button size="sm" colorPalette="green" onClick={resume} aria-label="Продолжить обработку">
                  <LuPlay />
                  Продолжить
                </Button>
              )}

              {/* Начать обработку */}
              {canStart && (
                <Button size="sm" colorPalette="purple" onClick={start} aria-label="Начать обработку очереди">
                  <LuPlay />
                  Начать
                </Button>
              )}
            </HStack>
          </HStack>

          {/* Прогресс-бар */}
          <Progress.Root value={overallProgress} size="lg">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Card.Body>
      </Card.Root>

      {/* Управление потоками */}
      <ConcurrencyControls />

      {/* Текущий элемент (расширенная карточка) */}
      {currentItem && (
        <ImportQueueItemExpanded
          item={currentItem}
          onCancel={() => cancelItem(currentItem.id)}
          onRetry={(id, opts) => retryItem(id, opts)}
        />
      )}

      {/* Поиск и фильтр (показываем только если элементов больше 3) */}
      {items.length > 3 && (
        <HStack gap={3}>
          <Box position="relative" flex={1}>
            <Icon
              as={LuSearch}
              position="absolute"
              left={3}
              top="50%"
              transform="translateY(-50%)"
              color="fg.muted"
              boxSize={4}
              zIndex={1}
            />
            <Input
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              pl={10}
              size="sm"
            />
          </Box>
          <NativeSelectRoot size="sm" w="180px">
            <NativeSelectField
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидают</option>
              <option value="processing">Обработка</option>
              <option value="completed">Завершены</option>
              <option value="error">Ошибки</option>
            </NativeSelectField>
          </NativeSelectRoot>
          {/* Переключатель вида */}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleCompactView}
            aria-label={isCompactView ? 'Развёрнутый вид' : 'Компактный вид'}
            title={isCompactView ? 'Развёрнутый вид' : 'Компактный вид'}
          >
            <Icon as={isCompactView ? LuRows3 : LuList} boxSize={4} />
          </Button>
        </HStack>
      )}

      {/* Pending элементы с drag & drop */}
      {pendingItems.length > 0 && (
        <Box>
          <HStack mb={2} color="fg.muted" fontSize="sm" pl={isCompactView ? 0 : 8}>
            <Icon as={LuClock} boxSize={4} />
            <Text fontWeight="medium">Ожидают ({pendingItems.length})</Text>
          </HStack>
          {isCompactView ? (
            // Компактный вид — без drag & drop
            <VStack gap={1} align="stretch" role="list" aria-label="Очередь импорта">
              {pendingItems.map((item) => (
                <CompactQueueItem
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  isFocused={focusedItemId === item.id}
                  onFocus={() => setFocusedItemId(item.id)}
                />
              ))}
            </VStack>
          ) : (
            // Развёрнутый вид — с drag & drop
            <VStack gap={2} align="stretch" pl={8} role="list" aria-label="Очередь импорта">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={pendingItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {pendingItems.map((item) => (
                    <SortableQueueItem
                      key={item.id}
                      item={item}
                      onRemove={() => removeItem(item.id)}
                      onUpdate={updateItem}
                      isFocused={focusedItemId === item.id}
                      onFocus={() => setFocusedItemId(item.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </VStack>
          )}
        </Box>
      )}

      {/* Разделитель между секциями */}
      {pendingItems.length > 0 && completedItems.length > 0 && <Separator my={2} />}

      {/* Завершённые элементы */}
      {completedItems.length > 0 && (
        <Box>
          <HStack mb={2} justify="space-between">
            <HStack color="fg.muted" fontSize="sm">
              <Icon as={LuCheck} boxSize={4} />
              <Text fontWeight="medium">Завершено ({completedItems.length})</Text>
            </HStack>
            <HStack gap={1}>
              {completedItems.some((i) => i.status === 'completed') && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  onClick={() => {
                    const successCount = completedItems.filter((i) => i.status === 'completed').length
                    if (window.confirm(`Удалить ${successCount} успешно завершённых из очереди?`)) {
                      clearCompleted({ onlySuccess: true })
                    }
                  }}
                >
                  <LuTrash2 />
                  Удалить успешные ({completedItems.filter((i) => i.status === 'completed').length})
                </Button>
              )}
              <Button
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={() => {
                  if (window.confirm(`Удалить все ${completedItems.length} завершённых (включая ошибки)?`)) {
                    clearCompleted()
                  }
                }}
              >
                <LuTrash2 />
                Удалить все
              </Button>
            </HStack>
          </HStack>
          {isCompactView ? (
            // Компактный вид
            <VStack gap={1} align="stretch" opacity={0.85} role="list" aria-label="Завершённые импорты">
              {completedItems.map((item) => (
                <CompactQueueItem
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  onRetry={(id, opts) => retryItem(id, opts)}
                  isFocused={focusedItemId === item.id}
                  onFocus={() => setFocusedItemId(item.id)}
                />
              ))}
            </VStack>
          ) : (
            // Развёрнутый вид
            <VStack gap={2} align="stretch" opacity={0.85} role="list" aria-label="Завершённые импорты">
              {completedItems.map((item) => (
                <ImportQueueItem
                  key={item.id}
                  item={item}
                  isFocused={focusedItemId === item.id}
                  onFocus={() => setFocusedItemId(item.id)}
                  isCurrent={false}
                  onRemove={() => removeItem(item.id)}
                  onRetry={(id, opts) => retryItem(id, opts)}
                  onMarkFailed={(id) => markItemFailed(id)}
                  onRetryMissing={(id, preEncodeOptions) => retryMissing(id, preEncodeOptions)}
                />
              ))}
            </VStack>
          )}
        </Box>
      )}
    </VStack>
  )
}
