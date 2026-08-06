'use client'

/**
 * Шаг 4: Обработка — прогресс добавления дорожек
 */

import { Badge, Box, Button, HStack, Icon, Progress, Slider, Text, VStack } from '@chakra-ui/react'
import { LuCaptions, LuCheck, LuCircleAlert, LuLoader, LuMusic, LuX } from 'react-icons/lu'

import type { AddTracksProgress, AddTracksStage, FileProgress } from '@/lib/add-tracks'

interface AddTracksProcessingStepProps {
  /** Текущая стадия */
  stage: AddTracksStage
  /** Прогресс обработки */
  progress: AddTracksProgress
  /** Сообщение об ошибке */
  error: string | null
  /** Обработчик отмены */
  onCancel: () => void
  /** Количество параллельных потоков */
  concurrency: number
  /** Обработчик изменения количества потоков */
  onConcurrencyChange: (value: number) => void
}

/**
 * Иконка и цвет по стадии
 */
function getStageInfo(stage: AddTracksStage): { icon: React.ElementType; color: string; text: string } {
  switch (stage) {
    case 'processing':
      return { icon: LuLoader, color: 'primary.fg', text: 'Обработка...' }
    case 'done':
      return { icon: LuCheck, color: 'status.success', text: 'Готово!' }
    case 'cancelled':
      return { icon: LuX, color: 'status.warning', text: 'Отменено' }
    case 'error':
      return { icon: LuX, color: 'status.error', text: 'Ошибка' }
    default:
      return { icon: LuLoader, color: 'fg.muted', text: 'Подготовка...' }
  }
}

/**
 * Текст фазы обработки
 */
function getPhaseText(phase: AddTracksProgress['phase']): string {
  switch (phase) {
    case 'demux':
      return 'Извлечение дорожек...'
    case 'transcode':
      return 'Транскодирование аудио...'
    case 'copy':
      return 'Копирование файлов...'
    case 'done':
      return 'Завершено'
    default:
      return 'Обработка...'
  }
}

/**
 * Компонент прогресса отдельного файла
 */
