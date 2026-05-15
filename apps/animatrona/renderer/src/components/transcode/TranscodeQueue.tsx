'use client'

import { Box, Card, HStack, Icon, Progress, Text, VStack } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { LuCheck, LuClock, LuFileVideo, LuLoader, LuX } from 'react-icons/lu'

import type { FileItem } from '@/hooks/useTranscode'

interface TranscodeQueueProps {
  files: FileItem[]
}

/**
 * Очередь транскодирования с прогрессом
 */
export function TranscodeQueue({ files }: TranscodeQueueProps) {
  // Мемоизация вычислений — пересчитываются только при изменении files
  const { completedCount, totalCount, currentFile, overallProgress } = useMemo(() => {
    const completed = files.filter((f) => f.status === 'completed').length
    const total = files.length
    const current = files.find((f) => f.status === 'transcoding')
    return {
      completedCount: completed,
      totalCount: total,
      currentFile: current,
      overallProgress: (completed / total) * 100,
    }
  }, [files])

  return (
    <VStack gap={4} align="stretch">
      {/* Общий прогресс */}
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <HStack justify="space-between" mb={3}>
            <Text fontWeight="medium">Общий прогресс</Text>
            <Text color="fg.muted">
              {completedCount} / {totalCount} файлов
            </Text>
          </HStack>
          <Progress.Root value={overallProgress} size="lg">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Card.Body>
      </Card.Root>

      {/* Текущий файл */}
      {currentFile && (
        <Card.Root bg="purple.900" border="1px" borderColor="purple.700">
          <Card.Body>
            <HStack gap={4}>
              <Box p={3} borderRadius="lg" bg="purple.800">
                <Icon as={LuLoader} boxSize={6} className="animate-spin" />
              </Box>
              <Box flex={1}>
                <Text fontWeight="medium">{currentFile.name}</Text>
                <HStack gap={4} mt={2}>
                  <Progress.Root value={currentFile.progress || 0} size="sm" flex={1}>
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                  <Text fontSize="sm" w="50px" textAlign="right">
                    {currentFile.progress?.toFixed(0)}%
                  </Text>
                </HStack>
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>
      )}

      {/* Список файлов */}
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body p={0}>
          <VStack gap={0} align="stretch" divideY="1px" divideColor="border.subtle">
            {files.map((file) => (
              <HStack key={file.path} p={4} gap={4}>
                <StatusIcon status={file.status} />
                <Box flex={1}>
                  <Text fontWeight="medium" color={file.status === 'completed' ? 'green.400' : 'white'}>
                    {file.name}
                  </Text>
                  {file.error && (
                    <Text fontSize="sm" color="red.400">
                      {file.error}
                    </Text>
                  )}
                </Box>
                <StatusText status={file.status} progress={file.progress} />
              </HStack>
            ))}
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

/** Мемоизированная иконка статуса — не ререндерится при изменении других файлов */
const StatusIcon = memo(function StatusIcon({ status }: { status: FileItem['status'] }) {
  switch (status) {
    case 'pending':
      return <Icon as={LuClock} color="fg.subtle" boxSize={5} />
    case 'analyzing':
    case 'transcoding':
      return <Icon as={LuLoader} color="purple.400" boxSize={5} className="animate-spin" />
    case 'ready':
      return <Icon as={LuFileVideo} color="blue.400" boxSize={5} />
    case 'completed':
      return <Icon as={LuCheck} color="green.400" boxSize={5} />
    case 'error':
      return <Icon as={LuX} color="red.400" boxSize={5} />
  }
})

/** Мемоизированный текст статуса — не ререндерится при изменении других файлов */
const StatusText = memo(function StatusText({ status, progress }: { status: FileItem['status']; progress?: number }) {
  switch (status) {
    case 'pending':
      return (
        <Text fontSize="sm" color="fg.subtle">
          В очереди
        </Text>
      )
    case 'analyzing':
      return (
        <Text fontSize="sm" color="blue.400">
          Анализ...
        </Text>
      )
    case 'ready':
      return (
        <Text fontSize="sm" color="blue.400">
          Готов
        </Text>
      )
    case 'transcoding':
      return (
        <Text fontSize="sm" color="purple.400">
          {progress?.toFixed(0)}%
        </Text>
      )
    case 'completed':
      return (
        <Text fontSize="sm" color="green.400">
          Завершено
        </Text>
      )
    case 'error':
      return (
        <Text fontSize="sm" color="red.400">
          Ошибка
        </Text>
      )
  }
})
