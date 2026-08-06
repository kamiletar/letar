'use client'

/**
 * Секция "О сериале"
 *
 * Описание + метаданные (студии, персонал, персонажи) + внешние ссылки.
 * Два столбца на lg+.
 * Адаптация из animatrona-web AboutSection.
 */

import { Grid, Text, VStack } from '@chakra-ui/react'
import type {
  AnimeManifestCharacter,
  AnimeManifestExternalIds,
  AnimeManifestExternalLink,
  AnimeManifestPerson,
  AnimeManifestStudio,
} from '@letar/animatrona-types'

import { ExternalLinksSection } from './external-links'
import { MetadataSection } from './metadata-section'

export interface AboutSectionProps {
  description?: string
  studios?: AnimeManifestStudio[]
  staff?: AnimeManifestPerson[]
  characters?: AnimeManifestCharacter[]
  fandubbers?: string[]
  fansubbers?: string[]
  externalIds?: AnimeManifestExternalIds
  externalLinks?: AnimeManifestExternalLink[]
  /** shikimoriId из БД (для fallback, если нет в манифесте) */
  dbShikimoriId?: number | null
  source?: string
  licensor?: string
}

export function AboutSection({
  description,
  studios,
  staff,
  characters,
  fandubbers,
  fansubbers,
  externalIds,
  externalLinks,
  dbShikimoriId,
  source,
  licensor,
}: AboutSectionProps) {
  return (
    <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
      {/* Левая колонка: Описание */}
      <VStack align="stretch" gap={4}>
        {description
          ? (
            <Text color="fg" fontSize="sm" lineHeight="tall" whiteSpace="pre-line">
              {description}
            </Text>
          )
          : <Text color="fg.subtle">Описание отсутствует</Text>}

        {/* Дополнительная информация */}
        {(source || licensor) && (
          <VStack align="start" gap={1} mt={2}>
            {source && (
              <Text fontSize="xs" color="fg.subtle">
                Источник: {source}
              </Text>
            )}
            {licensor && (
              <Text fontSize="xs" color="fg.subtle">
                Лицензиар: {licensor}
              </Text>
            )}
          </VStack>
        )}
      </VStack>

      {/* Правая колонка: Метаданные + Ссылки */}
      <VStack align="stretch" gap={6}>
        <MetadataSection
          studios={studios}
          staff={staff}
          characters={characters}
          fandubbers={fandubbers}
          fansubbers={fansubbers}
        />
        <ExternalLinksSection externalIds={externalIds} externalLinks={externalLinks} dbShikimoriId={dbShikimoriId} />
      </VStack>
    </Grid>
  )
}
