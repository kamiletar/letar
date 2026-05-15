'use client'

/**
 * Вкладка "Эпизоды"
 *
 * Grid карточек эпизодов с прогрессом просмотра
 */

import { Box, Button, Card, Heading, HStack, Icon, SimpleGrid, Text } from '@chakra-ui/react'
import { LuFileText } from 'react-icons/lu'

import { EpisodeCard } from '@/components/library/EpisodeCard'
import type { WatchProgress } from '@/generated/prisma'

export interface EpisodeData {
  id: string
  number: number
  name?: string | null
  durationMs: number | null
  /** JSON массив CID thumbnail'ов в IPFS */
  thumbnailCids: string | null
  /** JSON массив CID скриншотов в IPFS */
  screenshotCids: string | null
  /** CID metadata.json в IPFS */
  metadataCid?: string | null
  /** CID манифеста эпизода в IPFS */
  manifestCid?: string | null
}

export interface EpisodesTabProps {
  /** Список эпизодов */
  episodes: EpisodeData[]
  /** Прогресс просмотра */
  watchProgress?: WatchProgress[]
  /** Callback для открытия редактора названий */
  onEditNames: () => void
}

export function EpisodesTab({ episodes, watchProgress, onEditNames }: EpisodesTabProps) {
  if (!episodes || episodes.length === 0) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body py={8} textAlign="center">
          <Text color="fg.subtle">Эпизоды не добавлены</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="md" color="fg.subtle">
          {episodes.length} {episodes.length === 1 ? 'эпизод' : episodes.length < 5 ? 'эпизода' : 'эпизодов'}
        </Heading>
        <Button variant="ghost" size="sm" onClick={onEditNames}>
          <Icon as={LuFileText} mr={2} />
          Редактировать названия
        </Button>
      </HStack>

      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} gap={4}>
        {episodes.map((episode) => {
          const progress = watchProgress?.find((p) => p.episodeId === episode.id)
          const watchStatus = progress?.completed ? 'completed' : progress ? 'in_progress' : 'unwatched'

          // Вычисляем процент просмотра
          const watchPercent =
            progress && episode.durationMs && progress.currentTime
              ? Math.min(100, ((progress.currentTime * 1000) / episode.durationMs) * 100)
              : 0

          return (
            <EpisodeCard
              key={episode.id}
              id={episode.id}
              number={episode.number}
              name={episode.name}
              durationMs={episode.durationMs}
              thumbnailCids={episode.thumbnailCids}
              screenshotCids={episode.screenshotCids}
              manifestCid={episode.manifestCid}
              metadataCid={episode.metadataCid}
              watchStatus={watchStatus}
              watchProgress={watchPercent}
            />
          )
        })}
      </SimpleGrid>
    </Box>
  )
}
