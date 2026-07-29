'use client'

/**
 * Диалог восстановления дорожек из исходных MKV файлов
 *
 * Flow: folder → matching → probing → comparison → processing (main process) → done
 */

import {
  Badge,
  Box,
  Button,
  Dialog,
  HStack,
  Icon,
  Portal,
  Progress,
  Slider,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuCaptions, LuCheck, LuCircleAlert, LuLoader, LuMusic, LuWrench, LuX } from 'react-icons/lu'

import { DonorFolderStep } from '../add-tracks/DonorFolderStep'
import { FileMatchingStep } from '../add-tracks/FileMatchingStep'
import { ComparisonStep } from './ComparisonStep'

import { type EpisodeWithTracks, useRestoreTracksFlow } from '@/lib/restore-tracks/use-restore-tracks-flow'
import type { RestoreProgress, RestoreTaskDetail } from '../../../../shared/types/restore-tracks'

interface RestoreTracksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  animeId: string
  animeName: string
  animeFolderPath: string
  episodes: EpisodeWithTracks[]
}

export function RestoreTracksDialog({
  open,
  onOpenChange,
  animeId,
  animeName,
  animeFolderPath,
  episodes,
}: RestoreTracksDialogProps) {
  const {
    restoreStage,
    addTracksState,
    comparison,
    isRegenerating,
    libraryEpisodes,
    restoreProgress,
    setRestoreProgress,
    setRestoreStage,

    handleScanFolder,
    updateMatchManually,
    probeAndCompare,
    confirmAndProcess,
    cancel,
    regenerateManifests,
    reset,
    setConcurrency,
  } = useRestoreTracksFlow({
    animeId,
    animeName,
    animeFolderPath,
    allEpisodes: episodes,
  })

  // Concurrency для UI ползунка (локальный state)
  const [concurrency, setConcurrencyLocal] = useState(4)

  // Сбрасываем при закрытии
  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  // === Автоподстановка donor path из метаданных исходника ===
  useEffect(() => {
    if (!open || addTracksState.donorPath) {
      return
    }
    const api = window.electronAPI
    if (!api?.kubo) {
      return
    }

    // Берём metadataCid первого эпизода
    const epWithMeta = episodes.find((ep) => ep.metadataCid)
    if (!epWithMeta?.metadataCid) {
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const gwResult = await api.kubo.getGatewayUrl()
        if (cancelled || !gwResult.success || !gwResult.data) {
          return
        }

        const res = await fetch(`${gwResult.data}/ipfs/${epWithMeta.metadataCid}`, {
          signal: AbortSignal.timeout(10000),
        })
        if (cancelled || !res.ok) {
          return
        }

        const metadata = (await res.json()) as { ffprobeRaw?: { format?: { filename?: string } } }
        const filename = metadata?.ffprobeRaw?.format?.filename
        if (cancelled || !filename) {
          return
        }

        // Извлекаем parent directory (папку-донор)
        const sep = filename.includes('\\') ? '\\' : '/'
        const parts = filename.split(sep)
        parts.pop()
        const donorFolder = parts.join(sep)

        if (!donorFolder || cancelled) {
          return
        }

        // Проверяем существование папки
        const exists = await api.fs.exists(donorFolder)
        if (cancelled || !exists) {
          return
        }

        // Автоматически запускаем сканирование
        handleScanFolder(donorFolder)
      } catch {
        // Не критично — пользователь выберет вручную
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, episodes, addTracksState.donorPath, handleScanFolder])

  // === Подписка на события main process ===
  useEffect(() => {
    const api = window.electronAPI
    if (!api?.restoreTracks) {
      return
    }

    const unsubProgress = api.restoreTracks.onProgress((progress: RestoreProgress) => {
      setRestoreProgress(progress)
    })

    const unsubCompleted = api.restoreTracks.onCompleted((_progress: RestoreProgress) => {
      void regenerateManifests()
    })

    const unsubCancelled = api.restoreTracks.onCancelled(() => {
      setRestoreStage('done')
    })

    return () => {
      unsubProgress()
      unsubCompleted()
      unsubCancelled()
    }
  }, [setRestoreProgress, regenerateManifests])

  // Не закрываем во время обработки
  const handleClose = useCallback(() => {
    if (restoreStage === 'processing' || isRegenerating) {
      return
    }
    onOpenChange(false)
  }, [restoreStage, isRegenerating, onOpenChange])

  const handleConcurrencyChange = useCallback(
    (value: number) => {
      setConcurrencyLocal(value)
      void setConcurrency(value)
    },
    [setConcurrency]
  )

  const isProcessing = restoreStage === 'processing' && !isRegenerating
  const isDone = restoreStage === 'done'

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size="xl"
      placement="center"
      scrollBehavior="inside"
    >
      <Portal>
        <Dialog.Backdrop bg="overlay.heavy" />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.subtle" borderColor="border">
            <Dialog.Header borderBottomWidth="1px" borderColor="border">
              <HStack gap={2}>
                <Icon as={LuWrench} color="primary.fg" />
                <Dialog.Title>Восстановить дорожки</Dialog.Title>
              </HStack>
              <Dialog.CloseTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isProcessing || isRegenerating}>
                  <LuX />
                </Button>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body py={4}>
              {/* Шаг 1: Выбор папки */}
              {restoreStage === 'folder' &&
                (addTracksState.stage === 'idle' ||
                  addTracksState.stage === 'folder' ||
                  addTracksState.stage === 'scanning') && (
                  <DonorFolderStep
                    donorPath={addTracksState.donorPath}
                    donorFiles={addTracksState.donorFiles}
                    isScanning={addTracksState.stage === 'scanning'}
                    onFolderSelect={handleScanFolder}
                  />
                )}

              {/* Шаг 2: Матчинг */}
              {restoreStage === 'matching' && addTracksState.stage === 'matching' && (
                <FileMatchingStep
                  matches={addTracksState.matches}
                  libraryEpisodes={libraryEpisodes}
                  onMatchChange={updateMatchManually}
                />
              )}

              {/* Шаг 3: Probing */}
              {restoreStage === 'probing' && (
                <VStack py={8}>
                  <Spinner size="lg" color="primary.fg" />
                  <Text color="fg.muted">Анализ дорожек...</Text>
                </VStack>
              )}

              {/* Шаг 4: Сравнение */}
              {restoreStage === 'comparison' && comparison && <ComparisonStep comparison={comparison} />}

              {/* Шаг 5: Обработка (прогресс из main process) */}
              {isProcessing && restoreProgress && (
                <RestoreProcessingView
                  progress={restoreProgress}
                  concurrency={concurrency}
                  onConcurrencyChange={handleConcurrencyChange}
                  onCancel={cancel}
                />
              )}
              {isProcessing && !restoreProgress && (
                <VStack py={8}>
                  <Spinner size="lg" color="primary.fg" />
                  <Text color="fg.muted">Подготовка...</Text>
                </VStack>
              )}

              {/* Регенерация манифестов */}
              {isRegenerating && (
                <VStack py={8}>
                  <Spinner size="lg" color="primary.fg" />
                  <Text color="fg.muted">Регенерация манифестов...</Text>
                </VStack>
              )}

              {/* Шаг 6: Готово */}
              {isDone && !isRegenerating && (
                <VStack gap={6} py={4}>
                  <Box textAlign="center">
                    <VStack gap={3}>
                      <Icon as={LuCheck} boxSize={12} color="status.success" />
                      <Text fontSize="lg" fontWeight="medium" color="status.success">
                        Восстановление завершено!
                      </Text>
                    </VStack>
                  </Box>

                  {restoreProgress && (
                    <Box p={4} bg="success.subtle" borderRadius="lg" borderWidth="1px" borderColor="success.muted">
                      <VStack gap={2}>
                        <Text fontSize="sm" color="success.fg" textAlign="center">
                          Аудио: {restoreProgress.addedAudioTracks}, субтитры: {restoreProgress.addedSubtitleTracks}
                          {restoreProgress.fonts.restored > 0 && `, шрифты: ${restoreProgress.fonts.restored}`}.
                        </Text>
                        <Text fontSize="sm" color="success.fg" textAlign="center">
                          Манифесты регенерированы.
                        </Text>
                      </VStack>
                    </Box>
                  )}
                </VStack>
              )}
            </Dialog.Body>

            <Dialog.Footer borderTopWidth="1px" borderColor="border">
              <HStack justify="flex-end" w="full" gap={2}>
                {!isProcessing && !isRegenerating && (
                  <Button
                    variant={isDone ? 'solid' : 'outline'}
                    colorPalette={isDone ? 'purple' : undefined}
                    onClick={handleClose}
                  >
                    {isDone ? (
                      <>
                        <Icon as={LuCheck} mr={1} />
                        Готово
                      </>
                    ) : (
                      'Отмена'
                    )}
                  </Button>
                )}

                {addTracksState.stage === 'matching' && restoreStage === 'matching' && (
                  <Button
                    colorPalette="purple"
                    onClick={probeAndCompare}
                    disabled={!addTracksState.matches.some((m) => m.targetEpisode !== null)}
                  >
                    Сравнить дорожки
                  </Button>
                )}

                {restoreStage === 'comparison' && comparison && comparison.totalTracksToRestore > 0 && (
                  <Button colorPalette="purple" onClick={confirmAndProcess}>
                    Восстановить {comparison.totalTracksToRestore}
                    {comparison.totalMissing.fonts > 0 ? ` (+${comparison.totalMissing.fonts} шрифтов)` : ''}
                  </Button>
                )}
                {restoreStage === 'comparison' &&
                  comparison &&
                  comparison.totalTracksToRestore === 0 &&
                  comparison.totalMissing.fonts > 0 && (
                    <Button colorPalette="purple" onClick={confirmAndProcess}>
                      Восстановить {comparison.totalMissing.fonts} шрифтов
                    </Button>
                  )}
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

// === Компонент прогресса (main process) ===

function RestoreProcessingView({
  progress,
  concurrency,
  onConcurrencyChange,
  onCancel,
}: {
  progress: RestoreProgress
  concurrency: number
  onConcurrencyChange: (v: number) => void
  onCancel: () => void
}) {
  const { tasks, taskDetails } = progress

  return (
    <VStack gap={4} align="stretch" py={4}>
      {/* Ползунок потоков */}
      <Box px={4}>
        <HStack gap={4} justify="center" mb={4}>
          <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">
            Потоков: {concurrency}
          </Text>
          <Slider.Root
            value={[concurrency]}
            min={1}
            max={16}
            step={1}
            onValueChange={(e) => onConcurrencyChange(e.value[0])}
            width="150px"
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumb index={0} />
            </Slider.Control>
          </Slider.Root>
        </HStack>
      </Box>

      {/* Статус */}
      <Box textAlign="center">
        <VStack gap={3}>
          <Icon as={LuLoader} boxSize={12} color="primary.fg" className="animate-spin" />
          <Text fontSize="lg" fontWeight="medium" color="primary.fg">
            Обработка...
          </Text>
        </VStack>
      </Box>

      {/* Общий прогресс */}
      <Box px={4}>
        <HStack justify="space-between" mb={2}>
          <Text fontSize="sm" color="fg.muted">
            Параллельная обработка ({concurrency} потоков)
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {tasks.completed} / {tasks.total}
          </Text>
        </HStack>
        <Progress.Root value={progress.totalPercent} size="lg" colorPalette="purple">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      </Box>

      {/* Список задач */}
      <Box maxH="300px" overflowY="auto" px={4}>
        <VStack gap={2} align="stretch">
          {/* Активные */}
          {taskDetails
            .filter((t) => t.status === 'running')
            .map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          {/* Ожидающие (первые 3) */}
          {taskDetails
            .filter((t) => t.status === 'queued')
            .slice(0, 3)
            .map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          {taskDetails.filter((t) => t.status === 'queued').length > 3 && (
            <Text fontSize="xs" color="fg.subtle" textAlign="center">
              + ещё {taskDetails.filter((t) => t.status === 'queued').length - 3} в очереди
            </Text>
          )}
          {/* Ошибки */}
          {taskDetails
            .filter((t) => t.status === 'error')
            .map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
        </VStack>
      </Box>

      {/* Статистика */}
      <Box p={4} bg="bg.muted" borderRadius="lg" borderWidth="1px" borderColor="border">
        <HStack gap={8} justify="center">
          <VStack gap={1}>
            <HStack gap={2}>
              <Icon as={LuMusic} color="accent.fg" boxSize={6} />
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {progress.addedAudioTracks}
              </Text>
            </HStack>
            <Text fontSize="sm" color="fg.subtle">
              аудиодорожек
            </Text>
          </VStack>
          <VStack gap={1}>
            <HStack gap={2}>
              <Icon as={LuCaptions} color="success.fg" boxSize={6} />
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {progress.addedSubtitleTracks}
              </Text>
            </HStack>
            <Text fontSize="sm" color="fg.subtle">
              субтитров
            </Text>
          </VStack>
        </HStack>
      </Box>

      {/* Кнопка отмены */}
      <Box textAlign="center">
        <Button size="sm" variant="outline" colorPalette="red" onClick={onCancel}>
          Отменить
        </Button>
      </Box>
    </VStack>
  )
}

/** Один элемент задачи в списке */
function TaskItem({ task }: { task: RestoreTaskDetail }) {
  const phaseLabels: Record<string, string> = {
    waiting: 'Ожидание',
    extract: 'Извлечение',
    transcode: 'Транскодирование',
    copy: 'Копирование',
    upload: 'Загрузка в IPFS',
    db: 'Сохранение',
    done: 'Готово',
  }

  const isActive = task.status === 'running'
  const isError = task.status === 'error'
  const color = isError ? 'red' : isActive ? 'purple' : 'gray'

  return (
    <Box p={2} borderWidth="1px" borderColor={`${color}.700`} borderRadius="md" bg={`${color}.900/20`}>
      <HStack gap={2} mb={isActive ? 1 : 0}>
        <Icon
          as={isError ? LuCircleAlert : isActive ? LuLoader : LuCheck}
          boxSize={4}
          color={`${color}.400`}
          className={isActive ? 'animate-spin' : ''}
        />
        <Text fontSize="xs" color="fg.muted" flex={1} lineClamp={1}>
          {task.fileName}
        </Text>
        {/* Индикатор stale: нет обновлений прогресса > 60с */}
        {isActive && task.lastProgressMs != null && task.lastProgressMs > 60_000 && (
          <Badge size="sm" colorPalette="orange" variant="subtle">
            ⏱ {Math.round(task.lastProgressMs / 1000)}с
          </Badge>
        )}
        <Badge size="sm" colorPalette={color}>
          {isError ? 'Ошибка' : (phaseLabels[task.phase] ?? task.phase)}
        </Badge>
      </HStack>
      {isActive && (
        <Progress.Root value={task.percent} size="xs" colorPalette={color}>
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      )}
      {task.error && (
        <Text fontSize="xs" color="red.400" mt={1}>
          {task.error}
        </Text>
      )}
    </Box>
  )
}
