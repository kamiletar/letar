'use client'

/**
 * ChapterList — read-only список глав для навигации
 *
 * Упрощённая версия ChapterEditor:
 * - Click-to-seek (клик переходит к startTime)
 * - Active chapter highlighting (текущая глава подсвечивается)
 * - Бейджи типов (OP/ED/RECAP/PREVIEW/CHAPTER)
 *
 * Нет: edit, delete, rename, copy, generate, hotkeys
 */

import { Badge, Box, HStack, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'

import type { Chapter, PlayerChapterType } from '../types'
import { formatTime } from '../utils/format-time'

export interface ChapterListProps {
  /** Список глав */
  chapters: Chapter[]
  /** Текущее время воспроизведения (секунды) */
  currentTime: number
  /** Длительность видео (секунды) */
  duration: number
  /** Обработчик перехода к главе */
  onSeek?: (time: number) => void
}

/** Цвета бейджей по типу главы */
const CHAPTER_TYPE_COLORS: Record<PlayerChapterType, string> = {
  OP: 'purple',
  ED: 'blue',
  RECAP: 'orange',
  PREVIEW: 'cyan',
  CHAPTER: 'gray',
}

/** Короткие названия типов */
const CHAPTER_TYPE_LABELS: Record<PlayerChapterType, string> = {
  OP: 'OP',
  ED: 'ED',
  RECAP: 'Recap',
  PREVIEW: 'Preview',
  CHAPTER: 'Chapter',
}

/**
 * Read-only список глав для навигации по видео
 */
export function ChapterList({ chapters, currentTime, duration: _duration, onSeek }: ChapterListProps) {
  // Определяем индекс текущей главы
  const activeChapterIndex = useMemo(() => {
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentTime >= chapters[i].startTime) {
        return i
      }
    }
    return -1
  }, [chapters, currentTime])

  if (chapters.length === 0) {
    return (
      <Box py={4} textAlign="center">
        <Text fontSize="sm" color="fg.subtle">
          Нет глав
        </Text>
      </Box>
    )
  }

  return (
    <VStack gap={1} align="stretch">
      {chapters.map((chapter, index) => {
        const isActive = index === activeChapterIndex

        return (
          <HStack
            key={chapter.id}
            as="button"
            onClick={() => onSeek?.(chapter.startTime)}
            gap={3}
            px={3}
            py={2}
            borderRadius="md"
            bg={isActive ? 'purple.500/20' : 'transparent'}
            borderWidth="1px"
            borderColor={isActive ? 'purple.500/40' : 'transparent'}
            cursor="pointer"
            textAlign="left"
            transition="all 0.15s"
            _hover={{ bg: isActive ? 'purple.500/30' : 'whiteAlpha.100' }}
            w="full"
          >
            {/* Тип главы */}
            {chapter.type && (
              <Badge size="sm" colorPalette={CHAPTER_TYPE_COLORS[chapter.type]} variant="subtle" flexShrink={0}>
                {CHAPTER_TYPE_LABELS[chapter.type]}
              </Badge>
            )}

            {/* Название */}
            <Text fontSize="sm" color={isActive ? 'fg' : 'fg.subtle'} flex={1} lineClamp={1}>
              {chapter.title}
            </Text>

            {/* Время */}
            <Text fontSize="xs" color="fg.subtle" fontFamily="mono" flexShrink={0}>
              {formatTime(chapter.startTime)}
            </Text>
          </HStack>
        )
      })}
    </VStack>
  )
}
