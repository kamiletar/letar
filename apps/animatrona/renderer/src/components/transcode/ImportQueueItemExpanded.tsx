'use client'

/**
 * Развёрнутая карточка элемента очереди импорта
 *
 * Используется для текущего обрабатываемого элемента.
 * Показывает:
 * - Постер и информацию об аниме
 * - Статус и прогресс
 * - VMAF результат (если был подбор)
 * - Панель активных воркеров
 * - Детальную статистику
 */

import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Float,
  HStack,
  Icon,
  Image,
  Portal,
  Progress,
  Text,
  VStack,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { memo, useEffect, useMemo, useState } from 'react'
import { LuCircleAlert, LuClock, LuCopy, LuHourglass, LuRefreshCw, LuTarget, LuX, LuZap } from 'react-icons/lu'

import { formatBytes } from '@/lib/format-utils'
import { breakpoints, useMediaQuery } from '@letar/hooks'
import type { ImportQueueEntry } from '../../../../shared/types/import-queue'
import { ActiveWorkersPanel } from './ActiveWorkersPanel'
import { VmafProgressCard } from './VmafProgressCard'

/** Пульсирующая анимация для активной карточки */
const pulseAnimation = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
`

interface ImportQueueItemExpandedProps {
  /** Элемент очереди */
  item: ImportQueueEntry
  /** Callback отмены */
  onCancel?: () => void
  /** Callback повтора при ошибке */
  onRetry?: (id: string, options?: { skipCompressionCheck?: boolean }) => void
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

/** Форматирует время в мс → читаемый вид */
function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}мс`
  }
  const sec = Math.floor(ms / 1000)
  if (sec < 60) {
    return `${sec}с`
  }
  const min = Math.floor(sec / 60)
  const secRem = sec % 60
  if (min < 60) {
    return `${min}м ${secRem}с`
  }
  const hours = Math.floor(min / 60)
  const minRem = min % 60
  return `${hours}ч ${minRem}м`
}

/** Вычисляет elapsed time в мс */
function getElapsedMs(startedAt: string | undefined): number | undefined {
  if (!startedAt) {
    return undefined
  }
  return Date.now() - new Date(startedAt).getTime()
}

/** Вычисляет ETA на основе elapsed и прогресса */
function calculateEta(elapsedMs: number | undefined, progress: number | undefined): number | undefined {
  if (!elapsedMs || elapsedMs <= 0 || !progress || progress <= 0 || progress >= 100) {
    return undefined
  }
  return Math.round((elapsedMs * (100 - progress)) / progress)
}

/**
 * Мемоизированный развёрнутый компонент элемента очереди
 *
 * Сравнивает критичные поля с допуском для снижения re-renders
 */
