'use client'

/**
 * ChapterMarkers - Компонент отображения глав и кнопок пропуска
 *
 * Отображает:
 * - Маркеры глав на прогресс-баре
 * - Кнопку "Пропустить опенинг/эндинг" при приближении к этим сегментам
 */

import { Box, Button, Icon } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
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
  const [activeSkipChapter, setActiveSkipChapter] = useState<Chapter | null>(null)

  // Определяем, находимся ли мы в пропускаемой главе
  useEffect(() => {
    if (!showSkipButton || chapters.length === 0) {
      setActiveSkipChapter(null)
      return
    }

    // Находим текущую главу
    const currentChapter = chapters.find(
      (chapter) =>
        chapter.type
        && SKIPPABLE_TYPES.has(chapter.type)
        && currentTime >= chapter.startTime
        && currentTime < chapter.endTime - 3, // Не показываем если осталось меньше 3 сек
    )

    setActiveSkipChapter(currentChapter || null)
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
        <Icon as={LuSkipForward} mr={2} />
        {activeSkipChapter.type ? SKIP_LABELS[activeSkipChapter.type] : 'Пропустить'}
      </Button>
    </Box>
  )
}

/**
 * Определяет главы автоматически по названию или времени
 *
 * Эвристики:
 * - Первые 90-120 сек обычно опенинг
 * - Последние 60-90 сек обычно эндинг
 * - Названия содержащие "OP", "Opening", "ED", "Ending"
 */
export function detectChapterTypes(chapters: Chapter[], duration: number): Chapter[] {
  return chapters.map((chapter) => {
    // Если тип уже определён
    if (chapter.type) {
      return chapter
    }

    const title = chapter.title.toLowerCase()
    const chapterDuration = chapter.endTime - chapter.startTime

    // Определение по названию
    if (title.includes('opening') || title.includes('op') || title.includes('опенинг')) {
      return { ...chapter, type: 'OP' as PlayerChapterType }
    }
    if (title.includes('ending') || title.includes('ed') || title.includes('эндинг')) {
      return { ...chapter, type: 'ED' as PlayerChapterType }
    }
    if (title.includes('recap') || title.includes('ретроспектива') || title.includes('previously')) {
      return { ...chapter, type: 'RECAP' as PlayerChapterType }
    }
    if (title.includes('preview') || title.includes('превью') || title.includes('next')) {
      return { ...chapter, type: 'PREVIEW' as PlayerChapterType }
    }

    // Определение по позиции и длительности
    // Опенинг: в начале, 60-120 сек
    if (chapter.startTime < 180 && chapterDuration >= 60 && chapterDuration <= 150) {
      return { ...chapter, type: 'OP' as PlayerChapterType }
    }

    // Эндинг: в конце, 60-120 сек
    if (chapter.endTime > duration - 180 && chapterDuration >= 60 && chapterDuration <= 150) {
      return { ...chapter, type: 'ED' as PlayerChapterType }
    }

    return { ...chapter, type: 'CHAPTER' as PlayerChapterType }
  })
}
