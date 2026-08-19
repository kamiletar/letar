'use client'

import { AGE_RATING_CONFIG } from '@/lib/age-rating'
import { resolveImageUrl } from '@/lib/ipfs'
import { Badge, Box, HStack, Icon, Image, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuCheck, LuEye, LuLayers, LuStar, LuUser } from 'react-icons/lu'

import type { WatchProgressSummaryItem } from '@/app/api/watch-progress/summary/route'

/** Данные аниме для карточки */
export interface AnimeCardItem {
  id: string
  title: string
  titleOriginal?: string | null
  coverUrl: string | null
  shikimoriId?: number | null
  franchiseKey?: string | null
  year: number | null
  studio?: string | null
  director?: string | null
  genres: string[]
  createdAt?: Date
  viewCount?: number
  avgRating?: number | null
  _count: {
    episodes: number
  }
  ageRating?: string | null
  uploadedBy?: {
    id: string
    name: string | null
  }
}

export interface AnimeCardProps {
  anime: AnimeCardItem
  /** Прогресс просмотра (если есть) */
  progress?: WatchProgressSummaryItem
  /** Количество тайтлов во франшизе (если представитель) */
  franchiseCount?: number
}

/** Карточка аниме — переиспользуемый компонент для каталога и профиля */
export function AnimeCard({ anime, progress, franchiseCount }: AnimeCardProps) {
  const coverUrl = resolveImageUrl(anime.coverUrl)
  const isFranchise = franchiseCount && franchiseCount > 1
  const slug = anime.shikimoriId ?? anime.id
  const href = isFranchise ? `/anime/franchise/${anime.id}` : `/anime/${slug}`

  const hasProgress = progress && (progress.watchedEpisodes > 0 || progress.lastEpisode !== null)
  const totalEpisodes = anime._count.episodes
  const overallProgress = hasProgress && totalEpisodes > 0
    ? Math.min(
      Math.round(
        ((progress.watchedEpisodes + (progress.lastEpisodeProgress > 0 ? progress.lastEpisodeProgress / 100 : 0))
          / totalEpisodes)
          * 100,
      ),
      100,
    )
    : 0

  return (
    <NextLink href={href}>
      <Box
        borderRadius="xl"
        overflow="hidden"
        borderWidth="1px"
        bg="bg.panel"
        transitionProperty="box-shadow, border-color"
        transitionDuration="0.2s"
        _hover={{ shadow: 'lg', borderColor: isFranchise ? 'purple.500' : 'brand.500' }}
      >
        {/* Постер */}
        <Box position="relative" aspectRatio="2/3" bg="bg.muted">
          <Image src={coverUrl} alt={anime.title} objectFit="cover" w="100%" h="100%" />

          {hasProgress && (
            <Badge
              position="absolute"
              top={2}
              left={2}
              bg="blackAlpha.700"
              color="white"
              size="sm"
              display="flex"
              alignItems="center"
              gap={1}
            >
              {progress.watchedEpisodes === totalEpisodes
                ? (
                  <>
                    <Icon as={LuCheck} boxSize={3} />
                    Просмотрено
                  </>
                )
                : (
                  `${progress.watchedEpisodes}/${totalEpisodes} эп.`
                )}
            </Badge>
          )}

          {isFranchise && (
            <Badge
              position="absolute"
              top={2}
              left={2}
              colorPalette="purple"
              size="sm"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <Icon as={LuLayers} boxSize={3} />
              {franchiseCount} тайтлов
            </Badge>
          )}

          {!hasProgress && anime._count.episodes > 0 && (
            <Badge position="absolute" top={2} right={2} colorPalette="brand" size="sm">
              {anime._count.episodes} эп.
            </Badge>
          )}

          {anime.year && (
            <Badge position="absolute" bottom={2} right={2} bg="blackAlpha.700" color="white" size="sm">
              {anime.year}
            </Badge>
          )}

          {hasProgress && overallProgress > 0 && overallProgress < 100 && (
            <Box position="absolute" bottom={0} left={0} right={0} h="3px" bg="whiteAlpha.300">
              <Box h="100%" bg="brand.500" w={`${overallProgress}%`} transition="width 0.3s" />
            </Box>
          )}

          {hasProgress && overallProgress >= 100 && (
            <Box position="absolute" bottom={0} left={0} right={0} h="3px" bg="green.500" />
          )}
        </Box>

        {/* Информация */}
        <Box p={3}>
          <Text fontWeight="semibold" lineClamp={2} mb={1}>
            {anime.title}
          </Text>
          {anime.titleOriginal && (
            <Text fontSize="xs" color="fg.muted" lineClamp={1} mb={2}>
              {anime.titleOriginal}
            </Text>
          )}

          <HStack gap={2} fontSize="xs" color="fg.muted" flexWrap="wrap">
            {anime.studio && <Text>{anime.studio}</Text>}
            {anime.ageRating && AGE_RATING_CONFIG[anime.ageRating] && (
              <Badge size="sm" colorPalette={AGE_RATING_CONFIG[anime.ageRating].color}>
                {AGE_RATING_CONFIG[anime.ageRating].label}
              </Badge>
            )}
            {anime.genres.slice(0, 2).map((g) => (
              <Badge key={g} size="sm" colorPalette="gray">
                {g}
              </Badge>
            ))}
          </HStack>

          <HStack gap={2} fontSize="xs" color="fg.muted" mt={2} flexWrap="wrap">
            {anime.uploadedBy?.name && (
              <HStack gap={1}>
                <Icon as={LuUser} />
                <Text>{anime.uploadedBy.name}</Text>
              </HStack>
            )}
            {(anime.viewCount ?? 0) > 0 && (
              <HStack gap={1}>
                <Icon as={LuEye} />
                <Text>{anime.viewCount}</Text>
              </HStack>
            )}
            {anime.avgRating !== null && anime.avgRating !== undefined && anime.avgRating > 0 && (
              <HStack gap={1}>
                <Icon as={LuStar} color="yellow.500" />
                <Text>{anime.avgRating.toFixed(1)}</Text>
              </HStack>
            )}
          </HStack>
        </Box>
      </Box>
    </NextLink>
  )
}
