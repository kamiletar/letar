'use client'

/**
 * SVG-коннекторы между карточками матчей в турнирной сетке.
 *
 * L-образные линии: M sourceRight H midX V targetCenterY H targetLeft
 * Скрыты на мобиле.
 */

import { Box } from '@chakra-ui/react'
import type { RefObject } from 'react'
import { useMemo } from 'react'
import type { BracketSection } from './types'
import { useBracketPositions } from './use-bracket-positions'

interface BracketConnectorsProps {
  containerRef: RefObject<HTMLDivElement | null>
  section: BracketSection
}

/** Вычисляет пары source→target для коннекторов */
function computeConnectorPairs(section: BracketSection) {
  const pairs: Array<{ fromId: string; toId: string }> = []

  // Для каждого раунда > 1, каждый матч соединяется с матчами предыдущего раунда
  for (let i = 1; i < section.rounds.length; i++) {
    const currentRound = section.rounds[i]
    const prevRound = section.rounds[i - 1]
    if (!prevRound || !currentRound) {
      continue
    }

    // Каждый матч текущего раунда получает 2 фидера из предыдущего
    currentRound.matches.forEach((match, matchIdx) => {
      const feeder1 = prevRound.matches[matchIdx * 2]
      const feeder2 = prevRound.matches[matchIdx * 2 + 1]

      if (feeder1) {
        pairs.push({ fromId: feeder1.slotId, toId: match.slotId })
      }
      if (feeder2) {
        pairs.push({ fromId: feeder2.slotId, toId: match.slotId })
      }
    })
  }

  return pairs
}

export function BracketConnectors({ containerRef, section }: BracketConnectorsProps) {
  const connectorPairs = useMemo(() => computeConnectorPairs(section), [section])

  // Собираем все slotId для измерения
  const allSlotIds = useMemo(() => {
    const ids = new Set<string>()
    for (const pair of connectorPairs) {
      ids.add(pair.fromId)
      ids.add(pair.toId)
    }
    return [...ids]
  }, [connectorPairs])

  const positions = useBracketPositions(containerRef, allSlotIds)

  if (positions.size === 0 || connectorPairs.length === 0) {
    return null
  }

  // Вычисляем SVG-пути
  const paths = connectorPairs
    .map(({ fromId, toId }) => {
      const from = positions.get(fromId)
      const to = positions.get(toId)
      if (!from || !to) {
        return null
      }

      // L-образный путь: от правого края source → горизонтально до середины → вертикально → горизонтально до левого края target
      const midX = (from.right + to.left) / 2
      const d = `M ${from.right} ${from.centerY} H ${midX} V ${to.centerY} H ${to.left}`

      return { d, key: `${fromId}-${toId}` }
    })
    .filter(Boolean)

  return (
    <Box position="absolute" inset={0} pointerEvents="none" display={{ base: 'none', lg: 'block' }} zIndex={0}>
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        {paths.map((path) =>
          path ? (
            <path
              key={path.key}
              d={path.d}
              fill="none"
              stroke="var(--chakra-colors-border-emphasized)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          ) : null
        )}
      </svg>
    </Box>
  )
}
