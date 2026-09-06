'use client'

/**
 * ChapterMarkers - Компонент отображения глав и кнопок пропуска
 *
 * Отображает:
 * - Маркеры глав на прогресс-баре
 * - Кнопку "Пропустить опенинг/эндинг" при приближении к этим сегментам
 */

import { Box, Button } from '@chakra-ui/react'
import { useMemo } from 'react'
import { LuSkipForward } from 'react-icons/lu'

/** Тип главы для плеера (UPPERCASE) */
export type PlayerChapterType = 'OP' | 'ED' | 'RECAP' | 'PREVIEW' | 'CHAPTER'

/** Информация о главе для UI плеера */
export interface Chapter {
  /** Уникальный идентификатор */
  id: string
  /** Название главы */
  title: string
  /** Время начала в секундах */
  startTime: number
  /** Время окончания в секундах */
  endTime: number
  /** Тип главы */
  type?: PlayerChapterType
}

/** Пропсы компонента ChapterMarkers */
export interface ChapterMarkersProps {
  /** Список глав */
  chapters: Chapter[]
  /** Общая длительность видео в секундах */
  duration: number
  /** Текущее время воспроизведения в секундах */
  currentTime: number
  /** Обработчик перехода к главе */
  onSeek?: (time: number) => void
  /** Показывать ли кнопку пропуска */
  showSkipButton?: boolean
}

/** Типы глав, которые можно пропустить */
const SKIPPABLE_TYPES = new Set<PlayerChapterType>(['OP', 'ED', 'RECAP', 'PREVIEW'])

/** Названия для кнопки пропуска по типу */
const SKIP_LABELS: Record<PlayerChapterType, string> = {
  OP: 'Пропустить опенинг',
  ED: 'Пропустить эндинг',
  RECAP: 'Пропустить ретроспективу',
  PREVIEW: 'Пропустить превью',
  CHAPTER: 'Пропустить',
}

/**
 * ChapterMarkers компонент
 */
export function ChapterMarkers({
  chapters,
  duration: _duration,
  currentTime,
  onSeek,
  showSkipButton = true,
}: ChapterMarkersProps) {
  // Определяем, находимся ли мы в пропускаемой главе — чистое производное значение
  // от props, вычисляется в рендере через useMemo, без setState в эффекте
  const activeSkipChapter = useMemo<Chapter | null>(() => {
    if (!showSkipButton || chapters.length === 0) {
      return null
    }

    // Находим текущую главу
    const currentChapter = chapters.find(
      (chapter) =>
        chapter.type
        && SKIPPABLE_TYPES.has(chapter.type)
        && currentTime >= chapter.startTime
        && currentTime < chapter.endTime - 3, // Не показываем если осталось меньше 3 сек
    )

    return currentChapter || null
  }, [chapters, currentTime, showSkipButton])

  /**
   * Пропустить текущую главу
   */
  const handleSkip = () => {
    if (activeSkipChapter && onSeek) {
      onSeek(activeSkipChapter.endTime)
    }
  }

  // Кнопка пропуска показывается только при наличии активной главы для пропуска
  // Маркеры глав теперь рендерятся внутри PlayerControls (в прогресс-баре)
  if (!activeSkipChapter) {
    return null
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
        <LuSkipForward style={{ marginRight: '8px' }} />
        {activeSkipChapter.type ? SKIP_LABELS[activeSkipChapter.type] : 'Пропустить'}
      </Button>
    </Box>
  )
}
