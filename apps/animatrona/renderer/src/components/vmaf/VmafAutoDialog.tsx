'use client'

/**
 * Диалог автоподбора качества VMAF
 *
 * Позволяет найти оптимальный CQ для достижения целевого VMAF.
 * Использует бинарный поиск с параллельным кодированием 4 сэмплов.
 * Автоматически переключается на CPU (libsvtav1) при проблемах с GPU.
 */

import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  HStack,
  Portal,
  Progress,
  Slider,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import {
  LuCheck,
  LuCpu,
  LuFileVideo,
  LuFolderOpen,
  LuGauge,
  LuPlay,
  LuTarget,
  LuTriangleAlert,
  LuX,
  LuZap,
} from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'
import { formatFileSize } from '@/lib/format-utils'
import type { VideoTranscodeOptions } from '../../../../shared/types'
import type { CqIteration, CqSearchProgress, CqSearchResult } from '../../../../shared/types/vmaf'

/** Props диалога */
interface VmafAutoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Путь к видеофайлу для тестирования */
  videoPath?: string
  /** Текущие настройки кодирования (без CQ — его ищем) */
  videoOptions: Omit<VideoTranscodeOptions, 'cq'>
  /** Callback при успешном завершении — возвращает найденный CQ */
  onOptimalCqFound?: (result: CqSearchResult) => void
}

/** Шаг диалога */
type DialogStep = 'config' | 'progress' | 'done'

/**
 * Форматирует время в человекочитаемый вид
 */
function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms} мс`
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)} сек`
  }
  return `${Math.floor(ms / 60000)} мин ${Math.round((ms % 60000) / 1000)} сек`
}

/**
 * Определяет цвет по значению VMAF (семантические токены)
 */
function getVmafColor(vmaf: number): string {
  if (vmaf >= 95) {
    return 'status.success'
  }
  if (vmaf >= 93) {
    return 'accent.fg'
  }
  if (vmaf >= 90) {
    return 'status.warning'
  }
  if (vmaf >= 85) {
    return 'accent.solid'
  }
  return 'status.error'
}

/**
 * Определяет качество по CQ (семантические токены)
 */
function getCqQuality(cq: number): { label: string; color: string } {
  if (cq <= 20) {
    return { label: 'Архивное', color: 'primary.fg' }
  }
  if (cq <= 24) {
    return { label: 'Высокое', color: 'status.success' }
  }
  if (cq <= 28) {
    return { label: 'Хорошее', color: 'accent.fg' }
  }
  if (cq <= 32) {
    return { label: 'Среднее', color: 'status.warning' }
  }
  return { label: 'Быстрое', color: 'accent.solid' }
}

/**
 * Диалог автоподбора качества VMAF
 */