export const ImportQueueItemExpanded = memo(
  function ImportQueueItemExpanded({ item, onCancel, onRetry }: ImportQueueItemExpandedProps) {
    const [showCancelDialog, setShowCancelDialog] = useState(false)
    const [, setTick] = useState(0) // Для принудительного ререндера времени

    const selectedFilesCount = item.files.filter((f) => f.selected).length
    const animeName = item.selectedAnime.russian || item.selectedAnime.name
    const isVmafStage = item.status === 'vmaf'
    const isTranscoding = item.status === 'transcoding'
    const isActive = ['vmaf', 'preparing', 'transcoding', 'postprocess'].includes(item.status)

    // Интервал для обновления elapsed time каждую секунду
    useEffect(() => {
      if (!isActive || !item.startedAt) {
        return
      }
      const interval = setInterval(() => setTick((t) => t + 1), 1000)
      return () => clearInterval(interval)
    }, [isActive, item.startedAt])

    // Вычисляем elapsed и ETA для всего сериала
    const elapsedMs = getElapsedMs(item.startedAt)
    const eta = calculateEta(elapsedMs, item.progress)
    const prefersReducedMotion = useMediaQuery(breakpoints.prefersReducedMotion)

    // Glow effect стили для активной карточки
    // При reduced motion — отключаем пульсацию, но оставляем glow
    const glowStyles = useMemo(
      () => ({
        boxShadow: isActive
          ? '0 0 30px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : undefined,
        animation: isActive && !prefersReducedMotion ? `${pulseAnimation} 3s ease-in-out infinite` : undefined,
      }),
      [isActive, prefersReducedMotion],
    )

    const handleCancel = () => {
      setShowCancelDialog(false)
      onCancel?.()
    }

    return (
      <>
        {/* Диалог подтверждения отмены */}
        <Dialog.Root open={showCancelDialog} onOpenChange={(e) => setShowCancelDialog(e.open)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Отменить кодирование?</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Text>Вы уверены, что хотите отменить кодирование "{animeName}"? Прогресс будет потерян.</Text>
                </Dialog.Body>
                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">Нет, продолжить</Button>
                  </Dialog.ActionTrigger>
                  <Button colorPalette="red" onClick={handleCancel}>
                    Да, отменить
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>

        <Card.Root
          bg="bg.panel"
          border="2px"
          borderColor={isActive ? 'purple.400' : 'purple.500'}
          css={glowStyles}
          transition="all 0.3s ease"
        >
          <Card.Body py={4}>
            <VStack gap={4} align="stretch">
              {/* Заголовок */}
              <HStack gap={4} align="start">
                {/* Постер */}
                {item.selectedAnime.posterUrl && (
                  <Image
                    src={item.selectedAnime.posterUrl}
                    alt={item.selectedAnime.name}
                    w="80px"
                    h="112px"
                    objectFit="cover"
                    borderRadius="md"
                    flexShrink={0}
                  />
                )}

                {/* Информация */}
                <VStack align="start" gap={2} flex={1}>
                  {/* Название и статус */}
                  <HStack justify="space-between" w="full" flexWrap="wrap" gap={2}>
                    <Text fontWeight="bold" fontSize="lg" lineClamp={1}>
                      {animeName}
                    </Text>

                    {/* Кнопка отмены */}
                    {isActive && onCancel && (
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        onClick={() => setShowCancelDialog(true)}
                        aria-label="Отменить кодирование"
                      >
                        <Icon as={LuX} boxSize={3} />
                        Отменить
                      </Button>
                    )}
                  </HStack>

                  {/* Мета-информация */}
                  <HStack gap={4} fontSize="sm" color="fg.muted" flexWrap="wrap">
                    <Text>{selectedFilesCount} эп.</Text>
                    {item.selectedAnime.kind && <Text>{item.selectedAnime.kind}</Text>}
                    {item.parsedInfo.quality && <Text>{item.parsedInfo.quality}</Text>}
                    {item.parsedInfo.subGroup && (
                      <Badge variant="subtle" colorPalette="gray" size="sm">
                        {item.parsedInfo.subGroup}
                      </Badge>
                    )}
                  </HStack>

                  {/* VMAF результат (после подбора) */}
                  {item.vmafResult && item.status !== 'vmaf' && (
                    <HStack gap={3} p={2} bg="green.900/30" borderRadius="md">
                      <Icon as={LuTarget} color="green.400" boxSize={4} />
                      <Text fontSize="sm" color="green.300">
                        VMAF подобрал: <strong>CQ {item.vmafResult.optimalCq}</strong> (VMAF{' '}
                        {item.vmafResult.vmafScore.toFixed(1)})
                      </Text>
                      <Text fontSize="xs" color="green.500">
                        {formatTime(item.vmafResult.totalTime)}
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </HStack>

              {/* VMAF карточка (во время подбора) */}
              {isVmafStage && <VmafProgressCard item={item} />}

              {/* Основной прогресс (не VMAF) */}
              {!isVmafStage && item.progress !== undefined && item.progress > 0 && (
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" color="fg.muted">
                      {/* currentFileName имеет приоритет — содержит детали текущего шага */}
                      {item.currentFileName
                        || (item.currentStage && stageLabels[item.currentStage])
                        || (item.progress >= 100 ? 'Завершение...' : null)
                        || 'Обработка...'}
                    </Text>
                  </HStack>
                  <Progress.Root value={item.progress} size="lg" colorPalette="purple">
                    <Progress.Track h="24px" borderRadius="md">
                      <Progress.Range transition="width 0.3s ease" />
                      {/* Проценты внутри прогресс-бара */}
                      <Float placement="middle-center" w="full">
                        <Text fontSize="sm" fontWeight="bold" color="white" textShadow="0 1px 2px rgba(0,0,0,0.5)">
                          {item.progress?.toFixed(0)}%
                        </Text>
                      </Float>
                    </Progress.Track>
                  </Progress.Root>

                  {/* Время: прошло / осталось */}
                  {elapsedMs !== undefined && elapsedMs > 0 && (
                    <HStack justify="center" gap={6} mt={3} fontSize="sm">
                      <HStack gap={2} color="fg.muted">
                        <Icon as={LuClock} boxSize={4} color="blue.400" />
                        <Text>Прошло:</Text>
                        <Text fontWeight="bold" color="blue.300">
                          {formatTime(elapsedMs)}
                        </Text>
                      </HStack>
                      {eta !== undefined && (
                        <HStack gap={2} color="fg.muted">
                          <Icon as={LuHourglass} boxSize={4} color="orange.400" />
                          <Text>Осталось:</Text>
                          <Text fontWeight="bold" color="orange.300">
                            ~{formatTime(eta)}
                          </Text>
                        </HStack>
                      )}
                    </HStack>
                  )}
                </Box>
              )}

              {/* Панель воркеров (во время транскодирования) */}
              {isTranscoding && item.detailProgress && <ActiveWorkersPanel progress={item.detailProgress} />}

              {/* Детальная статистика (fps, speed, размер) — видео/аудио прогресс уже в ActiveWorkersPanel */}
              {isTranscoding && item.detailProgress && (
                <HStack gap={6} fontSize="sm" color="fg.muted" flexWrap="wrap" justify="center">
                  {item.detailProgress.fps !== undefined && item.detailProgress.fps > 0 && (
                    <HStack gap={1}>
                      <Text fontWeight="bold" color="green.400">
                        {item.detailProgress.fps.toFixed(0)}
                      </Text>
                      <Text>fps</Text>
                    </HStack>
                  )}
                  {item.detailProgress.speed !== undefined && item.detailProgress.speed > 0 && (
                    <HStack gap={1}>
                      <Icon as={LuZap} color="yellow.400" boxSize={4} />
                      <Text fontWeight="bold" color="yellow.400">
                        {item.detailProgress.speed.toFixed(2)}x
                      </Text>
                    </HStack>
                  )}
                  {item.detailProgress.outputSize !== undefined && item.detailProgress.outputSize > 0 && (
                    <Text>{formatBytes(item.detailProgress.outputSize)}</Text>
                  )}
                </HStack>
              )}

              {/* Ошибка */}
              {item.status === 'error' && item.error && (
                <Box p={3} bg="red.900/30" borderRadius="md" borderWidth="1px" borderColor="red.700/50">
                  <HStack justify="space-between" mb={2}>
                    <HStack gap={2}>
                      <Icon as={LuCircleAlert} color="red.400" boxSize={4} />
                      <Text fontWeight="medium" color="red.300">
                        Ошибка
                      </Text>
                    </HStack>
                    <HStack gap={2}>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() =>
                          navigator.clipboard.writeText(item.error ?? '')}
                        aria-label="Копировать ошибку"
                      >
                        <Icon as={LuCopy} boxSize={3} />
                        Копировать
                      </Button>
                      {onRetry && (
                        <Button
                          size="xs"
                          colorPalette="red"
                          onClick={() => onRetry(item.id)}
                          aria-label="Повторить"
                        >
                          <Icon as={LuRefreshCw} boxSize={3} />
                          Повторить
                        </Button>
                      )}
                    </HStack>
                  </HStack>
                  <Text fontSize="sm" color="red.300" css={{ wordBreak: 'break-word' }}>
                    {item.error}
                  </Text>
                </Box>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      </>
    )
  },
  (prev, next) => {
    // Custom comparator: пропускаем render если критичные поля не изменились

    if (prev.item.id !== next.item.id) {
      return false
    }
    if (prev.item.status !== next.item.status) {
      return false
    }

    // Прогресс — с допуском 1%
    const prevProgress = prev.item.progress ?? 0
    const nextProgress = next.item.progress ?? 0
    if (Math.abs(prevProgress - nextProgress) >= 1) {
      return false
    }

    // VMAF итерация
    if (prev.item.vmafProgress?.currentIteration !== next.item.vmafProgress?.currentIteration) {
      return false
    }

    // Ошибка
    if (prev.item.error !== next.item.error) {
      return false
    }

    // Стадия
    if (prev.item.currentStage !== next.item.currentStage) {
      return false
    }

    // Текущий файл (демукс, транскод — меняется имя файла)
    if (prev.item.currentFileName !== next.item.currentFileName) {
      return false
    }

    return true
  },
)
