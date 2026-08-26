'use client'

/**
 * CTA кнопка "Продолжить просмотр" / "Начать смотреть" / "Пересмотреть"
 *
 * В трекере прогресс будет из БД (WatchProgress модель).
 * Пока — заглушка "Начать смотреть" для первого эпизода.
 * После реализации WatchProgress — читать из сервера.
 */

import { Button } from '@chakra-ui/react'
import Link from 'next/link'
import { LuPlay } from 'react-icons/lu'

interface ContinueWatchingButtonProps {
  /** ID аниме в трекере (shikimoriId или CUID) */
  animeSlug: string
  episodes: Array<{ number: number; name?: string; duration: number }>
  /** Прогресс из БД: episodeNumber → { currentTime, percent } */
  watchProgress?: Record<number, { currentTime: number; percent: number }>
}

/** Форматирует время в MM:SS */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface PlayTarget {
  episodeNumber: number
  label: string
}

/** Определяет целевой эпизод и текст кнопки */
function getPlayTarget(
  episodes: ContinueWatchingButtonProps['episodes'],
  progress?: Record<number, { currentTime: number; percent: number }>,
): PlayTarget | null {
  if (episodes.length === 0) {
    return null
  }

  const sortedEps = [...episodes].sort((a, b) => a.number - b.number)

  if (progress && Object.keys(progress).length > 0) {
    // Ищем последний незавершённый эпизод (>10 сек просмотрено, <90% завершено)
    for (const ep of sortedEps) {
      const p = progress[ep.number]
      if (p && p.currentTime > 10 && p.percent < 90) {
        return {
          episodeNumber: ep.number,
          label: `Продолжить Эп.${ep.number} — ${formatTime(p.currentTime)}`,
        }
      }
    }

    // Ищем первый непросмотренный (нет прогресса или <10%)
    for (const ep of sortedEps) {
      const p = progress[ep.number]
      if (!p || p.percent < 10) {
        return { episodeNumber: ep.number, label: `Смотреть Эп.${ep.number}` }
      }
    }

    // Все просмотрены — предлагаем пересмотреть
    return { episodeNumber: 1, label: 'Пересмотреть' }
  }

  // Нет прогресса — начать с первого
  return { episodeNumber: sortedEps[0].number, label: 'Начать смотреть' }
}

export function ContinueWatchingButton({ animeSlug, episodes, watchProgress }: ContinueWatchingButtonProps) {
  const target = getPlayTarget(episodes, watchProgress)

  if (!target) {
    return (
      <Button colorPalette="purple" size={{ base: 'md', md: 'lg' }} disabled>
        <LuPlay />
        Нет эпизодов
      </Button>
    )
  }

  return (
    <Link href={`/watch/${animeSlug}/${target.episodeNumber}`}>
      <Button colorPalette="purple" size={{ base: 'md', md: 'lg' }}>
        <LuPlay />
        {target.label}
      </Button>
    </Link>
  )
}
