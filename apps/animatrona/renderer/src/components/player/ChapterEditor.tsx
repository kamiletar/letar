'use client'

/**
 * ChapterEditor - Компонент редактирования глав эпизода
 *
 * Позволяет:
 * - Добавлять новые главы (OP, ED, recap, preview) с горячими клавишами
 * - Редактировать время начала/конца глав
 * - Удалять главы
 * - Переименовывать главы
 */

import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuCheck,
  LuCopy,
  LuMusic,
  LuPause,
  LuPencil,
  LuPlay,
  LuPlus,
  LuSkipBack,
  LuTrash2,
  LuWand,
  LuX,
} from 'react-icons/lu'

import { Tooltip } from '@/components/ui/tooltip'
import type { Chapter, PlayerChapterType } from './ChapterMarkers'

/** Краткая информация об эпизоде для копирования */
export interface EpisodeBrief {
  id: string
  number: number
  name?: string | null
}

/** Пропсы ChapterEditor */
export interface ChapterEditorProps {
  /** Текущие главы */
  chapters: Chapter[]
  /** Общая длительность видео в секундах */
  duration: number
  /** Текущее время воспроизведения */
  currentTime: number
  /** Обработчик изменения глав */
  onChaptersChange: (chapters: Chapter[]) => void
  /** Обработчик перехода к времени */
  onSeek?: (time: number) => void
  /** Редактор открыт */
  isOpen: boolean
  /** Обработчик закрытия */
  onClose: () => void
  /** ID текущего эпизода */
  currentEpisodeId?: string
  /** Все эпизоды аниме для копирования */
  allEpisodes?: EpisodeBrief[]
  /** Обработчик копирования глав на другие эпизоды */
  onCopyToEpisodes?: (targetEpisodeIds: string[]) => void
  /** Индикатор загрузки копирования */
  isCopying?: boolean
  /** Обработчик генерации RECAP/PREVIEW */
  onGenerateRecapPreview?: (episodeIds: string[]) => void
  /** Индикатор загрузки генерации */
  isGenerating?: boolean
}

/** Метаданные типов глав */
const CHAPTER_TYPE_META: Record<PlayerChapterType, { label: string; color: string; icon: typeof LuMusic }> = {
  OP: { label: 'Опенинг', color: 'purple', icon: LuMusic },
  ED: { label: 'Эндинг', color: 'blue', icon: LuMusic },
  RECAP: { label: 'Ретро', color: 'yellow', icon: LuSkipBack },
  PREVIEW: { label: 'Превью', color: 'orange', icon: LuPlay },
  CHAPTER: { label: 'Контент', color: 'gray', icon: LuPause },
}