export function VmafAutoDialog({
  open,
  onOpenChange,
  videoPath: initialVideoPath,
  videoOptions,
  onOptimalCqFound,
}: VmafAutoDialogProps) {
  const [step, setStep] = useState<DialogStep>('config')
  const [isSearching, setIsSearching] = useState(false)

  // Конфигурация
  const [videoPath, setVideoPath] = useState(initialVideoPath || '')
  const [targetVmaf, setTargetVmaf] = useState(93)

  // Прогресс и результат
  const [progress, setProgress] = useState<CqSearchProgress | null>(null)
  const [iterations, setIterations] = useState<CqIteration[]>([])
  const [result, setResult] = useState<CqSearchResult | null>(null)

  // Синхронизируем videoPath при открытии
  useEffect(() => {
    if (open && initialVideoPath) {
      setVideoPath(initialVideoPath)
    }
  }, [open, initialVideoPath])

  // Сброс состояния при открытии
  useEffect(() => {
    if (open) {
      setStep('config')
      setProgress(null)
      setIterations([])
      setResult(null)
      setIsSearching(false)
    }
  }, [open])

  // Подписка на прогресс VMAF
  useEffect(() => {
    if (!window.electronAPI?.vmaf) {
      return
    }

    const unsubProgress = window.electronAPI.vmaf.onProgress((p) => {
      setProgress(p)
      // Сохраняем итерации
      if (p.lastIteration) {
        const lastIter = p.lastIteration
        setIterations((prev) => {
          // Добавляем только если это новая итерация
          if (prev.some((i) => i.cq === lastIter.cq)) {
            return prev
          }
          return [...prev, lastIter]
        })
      }
    })

    return () => {
      unsubProgress()
    }
  }, [])

  /**
   * Выбор видеофайла через Electron dialog
   */
  const handleSelectFile = useCallback(async () => {
    if (!window.electronAPI?.dialog) {
      return
    }

    const file = await window.electronAPI.dialog.selectFile([
      { name: 'Видео', extensions: ['mkv', 'mp4', 'avi', 'webm', 'mov'] },
    ])
    if (file) {
      setVideoPath(file)
    }
  }, [])

  /**
   * Запуск поиска оптимального CQ
   */
  const handleStartSearch = useCallback(async () => {
    if (!videoPath) {
      toaster.error({ title: 'Выберите видеофайл' })
      return
    }

    if (!window.electronAPI?.vmaf) {
      toaster.error({ title: 'VMAF API недоступен' })
      return
    }

    setIsSearching(true)
    setStep('progress')
    setIterations([])
    setProgress({
      currentIteration: 0,
      totalIterations: 6,
      stage: 'extracting',
    })

    try {
      const response = await window.electronAPI.vmaf.findOptimalCQ(videoPath, videoOptions, {
        targetVmaf,
        tolerance: 1,
        maxIterations: 6,
      })

      if (response.success && response.data) {
        setResult(response.data)
        setStep('done')
        onOptimalCqFound?.(response.data)
      } else {
        toaster.error({
          title: 'Ошибка поиска CQ',
          description: response.error || 'Неизвестная ошибка',
        })
        setStep('config')
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: String(error),
      })
      setStep('config')
    } finally {
      setIsSearching(false)
    }
  }, [videoPath, videoOptions, targetVmaf, onOptimalCqFound])

  // === Рендеринг шагов ===

  /** Шаг конфигурации */
  const renderConfigStep = () => (
    <>
      <Dialog.Body>
        <VStack gap={6} align="stretch">
          {/* Описание */}
          <Box p={4} bg="callout.brand.bg" borderRadius="md" borderWidth="1px" borderColor="callout.brand.border">
            <HStack gap={3}>
              <LuTarget color="var(--chakra-colors-callout-brand-fg)" size={20} />
              <Box>
                <Text fontWeight="bold">Автоподбор качества</Text>
                <Text color="fg.muted" fontSize="sm">
                  Алгоритм найдёт оптимальный CQ для достижения целевого VMAF. При проблемах с GPU автоматически
                  переключится на CPU (libsvtav1).
                </Text>
              </Box>
            </HStack>
          </Box>

          {/* Выбор файла */}
          <Box>
            <Text fontWeight="medium" mb={2}>
              Тестовое видео *
            </Text>
            <HStack>
              <Box flex={1} p={2} bg="bg.emphasized" borderRadius="md" minH="40px" display="flex" alignItems="center">
                <Text color={videoPath ? 'fg' : 'fg.subtle'} fontSize="sm" truncate>
                  {videoPath || 'Выберите видеофайл...'}
                </Text>
              </Box>
              <Button variant="outline" onClick={handleSelectFile}>
                <LuFolderOpen style={{ marginRight: '8px' }} />
                Обзор
              </Button>
            </HStack>
            <Text color="fg.subtle" fontSize="xs" mt={1}>
              Рекомендуется использовать первый эпизод из серии для репрезентативного результата
            </Text>
          </Box>

          {/* Целевой VMAF */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="medium">Целевое качество (VMAF)</Text>
              <Badge colorPalette="purple" size="lg">
                {targetVmaf}
              </Badge>
            </HStack>
            <Slider.Root
              min={90}
              max={98}
              step={1}
              value={[targetVmaf]}
              onValueChange={(e) => setTargetVmaf(e.value[0])}
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0}>
                  <Slider.HiddenInput />
                </Slider.Thumb>
              </Slider.Control>
            </Slider.Root>
            <HStack justify="space-between" mt={1}>
              <Text color="fg.subtle" fontSize="xs">
                90 (меньше размер)
              </Text>
              <Text color="fg.subtle" fontSize="xs">
                98 (выше качество)
              </Text>
            </HStack>
            <Text color="fg.subtle" fontSize="sm" mt={2}>
              <strong>93</strong> — оптимально для аниме. Выше 93 практически не заметно.
            </Text>
          </Box>

          {/* Информация о настройках */}
          <Box p={3} bg="bg.muted" borderRadius="md">
            <Text color="fg.muted" fontSize="sm">
              <strong>Настройки кодирования:</strong> {videoOptions.codec?.toUpperCase() || 'AV1'},{' '}
              {videoOptions.useGpu ? 'GPU (NVENC → libsvtav1 fallback)' : 'CPU (libsvtav1)'}, пресет{' '}
              {videoOptions.preset}
            </Text>
          </Box>

          {/* Примерное время */}
          <Box p={3} bg="callout.info.bg" borderRadius="md" borderWidth="1px" borderColor="callout.info.border">
            <HStack>
              <LuZap color="var(--chakra-colors-callout-info-fg)" />
              <Text color="callout.info.fg" fontSize="sm">
                Ожидаемое время: 2-5 минут (GPU) или 5-15 минут (CPU fallback)
              </Text>
            </HStack>
          </Box>
        </VStack>
      </Dialog.Body>

      <Dialog.Footer>
        <HStack gap={2}>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button colorPalette="purple" onClick={handleStartSearch} disabled={!videoPath}>
            <LuPlay style={{ marginRight: '8px' }} />
            Начать поиск
          </Button>
        </HStack>
      </Dialog.Footer>
    </>
  )

  /** Шаг прогресса */
  const renderProgressStep = () => {
    const stageLabels: Record<string, string> = {
      extracting: 'Извлечение сэмплов...',
      encoding: 'Кодирование сэмплов...',
      calculating: 'Расчёт VMAF...',
      done: 'Завершено',
    }

    const overallPercent = progress
      ? Math.max(
        0,
        ((progress.currentIteration
          - 1
          + (progress.stage === 'calculating' ? 0.7 : progress.stage === 'encoding' ? 0.3 : 0))
          / progress.totalIterations)
          * 100,
      )
      : 0

    return (
      <>
        <Dialog.Body>
          <VStack gap={4} align="stretch">
            {/* Общий прогресс */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="medium">Поиск оптимального CQ</Text>
                <Text color="fg.muted">
                  Итерация {progress?.currentIteration || 0} / {progress?.totalIterations || 6}
                </Text>
              </HStack>
              <Progress.Root value={overallPercent}>
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </Box>

            {/* Текущий этап */}
            <Box p={4} bg="bg.muted" borderRadius="md">
              <HStack gap={3}>
                <LuGauge
                  color="var(--chakra-colors-primary-fg)"
                  style={{ animation: 'spin 2s linear infinite' }}
                />
                <Box>
                  <Text fontWeight="medium">{stageLabels[progress?.stage || 'extracting']}</Text>
                  {progress?.currentCq && (
                    <Text color="fg.muted" fontSize="sm">
                      Тестируем CQ: {progress.currentCq}
                    </Text>
                  )}
                </Box>
              </HStack>
            </Box>

            {/* История итераций */}
            {iterations.length > 0 && (
              <Box>
                <Text fontWeight="medium" mb={2}>
                  История итераций
                </Text>
                <VStack gap={1} align="stretch" maxH="200px" overflowY="auto">
                  {iterations.map((iter) => (
                    <Flex
                      key={iter.cq}
                      justify="space-between"
                      align="center"
                      p={2}
                      bg={iter.vmaf >= targetVmaf ? 'callout.success.bg' : 'bg.muted'}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor={iter.vmaf >= targetVmaf ? 'callout.success.border' : 'border'}
                    >
                      <HStack gap={3}>
                        <Badge colorPalette="purple">CQ {iter.cq}</Badge>
                        <Text fontSize="sm">VMAF:</Text>
                        <Text color={getVmafColor(iter.vmaf)} fontWeight="bold">
                          {iter.vmaf.toFixed(1)}
                        </Text>
                      </HStack>
                      <HStack gap={2}>
                        <Text color="fg.subtle" fontSize="xs">
                          {formatFileSize(iter.size)}
                        </Text>
                        {iter.vmaf >= targetVmaf
                          ? <LuCheck color="var(--chakra-colors-status-success)" />
                          : <LuX color="var(--chakra-colors-status-error)" />}
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        </Dialog.Body>

        <Dialog.Footer>
          <Text color="fg.subtle" fontSize="sm">
            Пожалуйста, подождите. Не закрывайте окно.
          </Text>
        </Dialog.Footer>
      </>
    )
  }

  /** Шаг результата */
  const renderDoneStep = () => {
    if (!result) {
      return null
    }

    const qualityInfo = getCqQuality(result.optimalCq)
    // Вычисляем размер оригинала из экономии
    const originalSize = result.estimatedSavings > 0 ? result.estimatedSize / (1 - result.estimatedSavings) : 0

    return (
      <>
        <Dialog.Body>
          <VStack gap={4} align="stretch">
            {/* Успех */}
            <Box
              p={4}
              bg="callout.success.bg"
              borderRadius="md"
              borderWidth="1px"
              borderColor="callout.success.border"
              textAlign="center"
            >
              <LuCheck
                size={32}
                color="var(--chakra-colors-status-success)"
                style={{ marginBottom: '8px' }}
              />
              <Text fontWeight="bold" fontSize="lg">
                Оптимальный CQ найден!
              </Text>
            </Box>

            {/* Предупреждение о недостижимом целевом VMAF */}
            {result.vmafScore < targetVmaf - 1 && (
              <Box
                p={3}
                bg="callout.warning.bg"
                borderRadius="md"
                borderWidth="1px"
                borderColor="callout.warning.border"
              >
                <HStack gap={2}>
                  <LuTriangleAlert color="var(--chakra-colors-status-warning)" size={20} />
                  <Text fontSize="sm" color="callout.warning.fg">
                    Целевой VMAF {targetVmaf} недостижим для этого контента. Выбран лучший результат:{' '}
                    {result.vmafScore.toFixed(1)}
                  </Text>
                </HStack>
              </Box>
            )}

            {/* Результат */}
            <Box p={4} bg="bg.muted" borderRadius="md">
              <VStack gap={3}>
                <HStack justify="space-between" w="100%">
                  <Text color="fg.muted">Оптимальный CQ:</Text>
                  <HStack>
                    <Text fontSize="2xl" fontWeight="bold" color="primary.fg">
                      {result.optimalCq}
                    </Text>
                    <Badge colorPalette="purple">{qualityInfo.label}</Badge>
                  </HStack>
                </HStack>

                <HStack justify="space-between" w="100%">
                  <Text color="fg.muted">VMAF:</Text>
                  <Text fontSize="xl" fontWeight="bold" color={getVmafColor(result.vmafScore)}>
                    {result.vmafScore.toFixed(1)}
                  </Text>
                </HStack>

                {originalSize > 0 && (
                  <HStack justify="space-between" w="100%">
                    <Text color="fg.muted">Размер оригинала:</Text>
                    <Text fontSize="lg" color="fg.muted">
                      {formatFileSize(originalSize)}
                    </Text>
                  </HStack>
                )}

                <HStack justify="space-between" w="100%">
                  <Text color="fg.muted">Ожидаемый размер:</Text>
                  <Text fontSize="lg" fontWeight="medium">
                    {formatFileSize(result.estimatedSize)}
                  </Text>
                </HStack>

                <HStack justify="space-between" w="100%">
                  <Text color="fg.muted">Экономия:</Text>
                  <Badge colorPalette="green" size="lg">
                    {(result.estimatedSavings * 100).toFixed(0)}%
                  </Badge>
                </HStack>

                <HStack justify="space-between" w="100%">
                  <Text color="fg.muted">Время поиска:</Text>
                  <Text color="fg.muted">{formatTime(result.totalTime)}</Text>
                </HStack>
              </VStack>
            </Box>

            {/* CPU Fallback предупреждение */}
            {result.useCpuFallback && (
              <Box
                p={3}
                bg="callout.warning.bg"
                borderRadius="md"
                borderWidth="1px"
                borderColor="callout.warning.border"
              >
                <HStack gap={2}>
                  <LuCpu color="var(--chakra-colors-status-warning)" size={20} />
                  <Box>
                    <Text fontWeight="medium" color="callout.warning.fg">
                      Переключение на CPU кодирование
                    </Text>
                    <Text fontSize="sm" color="callout.warning.fg">
                      GPU кодирование (NVENC) недоступно для этого контента. Будет использован libsvtav1. При настройке
                      аудио потоков можно выбрать больше потоков, т.к. CPU не занят видео.
                    </Text>
                  </Box>
                </HStack>
              </Box>
            )}

            {/* История итераций */}
            <Box>
              <Text fontWeight="medium" mb={2}>
                История итераций ({result.iterations.length})
              </Text>
              <VStack gap={1} align="stretch" maxH="150px" overflowY="auto">
                {result.iterations.map((iter) => (
                  <Flex
                    key={iter.cq}
                    justify="space-between"
                    align="center"
                    p={2}
                    bg={iter.cq === result.optimalCq ? 'primary.subtle' : 'bg.muted'}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={iter.cq === result.optimalCq ? 'primary.solid' : 'border'}
                  >
                    <HStack gap={3}>
                      <Badge colorPalette={iter.cq === result.optimalCq ? 'purple' : 'gray'}>CQ {iter.cq}</Badge>
                      <Text color={getVmafColor(iter.vmaf)} fontWeight="medium">
                        VMAF {iter.vmaf.toFixed(1)}
                      </Text>
                    </HStack>
                    <Text color="fg.subtle" fontSize="xs">
                      {formatFileSize(iter.size)}
                    </Text>
                  </Flex>
                ))}
              </VStack>
            </Box>
          </VStack>
        </Dialog.Body>

        <Dialog.Footer>
          <HStack gap={2}>
            <Button variant="outline" onClick={() => setStep('config')}>
              Повторить
            </Button>
            <Button colorPalette="purple" onClick={() => onOpenChange(false)}>
              Применить CQ {result.optimalCq}
            </Button>
          </HStack>
        </Dialog.Footer>
      </>
    )
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        // Не закрывать во время поиска
        if (!isSearching) {
          onOpenChange(e.open)
        }
      }}
      size="lg"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.subtle" borderColor="border.subtle">
            <Dialog.Header borderBottomWidth="1px" borderColor="border.subtle">
              <Dialog.Title>
                <HStack>
                  <LuFileVideo color="var(--chakra-colors-primary-fg)" />
                  <Text>VMAF автоподбор качества</Text>
                </HStack>
              </Dialog.Title>
            </Dialog.Header>

            {step === 'config' && renderConfigStep()}
            {step === 'progress' && renderProgressStep()}
            {step === 'done' && renderDoneStep()}

            {!isSearching && (
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
