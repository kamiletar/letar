'use client'

/**
 * ChapterSkipButton — кнопка "Пропустить опенинг/эндинг"
 *
 * Показывается поверх видео когда currentTime попадает
 * в пропускаемый сегмент (OP, ED, RECAP, PREVIEW)
 */

import { Box, Button } from '@chakra-ui/react'
import { useMemo } from 'react'
import { LuSkipForward } from 'react-icons/lu'

import { type Chapter, SKIP_LABELS, SKIPPABLE_CHAPTER_TYPES } from '../types'

export interface ChapterSkipButtonProps {
  /** Список глав */
  chapters: Chapter[]
  /** Текущее время воспроизведения в секундах */
  currentTime: number
  /** Обработчик перехода к endTime главы */
  onSeek?: (time: number) => void
}

/**
 * Кнопка пропуска текущей главы (OP/ED/RECAP/PREVIEW)
 *
 * Позиционируется абсолютно — размести в контейнере с position: relative
 */
export function ChapterSkipButton({ chapters, currentTime, onSeek }: ChapterSkipButtonProps) {
  // Определяем, находимся ли мы в пропускаемой главе — производное значение от chapters/currentTime
  const activeSkipChapter = useMemo(() => {
    if (chapters.length === 0) {
      return null
    }

    const currentChapter = chapters.find(
      (chapter) =>
        chapter.type
        && SKIPPABLE_CHAPTER_TYPES.has(chapter.type)
        && currentTime >= chapter.startTime
        && currentTime < chapter.endTime - 3, // Не показываем если осталось меньше 3 сек
    )

    return currentChapter || null
  }, [chapters, currentTime])

  if (!activeSkipChapter) {
    return null
  }

  const handleSkip = () => {
    if (onSeek) {
      onSeek(activeSkipChapter.endTime)
    }
  }

  return (
    <Box position="absolute" bottom="100px" right="24px" zIndex={20}>
      <Button
        colorPalette="purple"
        size="lg"
        onClick={handleSkip}
        animation="fadeIn 0.3s ease-out"
        boxShadow="0 4px 12px rgba(0, 0, 0, 0.4)"
      >
        <LuSkipForward size={16} style={{ marginRight: 8 }} />
        {activeSkipChapter.type ? SKIP_LABELS[activeSkipChapter.type] : 'Пропустить'}
      </Button>
    </Box>
  )
}
