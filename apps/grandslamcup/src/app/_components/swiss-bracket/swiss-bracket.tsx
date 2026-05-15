'use client'

/**
 * Верхний компонент Swiss bracket — автопереключение Desktop/Mobile.
 */

import type { SwissBracketData } from '@/lib/swiss-bracket'
import { Box, Heading, VStack } from '@chakra-ui/react'
import { SwissBracketDesktop } from './swiss-bracket-desktop'
import { SwissBracketMobile } from './swiss-bracket-mobile'

export interface SwissBracketProps {
  data: SwissBracketData
  title?: string
  citySlug?: string
}

export function SwissBracket({ data, title, citySlug }: SwissBracketProps) {
  if (data.rounds.length === 0) {
    return null
  }

  return (
    <VStack gap={4} align="stretch" w="full" minW={0}>
      {title && (
        <Heading size="lg" textAlign="center">
          {title}
        </Heading>
      )}

      {/* Desktop: CSS Grid сетка с горизонтальным скроллом */}
      <Box display={{ base: 'none', md: 'block' }} overflowX="auto" minW={0} maxW="100%" w="100%">
        <SwissBracketDesktop data={data} citySlug={citySlug} />
      </Box>

      {/* Mobile: табы + вертикальный список, растягивается на всю ширину */}
      <Box display={{ base: 'block', md: 'none' }} minW={0} w="100%">
        <SwissBracketMobile data={data} citySlug={citySlug} />
      </Box>
    </VStack>
  )
}
