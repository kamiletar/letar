'use client'

/**
 * Компонент лога с прогресс-баром для длительных операций
 *
 * Показывает progress bar + скроллящийся лог записей с иконками статуса.
 * Используется для регенерации манифестов и аудита хранилища.
 */

import { Box, HStack, Progress, Spinner, Text, VStack } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { LuCheck, LuX } from 'react-icons/lu'

export interface ProgressLogEntry {
  /** Название элемента (аниме, шаг) */
  name: string
  /** Статус обработки */
  status: 'processing' | 'ok' | 'error'
  /** Сообщение об ошибке */
  error?: string
}

export interface ProgressLogProps {
  /** Записи лога */
  entries: ProgressLogEntry[]
  /** Прогресс (current/total) */
  progress?: { current: number; total: number }
  /** Операция выполняется */
  isRunning: boolean
  /** Максимальная высота лога */
  maxH?: string
}

export function ProgressLog({ entries, progress, isRunning, maxH = '300px' }: ProgressLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Автопрокрутка к последней записи
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  if (entries.length === 0 && !isRunning) {
    return null
  }

  const percent = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <VStack align="stretch" gap={2}>
      {/* Прогресс-бар */}
      {progress && progress.total > 0 && (
        <HStack gap={3}>
          <Progress.Root value={percent} flex={1} size="sm" colorPalette={isRunning ? 'blue' : 'green'}>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
            {progress.current}/{progress.total}
          </Text>
        </HStack>
      )}

      {/* Лог записей */}
      <Box ref={scrollRef} maxH={maxH} overflowY="auto" borderWidth="1px" borderRadius="md" p={2}>
        <VStack align="stretch" gap={1}>
          {entries.map((entry, i) => (
            <HStack key={i} gap={2} fontSize="xs">
              {/* Иконка статуса */}
              {entry.status === 'processing' && <Spinner size="xs" />}
              {entry.status === 'ok' && <LuCheck color="var(--chakra-colors-green-500)" size={12} />}
              {entry.status === 'error' && <LuX color="var(--chakra-colors-red-500)" size={12} />}

              {/* Текст */}
              <Text color={entry.status === 'error' ? 'fg.error' : 'fg'} lineClamp={1} flex={1}>
                {entry.name}
              </Text>

              {/* Ошибка */}
              {entry.error && (
                <Text color="fg.error" fontSize="2xs" lineClamp={1} maxW="50%">
                  {entry.error}
                </Text>
              )}
            </HStack>
          ))}
        </VStack>
      </Box>
    </VStack>
  )
}
