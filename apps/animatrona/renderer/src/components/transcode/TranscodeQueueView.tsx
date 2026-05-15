'use client'

import { Box, Button, Card, EmptyState, HStack, Icon, Progress, Text, VStack } from '@chakra-ui/react'
import { LuFolder, LuPause, LuPlay, LuPlus } from 'react-icons/lu'

import { useTranscodeManager } from '@/hooks/useTranscodeManager'
import { TranscodeQueueItem } from './TranscodeQueueItem'
import { TranscodeStats } from './TranscodeStats'

/**
 * Полный вид очереди транскодирования
 *
 * Объединяет все компоненты управления очередью:
 * - Общий прогресс
 * - Статистика текущего файла
 * - Список элементов с контролами
 */
export function TranscodeQueueView() {
  const {
    queue,
    isProcessing,
    isLoading,
    pauseAvailable,
    currentItem,
    overallProgress,
    hasItemsToProcess,
    pendingItems,
    completedItems,
    pauseItem,
    resumeItem,
    cancelItem,
    moveItemUp,
    moveItemDown,
    startProcessing,
    pauseAll,
    resumeAll,
    addToQueue,
  } = useTranscodeManager()

  /** Добавить файлы через диалог */
  const handleAddFiles = async () => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    const files = await api.dialog.selectFiles([{ name: 'Видео', extensions: ['mkv', 'mp4', 'avi', 'webm'] }])

    if (files && files.length > 0) {
      for (const file of files) {
        await addToQueue(file)
      }
    }
  }

  /** Добавить папку */
  const handleAddFolder = async () => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    const folder = await api.dialog.selectFolder()
    if (!folder) {
      return
    }

    const result = await api.fs.scanFolder(folder, true)
    if (result.success && result.files.length > 0) {
      for (const file of result.files) {
        await addToQueue(file.path)
      }
    }
  }

  if (isLoading) {
    return (
      <Card.Root bg="bg.panel">
        <Card.Body>
          <VStack py={8}>
            <Text color="fg.muted">Загрузка очереди...</Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  if (queue.length === 0) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <Icon as={LuFolder} boxSize={10} color="fg.subtle" />
              </EmptyState.Indicator>
              <EmptyState.Title>Очередь пуста</EmptyState.Title>
              <EmptyState.Description>Добавьте файлы для транскодирования</EmptyState.Description>
            </EmptyState.Content>
            <HStack gap={2}>
              <Button variant="outline" onClick={handleAddFiles}>
                <LuPlus />
                Добавить файлы
              </Button>
              <Button variant="outline" onClick={handleAddFolder}>
                <LuFolder />
                Добавить папку
              </Button>
            </HStack>
          </EmptyState.Root>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <VStack gap={4} align="stretch">
      {/* Общий прогресс и управление */}
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <HStack justify="space-between" mb={4}>
            <VStack align="start" gap={0}>
              <Text fontWeight="medium">Общий прогресс</Text>
              <Text fontSize="sm" color="fg.muted">
                {completedItems.length} / {queue.length} файлов
              </Text>
            </VStack>

            <HStack gap={2}>
              {/* Добавить файлы */}
              <Button size="sm" variant="ghost" onClick={handleAddFiles} disabled={isProcessing}>
                <LuPlus />
                Добавить
              </Button>

              {/* Пауза/Возобновление всего */}
              {isProcessing && pauseAvailable && (
                <Button size="sm" variant="outline" colorPalette="yellow" onClick={pauseAll}>
                  <LuPause />
                  Пауза
                </Button>
              )}

              {/* Возобновить всё */}
              {!isProcessing && hasItemsToProcess && (
                <Button size="sm" colorPalette="green" onClick={resumeAll}>
                  <LuPlay />
                  Продолжить
                </Button>
              )}

              {/* Начать обработку */}
              {!isProcessing && pendingItems.length > 0 && (
                <Button size="sm" colorPalette="purple" onClick={startProcessing}>
                  <LuPlay />
                  Начать
                </Button>
              )}
            </HStack>
          </HStack>

          {/* Прогресс бар */}
          <Progress.Root value={overallProgress} size="lg">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Card.Body>
      </Card.Root>

      {/* Статистика текущего файла */}
      {currentItem?.progress && (
        <Box>
          <Text fontSize="sm" color="fg.muted" mb={2}>
            Статистика: {currentItem.fileName}
          </Text>
          <TranscodeStats progress={currentItem.progress} inputSize={currentItem.demuxResult?.metadata?.totalSize} />
        </Box>
      )}

      {/* Список элементов очереди */}
      <VStack gap={2} align="stretch">
        {queue.map((item, index) => (
          <TranscodeQueueItem
            key={item.id}
            item={item}
            pauseAvailable={pauseAvailable}
            canMoveUp={index > 0 && (item.status === 'pending' || item.status === 'ready')}
            canMoveDown={index < queue.length - 1 && (item.status === 'pending' || item.status === 'ready')}
            onPause={() => pauseItem(item.id)}
            onResume={() => resumeItem(item.id)}
            onCancel={() => cancelItem(item.id)}
            onMoveUp={() => moveItemUp(item.id)}
            onMoveDown={() => moveItemDown(item.id)}
          />
        ))}
      </VStack>
    </VStack>
  )
}
