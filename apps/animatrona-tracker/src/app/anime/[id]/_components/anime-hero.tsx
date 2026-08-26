'use client'

/**
 * Hero секция страницы аниме (tracker)
 *
 * Тонкий wrapper над AnimeHeroBase из @letar/animatrona-ui.
 * Маппит tracker-специфичные данные → общие props.
 */

import { Badge, HStack, Text } from '@chakra-ui/react'
import { AnimeHeroBase } from '@letar/animatrona-ui'
import { formatBytes, formatDurationMinutes, getAnimeStatusConfig } from '@letar/animatrona-utils'
import { LuBookOpen, LuEye, LuShare2, LuStar } from 'react-icons/lu'

export interface AnimeHeroProps {
  name: string
  originalName?: string
  year?: number
  status?: string
  kind?: string
  rating?: number
  ageRating?: string
  episodeCount: number
  totalDuration: number
  totalSize: number
  genres?: string[]
  themes?: string[]
  posterUrl?: string
  isBdRemux?: boolean
  /** ID аниме в трекере (shikimoriId или CUID) */
  animeSlug: string
  episodes: Array<{ number: number; name?: string; duration: number }>
  /** Количество уникальных зрителей */
  viewCount?: number
  /** Количество добавлений в библиотеку */
  libraryCount?: number
  /** Средний рейтинг пользователей */
  avgRating?: number | null
  /** Количество онлайн IPFS сидов */
  onlineSeedCount?: number
  /** Слот для CTA кнопки (ContinueWatchingButton) */
  ctaButton?: React.ReactNode
}

export function AnimeHero({
  name,
  originalName,
  year,
  status,
  kind,
  rating,
  ageRating,
  episodeCount,
  totalDuration,
  totalSize,
  genres,
  themes,
  posterUrl,
  isBdRemux,
  viewCount,
  libraryCount,
  avgRating,
  onlineSeedCount,
  ctaButton,
}: AnimeHeroProps) {
  const statusInfo = getAnimeStatusConfig(status)
  const allTags = [...(genres ?? []), ...(themes ?? [])]
  const tagsText = allTags.join(', ')

  return (
    <AnimeHeroBase
      name={name}
      originalName={originalName}
      posterUrl={posterUrl}
      badgesSlot={
        <HStack gap={2} flexWrap="wrap" justify={{ base: 'center', sm: 'start' }}>
          {statusInfo && (
            <Badge colorPalette={statusInfo.colorPalette} size="md">
              {statusInfo.label}
            </Badge>
          )}
          {kind && (
            <Badge colorPalette="purple" variant="subtle">
              {kind}
            </Badge>
          )}
          {rating !== null && rating !== undefined && rating > 0 && (
            <Badge colorPalette="yellow" display="flex" alignItems="center" gap={1}>
              <LuStar size={12} />
              {rating.toFixed(1)}
            </Badge>
          )}
          {ageRating && <Badge variant="subtle">{ageRating}</Badge>}
          {isBdRemux && (
            <Badge colorPalette="green" variant="subtle">
              BD Remux
            </Badge>
          )}
        </HStack>
      }
      metaSlot={
        <HStack gap={2} color="fg.subtle" fontSize="sm" flexWrap="wrap" justify={{ base: 'center', sm: 'start' }}>
          {year && <Text>{year}</Text>}
          {year && <Text>&bull;</Text>}
          <Text>{episodeCount} эп.</Text>
          {totalDuration > 0 && (
            <>
              <Text>&bull;</Text>
              <Text>{formatDurationMinutes(totalDuration)}</Text>
            </>
          )}
          {totalSize > 0 && (
            <>
              <Text>&bull;</Text>
              <Text>{formatBytes(totalSize)}</Text>
            </>
          )}
          {/* Статистика просмотров */}
          {viewCount !== undefined && viewCount > 0 && (
            <>
              <Text>&bull;</Text>
              <HStack gap={1}>
                <LuEye size={14} />
                <Text>{viewCount}</Text>
              </HStack>
            </>
          )}
          {libraryCount !== undefined && libraryCount > 0 && (
            <>
              <Text>&bull;</Text>
              <HStack gap={1}>
                <LuBookOpen size={14} />
                <Text>{libraryCount}</Text>
              </HStack>
            </>
          )}
          {avgRating !== undefined && avgRating !== null && avgRating > 0 && (
            <>
              <Text>&bull;</Text>
              <HStack gap={1}>
                <LuStar size={14} color="var(--chakra-colors-yellow-500)" />
                <Text>{avgRating.toFixed(1)}</Text>
              </HStack>
            </>
          )}
          {/* Онлайн IPFS сиды */}
          {onlineSeedCount !== undefined && onlineSeedCount > 0 && (
            <>
              <Text>&bull;</Text>
              <HStack gap={1}>
                <LuShare2 size={14} color="var(--chakra-colors-green-500)" />
                <Text>
                  {onlineSeedCount} {onlineSeedCount === 1 ? 'сид' : onlineSeedCount < 5 ? 'сида' : 'сидов'}
                </Text>
              </HStack>
            </>
          )}
        </HStack>
      }
      tagsSlot={tagsText
        ? (
          <Text color="fg.muted" fontSize="sm" lineClamp={1}>
            {tagsText}
          </Text>
        )
        : undefined}
      ctaSlot={ctaButton
        ? (
          <HStack mt={3} gap={2} flexWrap="wrap" justify={{ base: 'center', sm: 'start' }}>
            {ctaButton}
          </HStack>
        )
        : undefined}
    />
  )
}
