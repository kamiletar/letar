'use client'

/**
 * Вкладка "О сериале"
 *
 * Включает:
 * - Описание (collapsible)
 * - Компактные метаданные (студия, режиссёр и т.д.)
 */

import { Box, Grid, VStack } from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'

import { checkExistingAnimeByShikimoriIds } from '@/app/_actions/anime.action'
import { AnimeMetadataSection } from '@/components/library/AnimeMetadataSection'
import { DescriptionRenderer, type LocalAnimeInfo } from '@/lib/shikimori/DescriptionRenderer'
import { extractAnimeIdsFromDescription } from '@/lib/shikimori/parse-description'

export interface AboutTabProps {
  /** Описание аниме */
  description?: string | null
  /** ID аниме */
  animeId: string
  /** Shikimori ID */
  shikimoriId?: number | null | undefined
}

export function AboutTab({ description, animeId, shikimoriId }: AboutTabProps) {
  const [localAnimeMap, setLocalAnimeMap] = useState<Map<number, LocalAnimeInfo>>(new Map())

  // Извлекаем anime IDs из описания
  const animeIdsInDescription = useMemo(() => {
    if (!description) {
      return []
    }
    return extractAnimeIdsFromDescription(description)
  }, [description])

  // Загружаем информацию о локальных аниме
  useEffect(() => {
    if (animeIdsInDescription.length === 0) {
      setLocalAnimeMap(new Map())
      return
    }

    const loadLocalAnime = async () => {
      const existingRecord = await checkExistingAnimeByShikimoriIds(animeIdsInDescription)
      // Конвертируем Record<number, ExistingAnimeInfo> в Map<number, LocalAnimeInfo>
      const localMap = new Map<number, LocalAnimeInfo>()
      for (const [shikimoriIdStr, info] of Object.entries(existingRecord)) {
        const shikimoriId = parseInt(shikimoriIdStr, 10)
        localMap.set(shikimoriId, { id: info.id, name: info.name })
      }
      setLocalAnimeMap(localMap)
    }

    loadLocalAnime()
  }, [animeIdsInDescription])

  return (
    <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
      {/* Левая колонка: Описание */}
      <VStack align="stretch" gap={4}>
        {description ? (
          <Box>
            <DescriptionRenderer description={description} localAnimeMap={localAnimeMap} />
          </Box>
        ) : (
          <Box color="fg.subtle">Описание отсутствует</Box>
        )}
      </VStack>

      {/* Правая колонка: Метаданные */}
      <VStack align="stretch" gap={4}>
        <AnimeMetadataSection animeId={animeId} shikimoriId={shikimoriId ?? null} />
      </VStack>
    </Grid>
  )
}
