'use client'

/**
 * Grid карточек эпизодов с прогрессом просмотра
 *
 * Неавторизованным пользователям доступен только 1-й эпизод.
 * Остальные показываются с замком и ссылкой на авторизацию.
 */

import { SimpleGrid } from '@chakra-ui/react'

import type { EpisodePreviewData } from '@/lib/manifest-loader'

import { EpisodeCard } from './episode-card'

interface EpisodesGridProps {
  episodes: Array<{ number: number; name?: string; duration: number }>
  /** ID аниме в трекере (shikimoriId или CUID) для URL */
  animeSlug: string
  /** Маппинг номер эпизода → данные превью (thumbnails + screenshots) */
  previewMap?: Map<number, EpisodePreviewData>
  /** Маппинг номер эпизода → процент просмотра (0-100) */
  progressMap?: Record<number, number>
  /** Авторизован ли пользователь (неавторизованным доступен только 1-й эпизод) */
  isAuthenticated?: boolean
  /** CID директории аниме в IPFS (для загрузки episode manifest) */
  directoryCid?: string | null
}

export function EpisodesGrid({
  episodes,
  animeSlug,
  previewMap,
  progressMap,
  isAuthenticated = true,
  directoryCid,
}: EpisodesGridProps) {
  return (
    <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={4}>
      {episodes.map((episode) => {
        const preview = previewMap?.get(episode.number)
        return (
          <EpisodeCard
            key={episode.number}
            number={episode.number}
            name={episode.name}
            duration={episode.duration}
            animeSlug={animeSlug}
            watchPercent={progressMap?.[episode.number] ?? 0}
            thumbnailCids={preview?.thumbnailCids}
            screenshotCids={preview?.screenshotCids}
            directoryCid={directoryCid}
            isLocked={!isAuthenticated && episode.number > 1}
          />
        )
      })}
    </SimpleGrid>
  )
}
