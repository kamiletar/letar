'use client'

/**
 * Секция турнирной сетки (Upper/Lower/Grand Final) — desktop layout.
 *
 * CSS Grid: столбцы = раунды, строки = матчи.
 * SVG overlay для коннекторов между матчами.
 */

import { Box, Flex, Text } from '@chakra-ui/react'
import { useRef } from 'react'
import { BracketConnectors } from './bracket-connectors'
import { BracketMatchCard } from './bracket-match-card'
import type { BracketSection } from './types'

interface BracketSectionProps {
  section: BracketSection
  /** Ширина карточки матча */
  cardWidth?: number
  /** Горизонтальный gap между раундами (для SVG линий) */
  columnGap?: number
}

export function BracketSectionDesktop({ section, cardWidth = 200, columnGap = 60 }: BracketSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const columnCount = section.rounds.length
  const maxMatches = Math.max(...section.rounds.map((r) => r.matches.length))

  return (
    <Box position="relative" overflowX="auto" pb={2}>
      {/* Заголовки раундов */}
      <Flex gap={`${columnGap}px`} mb={2} pl={0}>
        {section.rounds.map((round) => (
          <Box key={round.number} w={`${cardWidth}px`} minW={`${cardWidth}px`} textAlign="center">
            <Text fontSize="xs" fontWeight="bold" color="fg.muted">
              {round.name}
            </Text>
          </Box>
        ))}
      </Flex>

      {/* Grid с карточками и SVG overlay */}
      <Box ref={containerRef} position="relative">
        {/* SVG коннекторы */}
        <BracketConnectors containerRef={containerRef} section={section} />

        {/* CSS Grid: карточки */}
        <Box
          display="grid"
          gridTemplateColumns={`repeat(${columnCount}, ${cardWidth}px)`}
          columnGap={`${columnGap}px`}
          rowGap="8px"
          alignItems="center"
        >
          {section.rounds.map((round, colIdx) => {
            // Вычисляем вертикальное распределение матчей
            // Первый раунд — плотно, последующие — растянуты
            const verticalSpacing = Math.pow(2, colIdx)

            return round.matches.map((match, rowIdx) => (
              <Box
                key={match.slotId}
                gridColumn={colIdx + 1}
                gridRow={rowIdx * verticalSpacing + 1}
                gridRowEnd={`span ${verticalSpacing}`}
                display="flex"
                alignItems="center"
              >
                <BracketMatchCard match={match} width={`${cardWidth}px`} />
              </Box>
            ))
          })}
          {/* Пустые ячейки для поддержания grid-высоты */}
          {Array.from({ length: maxMatches * Math.pow(2, columnCount - 1) }).map((_, i) => (
            <Box key={`spacer-${i}`} gridColumn={1} gridRow={i + 1} h="52px" visibility="hidden" />
          ))}
        </Box>
      </Box>
    </Box>
  )
}
