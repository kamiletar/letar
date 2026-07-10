'use client'

/**
 * Карточка элемента очереди импорта
 *
 * Отображает:
 * - Название аниме
 * - Статус и прогресс
 * - Детальный прогресс (fps, speed, аудио-дорожки)
 * - Кнопки управления
 */

import {
  Badge,
  Box,
  Button,
  Card,
  Collapsible,
  Dialog,
  HStack,
  Icon,
  Image,
  Input,
  Portal,
  Progress,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { memo, useCallback, useMemo, useState } from 'react'
import {
  LuCheck,
  LuChevronDown,
  LuCircleAlert,
  LuClock,
  LuExternalLink,
  LuLoader,
  LuMusic,
  LuPencil,
  LuPlay,
  LuRefreshCw,
  LuTarget,
  LuTrash2,
  LuUndo2,
  LuX,
  LuZap,
} from 'react-icons/lu'

import { formatBytes, formatSpeed } from '@/lib/format-utils'
import type { ImportQueueEntry, ImportQueueStatus } from '../../../../shared/types/import-queue'

interface ImportQueueItemProps {
  /** Элемент очереди */
  item: ImportQueueEntry
  /** Является ли текущим обрабатываемым */
  isCurrent: boolean
  /** Callback удаления */
  onRemove: () => void
  /** Callback повторной обработки (для error/cancelled) */
  onRetry?: (itemId: string, options?: { skipCompressionCheck?: boolean }) => void
  /** Callback пометки как неудачный (для completed) */
  onMarkFailed?: (itemId: string) => void
  /** Callback переделки недостающих эпизодов (с опциональным pre-encode) */
  onRetryMissing?: (itemId: string, preEncodeOptions?: { enabled: boolean; crf?: number; preset?: string }) => void
  /** Callback редактирования (для pending) */
  onEdit?: () => void
  /** Элемент в фокусе (keyboard navigation) */
  isFocused?: boolean
  /** Callback при фокусе */
  onFocus?: () => void
}

/** Цвет бейджа статуса */
const statusColors: Record<ImportQueueStatus, string> = {
  pending: 'gray',
  vmaf: 'yellow',
  preparing: 'blue',
  transcoding: 'purple',
  postprocess: 'cyan',
  completed: 'green',
  error: 'red',
  cancelled: 'orange',
}

/** Названия статусов */
const statusLabels: Record<ImportQueueStatus, string> = {
  pending: 'Ожидает',
  vmaf: 'VMAF подбор',
  preparing: 'Подготовка',
  transcoding: 'Кодирование',
  postprocess: 'Обработка',
  completed: 'Завершён',
  error: 'Ошибка',
  cancelled: 'Отменён',
}

/** Иконка статуса */
const statusIcons: Record<ImportQueueStatus, typeof LuClock> = {
  pending: LuClock,
  vmaf: LuZap,
  preparing: LuLoader,
  transcoding: LuPlay,
  postprocess: LuLoader,
  completed: LuCheck,
  error: LuX,
  cancelled: LuX,
}

/** Названия стадий обработки */
const stageLabels: Record<string, string> = {
  idle: '',
  creating_anime: 'Создание аниме',
  creating_season: 'Создание сезона',
  demuxing: 'Демуксинг',
  creating_episodes: 'Создание эпизодов',
  transcoding_video: 'Кодирование видео',
  transcoding_audio: 'Кодирование аудио',
  generating_manifests: 'Генерация манифестов',
  syncing_relations: 'Синхронизация связей',
  done: 'Готово',
  error: 'Ошибка',
  cancelled: 'Отменено',
}

/** Раскрываемый блок предупреждений для completed items */
function WarningDetails({ error }: { error: string }) {
  const [open, setOpen] = useState(false)

  // Разбиваем error на строки (разделитель "; " из warnings.join)
  const lines = useMemo(() => error.split('; ').filter(Boolean), [error])
  const isMultiline = lines.length > 1 || error.length > 80

  // Краткий текст для заголовка
  const summary = useMemo(() => {
    if (!isMultiline) return error
    // Считаем количество проблемных эпизодов из аудита
    const epMatch = error.match(/(\d+) эп\. неполные/)
    if (epMatch) return `${epMatch[1]} эп. неполные`
    // Или берём первую строку
    return lines[0].length > 60 ? `${lines[0].slice(0, 60)}…` : lines[0]
  }, [error, isMultiline, lines])

  if (!isMultiline) {
    return (
      <HStack gap={2} mt={1}>
        <Icon as={LuCircleAlert} color="orange.400" boxSize={3} flexShrink={0} />
        <Text fontSize="xs" color="orange.400">
          {error}
        </Text>
      </HStack>
    )
  }

  return (
    <Collapsible.Root open={open} onOpenChange={({ open: o }) => setOpen(o)}>
      <Collapsible.Trigger asChild>
        <HStack gap={2} mt={1} cursor="pointer" _hover={{ opacity: 0.8 }} role="button" aria-expanded={open}>
          <Icon as={LuCircleAlert} color="orange.400" boxSize={3} flexShrink={0} />
          <Text fontSize="xs" color="orange.400" flex={1}>
            {summary}
          </Text>
          <Icon
            as={LuChevronDown}
            color="orange.400"
            boxSize={3}
            transform={open ? 'rotate(180deg)' : undefined}
            transition="transform 0.2s"
          />
        </HStack>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box mt={1} pl={5} borderLeft="2px solid" borderColor="orange.400/30">
          {lines.map((line, i) => (
            <Text key={i} fontSize="xs" color="orange.300/80" mt={i > 0 ? 1 : 0}>
              {line}
            </Text>
          ))}
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

/**
 * Мемоизированный компонент элемента очереди
 *
 * Сравнивает только критичные поля для предотвращения лишних re-renders:
 * - id и статус
 * - прогресс (с допуском 1%)
 * - isCurrent
 */
export const ImportQueueItem = memo(
  function ImportQueueItem({
    item,
    isCurrent,
    onRemove,
    onRetry,
    onMarkFailed,
    onRetryMissing,
    onEdit,
    isFocused,
    onFocus,
  }: ImportQueueItemProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showRetryDialog, setShowRetryDialog] = useState(false)
    const [preEncodeEnabled, setPreEncodeEnabled] = useState(false)
    const [preEncodeCrf, setPreEncodeCrf] = useState(14)
    const router = useRouter()

    const StatusIcon = statusIcons[item.status]
    const isFinished = ['completed', 'error', 'cancelled'].includes(item.status)
    const selectedFilesCount = item.files.filter((f) => f.selected).length
    const animeName = item.selectedAnime.russian || item.selectedAnime.name

    const handleDelete = () => {
      setShowDeleteDialog(false)
      onRemove()
    }

    /** Переход на страницу аниме в библиотеке */
    const handleCardClick = useCallback(() => {
      if (item.status === 'completed' && item.createdAnimeId) {
        router.push(`/library/${item.createdAnimeId}`)
      }
    }, [item.status, item.createdAnimeId, router])

    /** Можно ли кликнуть на карточку */
    const isClickable = item.status === 'completed' && !!item.createdAnimeId

    return (
      <>
        {/* Диалог подтверждения удаления */}
        <Dialog.Root open={showDeleteDialog} onOpenChange={(e) => setShowDeleteDialog(e.open)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Удалить из очереди?</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Text>Вы уверены, что хотите удалить "{animeName}" из очереди?</Text>
                </Dialog.Body>
                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">Отмена</Button>
                  </Dialog.ActionTrigger>
                  <Button colorPalette="red" onClick={handleDelete}>
                    Удалить
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>

        {/* Диалог реимпорта с опцией pre-encode */}
        <Dialog.Root open={showRetryDialog} onOpenChange={(e) => setShowRetryDialog(e.open)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Переделать недостающие эпизоды</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <VStack gap={4} align="stretch">
                    <Text>Будут переделаны неполные эпизоды "{animeName}".</Text>
                    <Box
                      p={3}
                      borderRadius="md"
                      border="1px"
                      borderColor={preEncodeEnabled ? 'blue.500' : 'border.subtle'}
                      bg={preEncodeEnabled ? 'blue.500/10' : 'transparent'}
                    >
                      <HStack justify="space-between" mb={preEncodeEnabled ? 3 : 0}>
                        <VStack align="start" gap={0}>
                          <Text fontWeight="medium">Pre-encode исходника</Text>
                          <Text fontSize="xs" color="fg.muted">
                            Пережать в H264 перед импортом (для битых потоков)
                          </Text>
                        </VStack>
                        <Switch.Root checked={preEncodeEnabled} onCheckedChange={(e) => setPreEncodeEnabled(e.checked)}>
                          <Switch.HiddenInput />
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Root>
                      </HStack>
                      {preEncodeEnabled && (
                        <HStack gap={3}>
                          <Text fontSize="sm" whiteSpace="nowrap">
                            CRF:
                          </Text>
                          <Input
                            type="number"
                            size="sm"
                            w="80px"
                            min={0}
                            max={51}
                            value={preEncodeCrf}
                            onChange={(e) => setPreEncodeCrf(Number(e.target.value))}
                          />
                          <Text fontSize="xs" color="fg.muted">
                            Меньше = лучше качество (14 — с запасом)
                          </Text>
                        </HStack>
                      )}
                    </Box>
                  </VStack>
                </Dialog.Body>
                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">Отмена</Button>
                  </Dialog.ActionTrigger>
                  <Button
                    colorPalette="blue"
                    onClick={() => {
                      setShowRetryDialog(false)
                      onRetryMissing?.(
                        item.id,
                        preEncodeEnabled ? { enabled: true, crf: preEncodeCrf, preset: 'medium' } : undefined
                      )
                    }}
                  >
                    Переделать
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>

        <Card.Root
          bg="bg.panel"
          border="1px"
          borderColor={isFocused ? 'purple.500' : isCurrent ? 'purple.500' : 'border.subtle'}
          boxShadow={isCurrent ? 'md' : 'none'}
          cursor={isClickable ? 'pointer' : 'default'}
          onClick={isClickable ? handleCardClick : onFocus}
          role="listitem"
          tabIndex={isFocused ? 0 : -1}
          outline={isFocused ? '2px solid' : 'none'}
          outlineColor="purple.500"
          outlineOffset="2px"
          _hover={isClickable ? { borderColor: 'green.500', bg: 'green.950/20' } : undefined}
          transition="all 0.15s"
        >
          <Card.Body py={3}>
            <HStack gap={4} align="start">
              {/* Постер */}
              {item.selectedAnime.posterUrl && (
                <Image
                  src={item.selectedAnime.posterUrl}
                  alt={item.selectedAnime.name}
                  w="60px"
                  h="84px"
                  objectFit="cover"
                  borderRadius="md"
                  flexShrink={0}
                />
              )}

              {/* Информация */}
              <VStack align="start" gap={1} flex={1}>
                {/* Название и статус */}
                <HStack justify="space-between" w="full">
                  <Text fontWeight="semibold" lineClamp={1}>
                    {item.selectedAnime.russian || item.selectedAnime.name}
                  </Text>

                  <HStack gap={2}>
                    <Badge colorPalette={statusColors[item.status]} variant="subtle">
                      <Icon as={StatusIcon} boxSize={3} mr={1} />
                      {statusLabels[item.status]}
                    </Badge>
                    {isClickable && <Icon as={LuExternalLink} boxSize={4} color="green.400" />}
                  </HStack>
                </HStack>

                {/* Мета-информация */}
                <HStack gap={4} fontSize="sm" color="fg.muted">
                  <Text>{selectedFilesCount} эп.</Text>
                  {item.selectedAnime.kind && <Text>{item.selectedAnime.kind}</Text>}
                  {item.parsedInfo.quality && <Text>{item.parsedInfo.quality}</Text>}
                  {item.parsedInfo.rutrackerUrl && (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="blue"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.electronAPI?.app.openExternal(item.parsedInfo.rutrackerUrl!)
                      }}
                      px={1}
                      minW="auto"
                      h="auto"
                    >
                      <Icon as={LuExternalLink} boxSize={3} />
                      <Text fontSize="xs">Rutracker</Text>
                    </Button>
                  )}
                  {item.forceCpu && (
                    <Badge colorPalette="blue" variant="subtle" size="sm">
                      CPU
                    </Badge>
                  )}
                </HStack>

                {/* VMAF подбор CQ */}
                {item.status === 'vmaf' && item.vmafProgress && (
                  <Box w="full" mt={1}>
                    <Progress.Root
                      value={(item.vmafProgress.currentIteration / item.vmafProgress.totalIterations) * 100}
                      size="sm"
                      colorPalette="yellow"
                    >
                      <Progress.Track>
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>
                    <HStack justify="space-between" mt={1}>
                      <HStack gap={2}>
                        <Icon as={LuTarget} color="yellow.400" boxSize={3} />
                        <Text fontSize="xs" color="fg.muted">
                          Итерация {item.vmafProgress.currentIteration}/{item.vmafProgress.totalIterations}
                          {item.vmafProgress.currentCq !== undefined && ` • CQ ${item.vmafProgress.currentCq}`}
                        </Text>
                      </HStack>
                      {item.vmafProgress.lastVmaf !== undefined && (
                        <Text fontSize="xs" color="yellow.400" fontWeight="medium">
                          VMAF {item.vmafProgress.lastVmaf.toFixed(1)}
                        </Text>
                      )}
                    </HStack>
                    {/* История итераций (последние 3) */}
                    {item.vmafProgress.lastIteration && (
                      <Text fontSize="xs" color="fg.muted" mt={1}>
                        {item.vmafProgress.stage === 'extracting' && 'Извлечение сэмплов...'}
                        {item.vmafProgress.stage === 'encoding' && 'Кодирование...'}
                        {item.vmafProgress.stage === 'calculating' && 'Расчёт VMAF...'}
                      </Text>
                    )}
                  </Box>
                )}

                {/* VMAF результат (после подбора, показываем во время кодирования) */}
                {item.vmafResult && item.status !== 'vmaf' && !isFinished && (
                  <HStack gap={2} mt={1}>
                    <Icon as={LuCheck} color="green.400" boxSize={3} />
                    <Text fontSize="xs" color="green.400">
                      CQ {item.vmafResult.optimalCq} (VMAF {item.vmafResult.vmafScore.toFixed(1)})
                    </Text>
                  </HStack>
                )}

                {/* Прогресс (для активных статусов) */}
                {!isFinished &&
                  item.status !== 'vmaf' &&
                  item.progress !== undefined &&
                  (item.progress > 0 || item.currentStage) && (
                    <Box w="full" mt={1}>
                      {item.progress > 0 && (
                        <Progress.Root value={item.progress} size="sm" colorPalette="purple">
                          <Progress.Track>
                            <Progress.Range />
                          </Progress.Track>
                        </Progress.Root>
                      )}
                      <HStack justify="space-between" mt={1}>
                        <Text fontSize="xs" color="fg.muted">
                          {item.detailProgress?.videoTotal
                            ? `${item.detailProgress.videoCompleted}/${item.detailProgress.videoTotal} видео` +
                              (item.currentFileName ? ` • ${item.currentFileName}` : '')
                            : (item.currentStage && stageLabels[item.currentStage]) || item.currentFileName || ''}
                        </Text>
                        {item.progress > 0 && (
                          <Text fontSize="xs" color="fg.muted">
                            {item.progress.toFixed(0)}%
                          </Text>
                        )}
                      </HStack>

                      {/* Детальный прогресс */}
                      {item.detailProgress && (
                        <VStack gap={2} mt={2} align="stretch">
                          {/* FPS, скорость, размер */}
                          <HStack gap={4} fontSize="xs" color="fg.muted" flexWrap="wrap">
                            {item.detailProgress.fps !== undefined && item.detailProgress.fps > 0 && (
                              <HStack gap={1}>
                                <Text fontWeight="medium" color="green.400">
                                  {item.detailProgress.fps.toFixed(0)}
                                </Text>
                                <Text>fps</Text>
                              </HStack>
                            )}
                            {item.detailProgress.speed !== undefined && item.detailProgress.speed > 0 && (
                              <HStack gap={1}>
                                <Icon as={LuZap} color="yellow.400" boxSize={3} />
                                <Text fontWeight="medium" color="yellow.400">
                                  {formatSpeed(item.detailProgress.speed)}
                                </Text>
                              </HStack>
                            )}
                            {item.detailProgress.outputSize !== undefined && item.detailProgress.outputSize > 0 && (
                              <Text>{formatBytes(item.detailProgress.outputSize)}</Text>
                            )}
                          </HStack>

                          {/* Аудио-дорожки (компактно) */}
                          {item.detailProgress.audioTracks && item.detailProgress.audioTracks.length > 0 && (
                            <HStack gap={2} flexWrap="wrap">
                              {item.detailProgress.audioTracks.map((track) => (
                                <HStack
                                  key={track.index}
                                  gap={1}
                                  px={2}
                                  py={0.5}
                                  bg={track.progress >= 100 ? 'green.900/30' : 'purple.900/30'}
                                  borderRadius="sm"
                                  fontSize="xs"
                                >
                                  <Icon
                                    as={track.progress >= 100 ? LuCheck : LuMusic}
                                    color={track.progress >= 100 ? 'green.400' : 'purple.400'}
                                    boxSize={3}
                                  />
                                  <Text color={track.progress >= 100 ? 'green.400' : 'purple.400'}>{track.name}</Text>
                                  {track.progress < 100 && (
                                    <Text color="purple.400" fontWeight="medium">
                                      {track.progress}%
                                    </Text>
                                  )}
                                </HStack>
                              ))}
                            </HStack>
                          )}
                        </VStack>
                      )}
                    </Box>
                  )}

                {/* Warning для completed с неполными эпизодами */}
                {item.status === 'completed' && item.error && <WarningDetails error={item.error} />}

                {/* Ошибка */}
                {item.status === 'error' && item.error && (
                  <Text fontSize="sm" color="red.500">
                    {item.error}
                  </Text>
                )}
                {/* Подсказка при ошибке неэффективного сжатия */}
                {item.status === 'error' && item.error?.includes('Сжатие неэффективно') && (
                  <Text fontSize="xs" color="orange.400">
                    Можно повторить игнорируя проверку сжатия →
                  </Text>
                )}
              </VStack>

              {/* Кнопки */}
              <VStack gap={1} onClick={(e) => e.stopPropagation()}>
                {/* Редактировать (только для pending) */}
                {item.status === 'pending' && onEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    colorPalette="purple"
                    onClick={onEdit}
                    aria-label="Редактировать"
                    minW="40px"
                    minH="40px"
                  >
                    <Icon as={LuPencil} />
                  </Button>
                )}
                {/* Переделать недостающие (для всех completed) */}
                {item.status === 'completed' && onRetryMissing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    colorPalette="blue"
                    onClick={() => setShowRetryDialog(true)}
                    aria-label="Переделать недостающие эпизоды"
                    minW="40px"
                    minH="40px"
                    title="Переделать недостающие"
                  >
                    <Icon as={LuRefreshCw} />
                  </Button>
                )}
                {/* Пометить неудачным (только для completed) */}
                {item.status === 'completed' && onMarkFailed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    colorPalette="orange"
                    onClick={() => onMarkFailed(item.id)}
                    aria-label="Пометить неудачным для реимпорта"
                    minW="40px"
                    minH="40px"
                    title="Пометить неудачным"
                  >
                    <Icon as={LuUndo2} />
                  </Button>
                )}
                {/* Повторить (только для error и cancelled) */}
                {(item.status === 'error' || item.status === 'cancelled') && onRetry && (
                  <Button
                    size="sm"
                    variant="ghost"
                    colorPalette="green"
                    onClick={() => onRetry(item.id)}
                    aria-label="Повторить обработку"
                    minW="40px"
                    minH="40px"
                    title="Повторить"
                  >
                    <Icon as={LuRefreshCw} />
                  </Button>
                )}
                {/* Повторить игнорируя проверку сжатия */}
                {item.status === 'error' && item.error?.includes('Сжатие неэффективно') && onRetry && (
                  <Button
                    size="sm"
                    variant="ghost"
                    colorPalette="orange"
                    onClick={() => onRetry(item.id, { skipCompressionCheck: true })}
                    aria-label="Повторить игнорируя сжатие"
                    minW="40px"
                    minH="40px"
                    title="Повторить (игнор. сжатие)"
                  >
                    <Icon as={LuZap} />
                  </Button>
                )}
                {/* Удалить (только для pending и завершённых) */}
                {(item.status === 'pending' || isFinished) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() => setShowDeleteDialog(true)}
                    aria-label="Удалить элемент"
                    minW="40px"
                    minH="40px"
                  >
                    <Icon as={LuTrash2} />
                  </Button>
                )}
              </VStack>
            </HStack>
          </Card.Body>
        </Card.Root>
      </>
    )
  },
  (prev, next) => {
    // Custom comparator: пропускаем render если критичные поля не изменились

    // ID и статус — всегда проверяем
    if (prev.item.id !== next.item.id) {
      return false
    }
    if (prev.item.status !== next.item.status) {
      return false
    }
    if (prev.isCurrent !== next.isCurrent) {
      return false
    }
    if (prev.isFocused !== next.isFocused) {
      return false
    }

    // Прогресс — с допуском 1% для снижения re-renders
    const prevProgress = prev.item.progress ?? 0
    const nextProgress = next.item.progress ?? 0
    if (Math.abs(prevProgress - nextProgress) >= 1) {
      return false
    }

    // VMAF прогресс — проверяем итерацию
    if (prev.item.vmafProgress?.currentIteration !== next.item.vmafProgress?.currentIteration) {
      return false
    }

    // Ошибка — для отображения сообщения
    if (prev.item.error !== next.item.error) {
      return false
    }

    // forceCpu — для отображения бейджа
    if (prev.item.forceCpu !== next.item.forceCpu) {
      return false
    }

    // Счётчик завершённых видео — для обновления "3/5 видео"
    if (prev.item.detailProgress?.videoCompleted !== next.item.detailProgress?.videoCompleted) {
      return false
    }

    // currentFileName — для обновления текста под прогресс-баром
    if (prev.item.currentFileName !== next.item.currentFileName) {
      return false
    }

    // currentStage — для отображения стадии (демуксинг, создание аниме и т.д.)
    if (prev.item.currentStage !== next.item.currentStage) {
      return false
    }

    // Если дошли сюда — props равны, пропускаем render
    return true
  }
)