function FileProgressItem({ file }: { file: FileProgress }) {
  const getPhaseColor = (phase: FileProgress['phase']) => {
    switch (phase) {
      case 'waiting':
        return 'gray'
      case 'transcode':
      case 'copy':
        return 'purple'
      case 'done':
        return 'green'
      case 'error':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getPhaseIcon = (phase: FileProgress['phase']) => {
    switch (phase) {
      case 'waiting':
        return LuLoader
      case 'transcode':
      case 'copy':
        return LuLoader
      case 'done':
        return LuCheck
      case 'error':
        return LuCircleAlert
      default:
        return LuLoader
    }
  }

  const color = getPhaseColor(file.phase)
  const IconComponent = getPhaseIcon(file.phase)
  const isActive = file.phase === 'transcode' || file.phase === 'copy'

  return (
    <Box p={2} borderWidth="1px" borderColor={`${color}.700`} borderRadius="md" bg={`${color}.900/20`}>
      <HStack gap={2} mb={1}>
        <Icon as={IconComponent} boxSize={4} color={`${color}.400`} className={isActive ? 'animate-spin' : ''} />
        <Text fontSize="xs" color="fg.muted" flex={1} lineClamp={1}>
          {file.fileName}
        </Text>
        <Badge size="sm" colorPalette={color}>
          {file.phase === 'waiting' && 'Ожидание'}
          {file.phase === 'transcode' && 'Транскодирование'}
          {file.phase === 'copy' && 'Копирование'}
          {file.phase === 'done' && 'Готово'}
          {file.phase === 'error' && 'Ошибка'}
        </Badge>
      </HStack>
      {isActive && (
        <Progress.Root value={file.percent} size="xs" colorPalette={color}>
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      )}
      {file.error && (
        <Text fontSize="xs" color="red.400" mt={1}>
          {file.error}
        </Text>
      )}
    </Box>
  )
}

/**
 * Шаг обработки с прогрессом
 */
export function AddTracksProcessingStep({
  stage,
  progress,
  error,
  onCancel,
  concurrency,
  onConcurrencyChange,
}: AddTracksProcessingStepProps) {
  const stageInfo = getStageInfo(stage)
  const isProcessing = stage === 'processing'
  const isDone = stage === 'done'
  const isError = stage === 'error' || stage === 'cancelled'

  // Процент прогресса
  const percent = progress.totalFiles > 0 ? (progress.currentFile / progress.totalFiles) * 100 : 0

  return (
    <VStack gap={6} align="stretch" py={4}>
      {/* Настройка потоков — показываем всё время обработки */}
      {isProcessing && (
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
      )}

      {/* Статус */}
      <Box textAlign="center">
        <VStack gap={3}>
          <Icon
            as={stageInfo.icon}
            boxSize={12}
            color={stageInfo.color}
            className={isProcessing ? 'animate-spin' : ''}
          />
          <Text fontSize="lg" fontWeight="medium" color={stageInfo.color}>
            {stageInfo.text}
          </Text>
        </VStack>
      </Box>

      {/* Прогресс-бар общий */}
      {isProcessing && progress.fileProgress.length === 0 && (
        <Box px={4}>
          <VStack gap={2}>
            <Progress.Root value={percent} size="lg" colorPalette="purple">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>

            <HStack justify="space-between" w="full">
              <Text fontSize="sm" color="fg.muted">
                {progress.currentFileName || getPhaseText(progress.phase)}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {progress.currentFile} / {progress.totalFiles}
              </Text>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* Параллельный прогресс каждого файла */}
      {isProcessing && progress.fileProgress.length > 0 && (
        <Box px={4}>
          <VStack gap={2} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" color="fg.muted">
                Параллельная обработка ({progress.concurrency} потоков)
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {progress.fileProgress.filter((f) => f.phase === 'done').length} / {progress.fileProgress.length}
              </Text>
            </HStack>

            {/* Общий прогресс */}
            <Progress.Root
              value={(progress.fileProgress.filter((f) => f.phase === 'done').length / progress.fileProgress.length)
                * 100}
              size="lg"
              colorPalette="purple"
            >
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>

            {/* Список файлов (активные сверху) */}
            <Box maxH="300px" overflowY="auto" pr={2}>
              <VStack gap={2} align="stretch">
                {/* Активные файлы */}
                {progress.fileProgress
                  .filter((f) => f.phase === 'transcode' || f.phase === 'copy')
                  .map((file) => <FileProgressItem key={file.id} file={file} />)}
                {/* Ожидающие */}
                {progress.fileProgress
                  .filter((f) => f.phase === 'waiting')
                  .slice(0, 3)
                  .map((file) => <FileProgressItem key={file.id} file={file} />)}
                {progress.fileProgress.filter((f) => f.phase === 'waiting').length > 3 && (
                  <Text fontSize="xs" color="fg.subtle" textAlign="center">
                    + ещё {progress.fileProgress.filter((f) =>
                      f.phase === 'waiting'
                    ).length - 3} в очереди
                  </Text>
                )}
                {/* Завершённые (последние 3) */}
                {progress.fileProgress
                  .filter((f) => f.phase === 'done')
                  .slice(-3)
                  .map((file) => <FileProgressItem key={file.id} file={file} />)}
                {/* Ошибки */}
                {progress.fileProgress
                  .filter((f) => f.phase === 'error')
                  .map((file) => <FileProgressItem key={file.id} file={file} />)}
              </VStack>
            </Box>
          </VStack>
        </Box>
      )}

      {/* Статистика добавленных дорожек */}
      {(isDone || isProcessing) && (
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
      )}

      {/* Сообщение об ошибке */}
      {isError && error && (
        <Box p={4} bg="error.subtle" borderRadius="lg" borderWidth="1px" borderColor="error.muted">
          <Text fontSize="sm" color="error.fg">
            {error}
          </Text>
        </Box>
      )}

      {/* Сообщение об отмене */}
      {stage === 'cancelled' && (
        <Box p={4} bg="warning.subtle" borderRadius="lg" borderWidth="1px" borderColor="warning.muted">
          <Text fontSize="sm" color="warning.fg" textAlign="center">
            Обработка была отменена. Часть дорожек могла быть добавлена.
          </Text>
        </Box>
      )}

      {/* Сообщение об успехе */}
      {isDone && (
        <Box p={4} bg="success.subtle" borderRadius="lg" borderWidth="1px" borderColor="success.muted">
          <Text fontSize="sm" color="success.fg" textAlign="center">
            Дорожки успешно добавлены! Теперь они доступны в плеере.
          </Text>
        </Box>
      )}

      {/* Кнопка отмены */}
      {isProcessing && (
        <Box textAlign="center">
          <Button size="sm" variant="outline" colorPalette="red" onClick={onCancel}>
            Отменить
          </Button>
        </Box>
      )}
    </VStack>
  )
}
