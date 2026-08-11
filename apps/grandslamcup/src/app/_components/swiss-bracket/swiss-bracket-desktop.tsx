'use client'

/**
 * Desktop визуализация Swiss bracket (CS2 Major стиль).
 *
 * CSS Grid: 5 колонок (раунды) × 10 строк (W-L группы).
 * SVG коннекторы между узлами рисуются поверх сетки.
 */

import {
  SWISS_16_CONNECTORS,
  SWISS_16_LAYOUT,
  type SwissBracketData,
  type SwissBracketGroup,
} from '@/lib/swiss-bracket'
import { Box, Flex, Grid, Heading, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SwissGroupCard } from './swiss-group-card'

interface SwissBracketDesktopProps {
  data: SwissBracketData
  citySlug?: string
}

/** Количество колонок (раундов) */
const GRID_COLS = 5

export function SwissBracketDesktop({ data, citySlug }: SwissBracketDesktopProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [connectors, setConnectors] = useState<ConnectorLine[]>([])

  // Строим карту данных: wl → group данные
  const groupDataMap = new Map<string, SwissBracketGroup>()
  for (const round of data.rounds) {
    for (const group of round.groups) {
      groupDataMap.set(group.wl, group)
    }
  }

  // Строим карту прошедших/вылетевших по wl
  const advancedByWl = new Map<string, typeof data.advanced>()
  for (const t of data.advanced) {
    const list = advancedByWl.get(t.wl) ?? []
    list.push(t)
    advancedByWl.set(t.wl, list)
  }

  const eliminatedByWl = new Map<string, typeof data.eliminated>()
  for (const t of data.eliminated) {
    const list = eliminatedByWl.get(t.wl) ?? []
    list.push(t)
    eliminatedByWl.set(t.wl, list)
  }

  // Вычисляем позиции коннекторов после рендеринга
  const updateConnectors = useCallback(() => {
    if (!gridRef.current) { return }

    const lines: ConnectorLine[] = []
    for (const conn of SWISS_16_CONNECTORS) {
      const fromEl = gridRef.current.querySelector(`[data-wl="${conn.fromWl}"]`)
      const toEl = gridRef.current.querySelector(`[data-wl="${conn.toWl}"]`)
      if (!fromEl || !toEl) { continue }

      const gridRect = gridRef.current.getBoundingClientRect()
      const fromRect = fromEl.getBoundingClientRect()
      const toRect = toEl.getBoundingClientRect()

      lines.push({
        x1: fromRect.right - gridRect.left,
        y1: fromRect.top + fromRect.height / 2 - gridRect.top,
        x2: toRect.left - gridRect.left,
        y2: toRect.top + toRect.height / 2 - gridRect.top,
        outcome: conn.outcome,
      })
    }
    setConnectors(lines)
  }, [])

  useEffect(() => {
    updateConnectors()
    window.addEventListener('resize', updateConnectors)
    return () => window.removeEventListener('resize', updateConnectors)
  }, [updateConnectors])

  // Повторно считаем после рендеринга DOM
  useEffect(() => {
    const timer = setTimeout(updateConnectors, 500)
    return () => clearTimeout(timer)
  }, [data, updateConnectors])

  return (
    <Box position="relative">
      {/* Заголовки раундов */}
      <Grid templateColumns={`repeat(${GRID_COLS}, 1fr)`} gap={4} mb={3}>
        {Array.from({ length: GRID_COLS }, (_, i) => (
          <Heading key={i} size="xs" textAlign="center" color="fg.muted">
            Тур {i + 1}
          </Heading>
        ))}
      </Grid>

      {/* Сетка с узлами — 5 независимых колонок, без cross-column row coupling */}
      <Box ref={gridRef} position="relative">
        {/* SVG коннекторы поверх */}
        <Box position="absolute" inset={0} pointerEvents="none" zIndex={0}>
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            {connectors.map((line, idx) => <ConnectorSvg key={idx} line={line} />)}
          </svg>
        </Box>

        <Grid templateColumns={`repeat(${GRID_COLS}, 1fr)`} gap={4} alignItems="stretch">
          {Array.from({ length: GRID_COLS }, (_, i) => i + 1).map((col) => {
            const colNodes = SWISS_16_LAYOUT.filter((n) => n.gridCol === col).sort((a, b) => a.gridRow - b.gridRow)
            return (
              <Flex key={col} direction="column" gap={4} justifyContent="center">
                {colNodes.map((node) => {
                  const group = groupDataMap.get(node.wl)
                  const emptyGroup: SwissBracketGroup = {
                    wl: node.wl,
                    wins: Number(node.wl.split('-')[0]),
                    losses: Number(node.wl.split('-')[1]),
                    matches: [],
                    advancedTeams: [],
                    eliminatedTeams: [],
                  }
                  const termTeams = node.type === 'advanced'
                    ? (advancedByWl.get(node.wl) ?? [])
                    : node.type === 'eliminated'
                    ? (eliminatedByWl.get(node.wl) ?? [])
                    : []
                  return (
                    <Box key={node.wl} data-wl={node.wl} zIndex={1}>
                      <SwissGroupCard
                        group={group ?? emptyGroup}
                        nodeType={node.type}
                        teams={termTeams}
                        citySlug={citySlug}
                      />
                    </Box>
                  )
                })}
              </Flex>
            )
          })}
        </Grid>
      </Box>

      {/* Легенда */}
      <Flex gap={4} mt={4} justify="center" flexWrap="wrap">
        <LegendItem color="green" label="В плей-офф (3W)" />
        <LegendItem color="red" label="Вылет (3L)" />
        <Flex gap={1} align="center">
          <Box w={3} h="2px" bg="green.emphasized" />
          <Text fontSize="xs" color="fg.subtle">
            Победитель
          </Text>
        </Flex>
        <Flex gap={1} align="center">
          <Box w={3} h="2px" bg="red.emphasized" borderStyle="dashed" />
          <Text fontSize="xs" color="fg.subtle">
            Проигравший
          </Text>
        </Flex>
      </Flex>
    </Box>
  )
}

/** Элемент легенды */
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <Flex gap={1.5} align="center">
      <Box w={3} h={3} borderRadius="sm" bg={`${color}.subtle`} borderWidth="1px" borderColor={`${color}.emphasized`} />
      <Text fontSize="xs" color="fg.subtle">
        {label}
      </Text>
    </Flex>
  )
}

// ----- SVG коннекторы -----

interface ConnectorLine {
  x1: number
  y1: number
  x2: number
  y2: number
  outcome: 'winner' | 'loser'
}

/** SVG линия-коннектор между W-L группами */
function ConnectorSvg({ line }: { line: ConnectorLine }) {
  const { x1, y1, x2, y2, outcome } = line
  const isWinner = outcome === 'winner'
  const midX = (x1 + x2) / 2

  // L-образный путь: горизонталь → вертикаль → горизонталь
  const d = `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`

  return (
    <path
      d={d}
      fill="none"
      stroke={isWinner ? '#38a169' : '#e53e3e'}
      strokeWidth={1.5}
      strokeDasharray={isWinner ? undefined : '4 3'}
      opacity={0.5}
    />
  )
}
