/**
 * Внешние ссылки на MAL, AniList, Shikimori и другие
 *
 * Адаптация из animatrona-web ExternalLinks.
 * Использует buildExternalLinks из lib/external-links.ts.
 */

import { buildExternalLinks } from '@/lib/external-links'
import { Badge, Box, Heading, HStack, Wrap } from '@chakra-ui/react'
import type { AnimeManifestExternalIds, AnimeManifestExternalLink } from '@letar/animatrona-types'
import { LuExternalLink } from 'react-icons/lu'

export interface ExternalLinksSectionProps {
  externalIds?: AnimeManifestExternalIds
  externalLinks?: AnimeManifestExternalLink[]
  /** shikimoriId из БД (fallback если нет в манифесте) */
  dbShikimoriId?: number | null
}

export function ExternalLinksSection({ externalIds, externalLinks, dbShikimoriId }: ExternalLinksSectionProps) {
  const links = buildExternalLinks(externalIds, dbShikimoriId)

  // Добавляем externalLinks (произвольные ссылки из манифеста)
  const extraLinks = (externalLinks ?? []).map((link) => ({
    name: link.kind,
    url: link.url,
    colorPalette: 'gray',
  }))

  const allLinks = [...links, ...extraLinks]

  if (allLinks.length === 0) {
    return null
  }

  return (
    <Box>
      <Heading size="sm" mb={3} color="fg.muted">
        Ссылки
      </Heading>
      <Wrap gap={2}>
        {allLinks.map((link) => (
          <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
            <Badge
              colorPalette={link.colorPalette}
              variant="subtle"
              cursor="pointer"
              _hover={{ opacity: 0.8 }}
              display="flex"
              alignItems="center"
              gap={1}
            >
              <HStack gap={1}>
                <LuExternalLink size={12} />
                <span>{link.name}</span>
              </HStack>
            </Badge>
          </a>
        ))}
      </Wrap>
    </Box>
  )
}
