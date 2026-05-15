'use client'

/**
 * Главный компонент турнирной сетки.
 *
 * Desktop (lg+): CSS Grid + SVG коннекторы по секциям
 * Mobile (base-md): SegmentGroup + round tabs + вертикальный список
 */

import { Badge, Box, Heading, VStack } from '@chakra-ui/react'
import { BracketMobile } from './bracket-mobile'
import { BracketSectionDesktop } from './bracket-section'
import type { TournamentBracketProps } from './types'

const SECTION_COLOR: Record<string, string> = {
  PLAYOFF_UPPER: 'green',
  PLAYOFF_LOWER: 'orange',
  GRAND_FINAL: 'yellow',
}

export function TournamentBracket({ sections, title, showSectionHeaders = true }: TournamentBracketProps) {
  if (sections.length === 0) {
    return null
  }

  return (
    <VStack gap={6} align="stretch">
      {title && <Heading size="xl">{title}</Heading>}

      {/* Desktop layout — CSS-only responsive */}
      <Box hideBelow="lg">
        <DesktopLayout sections={sections} showHeaders={showSectionHeaders} />
      </Box>
      <Box hideFrom="lg">
        <BracketMobile sections={sections} />
      </Box>
    </VStack>
  )
}

function DesktopLayout({
  sections,
  showHeaders,
}: {
  sections: TournamentBracketProps['sections']
  showHeaders: boolean
}) {
  return (
    <VStack gap={8} align="stretch">
      {sections.map((section) => (
        <Box key={section.type}>
          {showHeaders && (
            <Heading size="md" mb={3}>
              <Badge colorPalette={SECTION_COLOR[section.type]} size="lg" mr={2}>
                {section.label}
              </Badge>
            </Heading>
          )}
          <BracketSectionDesktop section={section} />
        </Box>
      ))}
    </VStack>
  )
}
