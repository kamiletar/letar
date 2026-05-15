'use client'

/**
 * Вкладка "Связанные"
 *
 * Включает:
 * - FranchiseTimeline (порядок просмотра)
 * - RelatedAnimeList (связанные аниме)
 */

import { Card, VStack } from '@chakra-ui/react'

import { FranchiseTimeline, RelatedAnimeList } from '@/components/library'

export interface RelatedTabProps {
  /** ID аниме */
  animeId: string
  /** Shikimori ID */
  shikimoriId?: number | null | undefined
  /** Дата проверки связей */
  relationsCheckedAt?: Date | null | undefined
  /** Callback для скачивания связанного аниме */
  onDownloadClick: (shikimoriId: number, name: string | null) => void
}

export function RelatedTab({ animeId, shikimoriId, relationsCheckedAt, onDownloadClick }: RelatedTabProps) {
  return (
    <VStack align="stretch" gap={6}>
      {/* Порядок просмотра франшизы */}
      <FranchiseTimeline animeId={animeId} />

      {/* Связанные аниме */}
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <RelatedAnimeList
            animeId={animeId}
            shikimoriId={shikimoriId ?? null}
            relationsCheckedAt={relationsCheckedAt ?? null}
            onDownloadClick={onDownloadClick}
          />
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
