'use client'

/**
 * Read-only обзор аудио/субтитров из EpisodeManifest'ов
 *
 * Показывает уникальные аудиодорожки и субтитры, доступные в раздаче.
 * Используется на странице каталога (discover), где данные БД недоступны.
 */

import { Badge, Box, Card, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuCaptions, LuHeadphones } from 'react-icons/lu'

import type { TracksSummary } from '@/lib/hooks/use-anime-ipfs-data'

interface DiscoverTracksViewProps {
  /** Обзор дорожек из EpisodeManifest */
  tracksSummary: TracksSummary
}

/** Локализация языков */
const languageLabels: Record<string, string> = {
  ru: 'Русский',
  en: 'Английский',
  ja: 'Японский',
  uk: 'Украинский',
  de: 'Немецкий',
  fr: 'Французский',
  es: 'Испанский',
  it: 'Итальянский',
  pt: 'Португальский',
  ko: 'Корейский',
  zh: 'Китайский',
  und: 'Неизвестный',
}

/** Получить локализованное название языка */
function getLanguageLabel(lang: string): string {
  return languageLabels[lang] ?? lang.toUpperCase()
}

/**
 * Read-only обзор дорожек из IPFS
 */
export function DiscoverTracksView({ tracksSummary }: DiscoverTracksViewProps) {
  const { audioTracks, subtitleTracks } = tracksSummary

  if (audioTracks.length === 0 && subtitleTracks.length === 0) {
    return (
      <Box p={6} textAlign="center">
        <Text color="fg.muted">Информация о дорожках недоступна</Text>
      </Box>
    )
  }

  return (
    <VStack gap={4} align="stretch">
      {/* Аудиодорожки */}
      {audioTracks.length > 0 && (
        <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
          <Card.Body>
            <VStack gap={3} align="stretch">
              <HStack>
                <LuHeadphones color="var(--chakra-colors-fg-muted)" />
                <Heading size="sm">Аудиодорожки</Heading>
                <Badge colorPalette="blue" variant="subtle">
                  {audioTracks.length}
                </Badge>
              </HStack>

              <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={2}>
                {audioTracks.map((track, i) => (
                  <Card.Root key={i} bg="bg.subtle" border="1px" borderColor="border.subtle" size="sm">
                    <Card.Body py={2} px={3}>
                      <HStack justify="space-between">
                        <VStack gap={0} align="start">
                          <Text fontSize="sm" fontWeight="medium">
                            {getLanguageLabel(track.language)}
                          </Text>
                          {track.dubGroup && (
                            <Text fontSize="xs" color="fg.muted">
                              {track.dubGroup}
                            </Text>
                          )}
                        </VStack>
                        <HStack gap={1}>
                          <Badge size="sm" variant="outline" fontSize="2xs">
                            {track.codec.toUpperCase()}
                          </Badge>
                          <Badge size="sm" variant="outline" fontSize="2xs">
                            {track.channels}
                          </Badge>
                        </HStack>
                      </HStack>
                    </Card.Body>
                  </Card.Root>
                ))}
              </SimpleGrid>
            </VStack>
          </Card.Body>
        </Card.Root>
      )}

      {/* Субтитры */}
      {subtitleTracks.length > 0 && (
        <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
          <Card.Body>
            <VStack gap={3} align="stretch">
              <HStack>
                <LuCaptions color="var(--chakra-colors-fg-muted)" />
                <Heading size="sm">Субтитры</Heading>
                <Badge colorPalette="green" variant="subtle">
                  {subtitleTracks.length}
                </Badge>
              </HStack>

              <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={2}>
                {subtitleTracks.map((track, i) => (
                  <Card.Root key={i} bg="bg.subtle" border="1px" borderColor="border.subtle" size="sm">
                    <Card.Body py={2} px={3}>
                      <HStack justify="space-between">
                        <VStack gap={0} align="start">
                          <Text fontSize="sm" fontWeight="medium">
                            {getLanguageLabel(track.language)}
                          </Text>
                          {track.dubGroup && (
                            <Text fontSize="xs" color="fg.muted">
                              {track.dubGroup}
                            </Text>
                          )}
                        </VStack>
                        <Badge size="sm" variant="outline" fontSize="2xs">
                          {track.format.toUpperCase()}
                        </Badge>
                      </HStack>
                    </Card.Body>
                  </Card.Root>
                ))}
              </SimpleGrid>
            </VStack>
          </Card.Body>
        </Card.Root>
      )}
    </VStack>
  )
}