/** Форматирует время в mm:ss.ms */
function formatTimeMs(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`
}

/** Парсит время из строки mm:ss или mm:ss.ms */
function parseTime(str: string): number | null {
  const match = str.match(/^(\d+):(\d+(?:\.\d+)?)$/)
  if (!match) {
    return null
  }
  const mins = parseInt(match[1], 10)
  const secs = parseFloat(match[2])
  return mins * 60 + secs
}

/**
 * Редактор одной главы
 */
function ChapterRow({
  chapter,
  onUpdate,
  onDelete,
  onSeek,
  currentTime,
}: {
  chapter: Chapter
  onUpdate: (chapter: Chapter) => void
  onDelete: () => void
  onSeek?: (time: number) => void
  currentTime: number
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editStartTime, setEditStartTime] = useState(formatTimeMs(chapter.startTime))
  const [editEndTime, setEditEndTime] = useState(formatTimeMs(chapter.endTime))
  const [editTitle, setEditTitle] = useState(chapter.title)

  const meta = CHAPTER_TYPE_META[chapter.type || 'CHAPTER']
  const isActive = currentTime >= chapter.startTime && currentTime < chapter.endTime

  /** Сохранить изменения */
  const handleSave = () => {
    const startTime = parseTime(editStartTime)
    const endTime = parseTime(editEndTime)
    if (startTime !== null && endTime !== null && endTime > startTime) {
      onUpdate({
        ...chapter,
        title: editTitle || chapter.title,
        startTime,
        endTime,
      })
      setIsEditing(false)
    }
  }

  /** Отменить редактирование */
  const handleCancel = () => {
    setEditStartTime(formatTimeMs(chapter.startTime))
    setEditEndTime(formatTimeMs(chapter.endTime))
    setEditTitle(chapter.title)
    setIsEditing(false)
  }

  /** Установить начало на текущее время */
  const handleSetStartFromCurrent = () => {
    setEditStartTime(formatTimeMs(currentTime))
  }

  /** Установить конец на текущее время */
  const handleSetEndFromCurrent = () => {
    setEditEndTime(formatTimeMs(currentTime))
  }

  return (
    <Card.Root
      bg={isActive ? 'bg.subtle' : 'bg.subtle'}
      border="1px"
      borderColor={isActive ? 'purple.500' : 'border.subtle'}
      size="sm"
    >
      <Card.Body py={2} px={3}>
        {isEditing
          ? (
            <VStack gap={2} align="stretch">
              <HStack gap={2}>
                <Badge colorPalette={meta.color} size="sm">
                  {meta.label}
                </Badge>
                <Input
                  size="xs"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Название"
                  flex={1}
                />
              </HStack>
              <HStack gap={2}>
                <Box flex={1}>
                  <Text fontSize="xs" color="fg.subtle">
                    Начало
                  </Text>
                  <HStack gap={1}>
                    <Input
                      size="xs"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      w="70px"
                      fontFamily="mono"
                    />
                    <Tooltip content="Установить текущее время">
                      <IconButton
                        aria-label="Установить начало"
                        size="xs"
                        variant="ghost"
                        onClick={handleSetStartFromCurrent}
                      >
                        <Icon as={LuPlay} />
                      </IconButton>
                    </Tooltip>
                  </HStack>
                </Box>
                <Box flex={1}>
                  <Text fontSize="xs" color="fg.subtle">
                    Конец
                  </Text>
                  <HStack gap={1}>
                    <Input
                      size="xs"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      w="70px"
                      fontFamily="mono"
                    />
                    <Tooltip content="Установить текущее время">
                      <IconButton
                        aria-label="Установить конец"
                        size="xs"
                        variant="ghost"
                        onClick={handleSetEndFromCurrent}
                      >
                        <Icon as={LuPause} />
                      </IconButton>
                    </Tooltip>
                  </HStack>
                </Box>
              </HStack>
              <HStack gap={2} justify="flex-end">
                <Button size="xs" variant="ghost" onClick={handleCancel}>
                  <Icon as={LuX} mr={1} />
                  Отмена
                </Button>
                <Button size="xs" colorPalette="green" onClick={handleSave}>
                  <Icon as={LuCheck} mr={1} />
                  Сохранить
                </Button>
              </HStack>
            </VStack>
          )
          : (
            <HStack gap={2}>
              <Badge colorPalette={meta.color} size="sm">
                {meta.label}
              </Badge>
              <Text
                flex={1}
                fontSize="sm"
                cursor="pointer"
                onClick={() => onSeek?.(chapter.startTime)}
                _hover={{ color: 'purple.300' }}
              >
                {chapter.title}
              </Text>
              <Text
                fontSize="xs"
                color="fg.subtle"
                fontFamily="mono"
                cursor="pointer"
                onClick={() => setIsEditing(true)}
                _hover={{ color: 'purple.300' }}
              >
                {formatTimeMs(chapter.startTime)} - {formatTimeMs(chapter.endTime)}
              </Text>
              <HStack gap={0}>
                <Tooltip content="Редактировать">
                  <IconButton aria-label="Редактировать" size="xs" variant="ghost" onClick={() => setIsEditing(true)}>
                    <Icon as={LuPencil} boxSize={3} />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Удалить">
                  <IconButton aria-label="Удалить" size="xs" variant="ghost" colorPalette="red" onClick={onDelete}>
                    <Icon as={LuTrash2} boxSize={3} />
                  </IconButton>
                </Tooltip>
              </HStack>
            </HStack>
          )}
      </Card.Body>
    </Card.Root>
  )
}

/**
 * ChapterEditor компонент
 */
export function ChapterEditor({
  chapters,
  duration,
  currentTime,
  onChaptersChange,
  onSeek,
  isOpen,
  onClose,
  currentEpisodeId,
  allEpisodes,
  onCopyToEpisodes,
  isCopying,
  onGenerateRecapPreview,
  isGenerating,
}: ChapterEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [markerStart, setMarkerStart] = useState<number | null>(null)
  const [isCopyMode, setIsCopyMode] = useState(false)
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set())

  // Проверяем есть ли OP/ED для копирования
  const hasOpEd = chapters.some((c) => c.type === 'OP' || c.type === 'ED')
  const canCopy = hasOpEd && allEpisodes && allEpisodes.length > 1

  // Эпизоды для копирования (все кроме текущего)
  const otherEpisodes = allEpisodes?.filter((ep) => ep.id !== currentEpisodeId) ?? []

  /** Переключить выбор эпизода */
  const toggleEpisode = useCallback((episodeId: string) => {
    setSelectedEpisodes((prev) => {
      const next = new Set(prev)
      if (next.has(episodeId)) {
        next.delete(episodeId)
      } else {
        next.add(episodeId)
      }
      return next
    })
  }, [])

  /** Выбрать все эпизоды */
  const selectAll = useCallback(() => {
    setSelectedEpisodes(new Set(otherEpisodes.map((ep) => ep.id)))
  }, [otherEpisodes])

  /** Снять выбор со всех */
  const deselectAll = useCallback(() => {
    setSelectedEpisodes(new Set())
  }, [])

  /** Выполнить копирование */
  const handleCopy = useCallback(() => {
    if (selectedEpisodes.size > 0 && onCopyToEpisodes) {
      onCopyToEpisodes(Array.from(selectedEpisodes))
      setIsCopyMode(false)
      setSelectedEpisodes(new Set())
    }
  }, [selectedEpisodes, onCopyToEpisodes])

  /** Генерировать RECAP/PREVIEW для всех эпизодов */
  const handleGenerate = useCallback(() => {
    if (!onGenerateRecapPreview) {
      return
    }
    // Все эпизоды: текущий + все остальные
    const allIds = allEpisodes?.map((ep) => ep.id) ?? []
    if (currentEpisodeId && !allIds.includes(currentEpisodeId)) {
      allIds.unshift(currentEpisodeId)
    }
    if (allIds.length > 0) {
      onGenerateRecapPreview(allIds)
    }
  }, [currentEpisodeId, allEpisodes, onGenerateRecapPreview])

  /** Генерирует уникальный ID */
  const generateId = useCallback(() => `chapter_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, [])

  /** Добавить новую главу */
  const addChapter = useCallback(
    (type: PlayerChapterType, title?: string) => {
      // Если есть начало маркера — создаём главу от маркера до текущего времени
      const startTime = markerStart ?? currentTime
      let endTime = markerStart ? currentTime : currentTime + 90 // По умолчанию 90 сек

      // Ограничить конец началом следующей главы
      const nextChapter = chapters.filter((c) => c.startTime > startTime).sort((a, b) => a.startTime - b.startTime)[0]
      if (nextChapter && endTime > nextChapter.startTime) {
        endTime = nextChapter.startTime
      }

      if (endTime <= startTime) {
        return
      }

      const defaultTitle = CHAPTER_TYPE_META[type]?.label || 'Глава'
      const newChapter: Chapter = {
        id: generateId(),
        title: title || defaultTitle,
        startTime,
        endTime: Math.min(endTime, duration),
        type,
      }

      // Добавляем и сортируем по времени начала
      const newChapters = [...chapters, newChapter].sort((a, b) => a.startTime - b.startTime)
      onChaptersChange(newChapters)
      setMarkerStart(null)
    },
    [chapters, currentTime, duration, generateId, markerStart, onChaptersChange],
  )

  /** Начать разметку — запомнить текущее время */
  const startMarking = useCallback(() => {
    setMarkerStart(currentTime)
  }, [currentTime])

  /** Отменить разметку */
  const cancelMarking = useCallback(() => {
    setMarkerStart(null)
  }, [])

  /** Обновить главу */
  const updateChapter = useCallback(
    (updatedChapter: Chapter) => {
      const newChapters = chapters.map((c) => (c.id === updatedChapter.id ? updatedChapter : c))
      onChaptersChange(newChapters.sort((a, b) => a.startTime - b.startTime))
    },
    [chapters, onChaptersChange],
  )

  /** Удалить главу */
  const deleteChapter = useCallback(
    (id: string) => {
      onChaptersChange(chapters.filter((c) => c.id !== id))
    },
    [chapters, onChaptersChange],
  )

  /** Обработчик горячих клавиш */
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Не перехватывать если фокус в input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'o':
          // O — Опенинг
          if (markerStart !== null) {
            addChapter('OP')
          } else {
            startMarking()
          }
          e.preventDefault()
          break
        case 'e':
          // E — Эндинг
          if (markerStart !== null) {
            addChapter('ED')
          } else {
            startMarking()
          }
          e.preventDefault()
          break
        case 'r':
          // R — Ретроспектива
          if (markerStart !== null) {
            addChapter('RECAP')
          } else {
            startMarking()
          }
          e.preventDefault()
          break
        case 'p':
          // P — Превью
          if (markerStart !== null) {
            addChapter('PREVIEW')
          } else {
            startMarking()
          }
          e.preventDefault()
          break
        case 'escape':
          // Escape — отменить разметку или закрыть
          if (markerStart !== null) {
            cancelMarking()
          } else {
            onClose()
          }
          e.preventDefault()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, markerStart, addChapter, startMarking, cancelMarking, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <Box
      ref={containerRef}
      position="absolute"
      top={16}
      right={4}
      w="350px"
      maxH="calc(100vh - 180px)"
      bg="bg.panel"
      borderRadius="lg"
      border="1px"
      borderColor="border.subtle"
      boxShadow="xl"
      zIndex={30}
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      {/* Заголовок */}
      <HStack px={4} py={3} borderBottom="1px" borderColor="border.subtle" justify="space-between">
        <Heading size="sm">Редактор глав</Heading>
        <IconButton aria-label="Закрыть" size="sm" variant="ghost" onClick={onClose}>
          <Icon as={LuX} />
        </IconButton>
      </HStack>

      {/* Статус разметки */}
      {markerStart !== null && (
        <Box px={4} py={2} bg="purple.900" borderBottom="1px" borderColor="purple.700">
          <HStack justify="space-between">
            <Text fontSize="sm">
              Начало: <strong>{formatTimeMs(markerStart)}</strong>
            </Text>
            <HStack gap={1}>
              <Button size="xs" onClick={() => addChapter('OP')}>
                O (OP)
              </Button>
              <Button size="xs" onClick={() => addChapter('ED')}>
                E (ED)
              </Button>
              <Button size="xs" onClick={() => addChapter('RECAP')}>
                R
              </Button>
              <Button size="xs" colorPalette="red" variant="ghost" onClick={cancelMarking}>
                <Icon as={LuX} />
              </Button>
            </HStack>
          </HStack>
        </Box>
      )}

      {/* Подсказка по горячим клавишам */}
      <Box px={4} py={2} bg="bg.subtle" fontSize="xs" color="fg.muted">
        <Text>
          <strong>O</strong> — OP · <strong>E</strong> — ED · <strong>R</strong> — ретро · <strong>P</strong> — превью ·
          {' '}
          <strong>Esc</strong> — отмена
        </Text>
        <Text mt={1}>Нажми клавишу на начале сегмента, затем снова на конце</Text>
      </Box>

      {/* Список глав */}
      <VStack flex={1} overflow="auto" px={4} py={3} gap={2} align="stretch">
        {chapters.length === 0
          ? (
            <Text color="fg.subtle" fontSize="sm" textAlign="center" py={4}>
              Главы не добавлены
            </Text>
          )
          : (
            chapters.map((chapter) => (
              <ChapterRow
                key={chapter.id}
                chapter={chapter}
                currentTime={currentTime}
                onUpdate={updateChapter}
                onDelete={() => deleteChapter(chapter.id)}
                onSeek={onSeek}
              />
            ))
          )}
      </VStack>

      {/* Режим копирования OP/ED */}
      {isCopyMode && (
        <Box px={4} py={3} bg="blue.900" borderTop="1px" borderColor="blue.700">
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" fontWeight="medium">
              Копировать OP/ED на эпизоды:
            </Text>
            <HStack gap={1}>
              <Button size="xs" variant="ghost" onClick={selectAll}>
                Все
              </Button>
              <Button size="xs" variant="ghost" onClick={deselectAll}>
                Снять
              </Button>
            </HStack>
          </HStack>
          <VStack maxH="150px" overflow="auto" align="stretch" gap={1} mb={2}>
            {otherEpisodes.map((ep) => (
              <HStack
                key={ep.id}
                px={2}
                py={1}
                bg={selectedEpisodes.has(ep.id) ? 'blue.800' : 'bg.subtle'}
                borderRadius="md"
                cursor="pointer"
                onClick={() => toggleEpisode(ep.id)}
                _hover={{ bg: selectedEpisodes.has(ep.id) ? 'blue.700' : 'bg.subtle' }}
              >
                <Checkbox.Root
                  size="sm"
                  checked={selectedEpisodes.has(ep.id)}
                  onCheckedChange={() => toggleEpisode(ep.id)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Root>
                <Text fontSize="sm" flex={1}>
                  Эпизод {ep.number}
                  {ep.name && (
                    <Text as="span" color="fg.muted">
                      {' '}
                      — {ep.name}
                    </Text>
                  )}
                </Text>
              </HStack>
            ))}
          </VStack>
          <HStack gap={2}>
            <Button
              size="sm"
              colorPalette="blue"
              flex={1}
              onClick={handleCopy}
              disabled={selectedEpisodes.size === 0 || isCopying}
              loading={isCopying}
            >
              <Icon as={LuCopy} mr={1} />
              Скопировать ({selectedEpisodes.size})
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCopyMode(false)}>
              Отмена
            </Button>
          </HStack>
        </Box>
      )}

      {/* Кнопки добавления */}
      {!isCopyMode && (
        <Box px={4} py={3} borderTop="1px" borderColor="border.subtle">
          <HStack gap={2} wrap="wrap">
            <Button size="xs" colorPalette="purple" onClick={() => addChapter('OP')}>
              <Icon as={LuPlus} mr={1} />
              OP
            </Button>
            <Button size="xs" colorPalette="blue" onClick={() => addChapter('ED')}>
              <Icon as={LuPlus} mr={1} />
              ED
            </Button>
            <Button size="xs" colorPalette="yellow" onClick={() => addChapter('RECAP')}>
              <Icon as={LuPlus} mr={1} />
              Ретро
            </Button>
            <Button size="xs" colorPalette="orange" onClick={() => addChapter('PREVIEW')}>
              <Icon as={LuPlus} mr={1} />
              Превью
            </Button>
            {canCopy && (
              <Tooltip content="Скопировать OP/ED на другие эпизоды">
                <Button size="xs" colorPalette="cyan" variant="outline" onClick={() => setIsCopyMode(true)}>
                  <Icon as={LuCopy} mr={1} />
                  Копировать
                </Button>
              </Tooltip>
            )}
            {hasOpEd && onGenerateRecapPreview && (
              <Tooltip content="Авто-создание RECAP (перед OP) и PREVIEW (после ED) для всех эпизодов">
                <Button size="xs" colorPalette="teal" variant="outline" onClick={handleGenerate} loading={isGenerating}>
                  <Icon as={LuWand} mr={1} />
                  RECAP/PREVIEW
                </Button>
              </Tooltip>
            )}
          </HStack>
          <Text fontSize="xs" color="fg.subtle" mt={2}>
            Текущее время: {formatTimeMs(currentTime)}
          </Text>
        </Box>
      )}
    </Box>
  )
}
