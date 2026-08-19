'use client'

/**
 * Мобильный layout турнирной сетки.
 *
 * Паттерн ESPN Tournament Challenge:
 * - SegmentGroup для переключения Upper/Lower/GF
 * - Табы раундов внутри каждого сегмента
 * - Вертикальный список матчей выбранного раунда
 */

import { Box, Flex, Text, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { BracketMatchCard } from './bracket-match-card'
import type { BracketSection, TournamentBracketProps } from './types'

export function BracketMobile({ sections }: TournamentBracketProps) {
  const [activeSectionIdx, setActiveSectionIdx] = useState(0)
  const activeSection = sections[activeSectionIdx]

  // По умолчанию выбираем первый незавершённый раунд
  const defaultRound = useMemo(() => {
    if (!activeSection) {
      return 0
    }
    const idx = activeSection.rounds.findIndex((r) => r.matches.some((m) => m.status !== 'FINISHED'))
    return idx >= 0 ? idx : activeSection.rounds.length - 1
  }, [activeSection])

  const [activeRoundIdx, setActiveRoundIdx] = useState(defaultRound)

  // Сбрасываем раунд при смене секции
  const handleSectionChange = (idx: number) => {
    setActiveSectionIdx(idx)
    const section = sections[idx]
    if (!section) {
      return
    }
    const firstUnfinished = section.rounds.findIndex((r) => r.matches.some((m) => m.status !== 'FINISHED'))
    setActiveRoundIdx(firstUnfinished >= 0 ? firstUnfinished : section.rounds.length - 1)
  }

  if (!activeSection) {
    return null
  }

  const activeRound = activeSection.rounds[activeRoundIdx]

  return (
    <VStack gap={3} align="stretch">
      {/* Переключатель секций */}
      <SectionTabs sections={sections} activeIdx={activeSectionIdx} onChange={handleSectionChange} />

      {/* Табы раундов */}
      <RoundTabs section={activeSection} activeIdx={activeRoundIdx} onChange={setActiveRoundIdx} />

      {/* Список матчей */}
      {activeRound && (
        <VStack gap={3} align="stretch">
          {activeRound.matches.map((match) => <BracketMatchCard key={match.slotId} match={match} width="100%" />)}
          {activeRound.matches.length === 0 && (
            <Text color="fg.muted" textAlign="center" py={8}>
              Нет матчей в этом раунде
            </Text>
          )}
        </VStack>
      )}
    </VStack>
  )
}

/** Табы секций (Верхняя / Нижняя / Финал) */
function SectionTabs({
  sections,
  activeIdx,
  onChange,
}: {
  sections: BracketSection[]
  activeIdx: number
  onChange: (idx: number) => void
}) {
  const colorMap: Record<string, string> = {
    PLAYOFF_UPPER: 'green',
    PLAYOFF_LOWER: 'orange',
    GRAND_FINAL: 'yellow',
  }

  return (
    <Flex gap={1} bg="bg.subtle" borderRadius="lg" p={1}>
      {sections.map((section, idx) => (
        <Box
          key={section.type}
          flex={1}
          textAlign="center"
          py={2}
          px={3}
          borderRadius="md"
          cursor="pointer"
          fontSize="sm"
          fontWeight={idx === activeIdx ? 'bold' : 'medium'}
          bg={idx === activeIdx ? 'bg.panel' : 'transparent'}
          color={idx === activeIdx ? `${colorMap[section.type]}.fg` : 'fg.muted'}
          shadow={idx === activeIdx ? 'xs' : undefined}
          transitionProperty="background-color, color"
          transitionDuration="0.2s"
          onClick={() => onChange(idx)}
          _hover={{ bg: idx === activeIdx ? 'bg.panel' : 'bg.muted' }}
        >
          {section.label}
        </Box>
      ))}
    </Flex>
  )
}

/** Горизонтальный скролл табов раундов */
function RoundTabs({
  section,
  activeIdx,
  onChange,
}: {
  section: BracketSection
  activeIdx: number
  onChange: (idx: number) => void
}) {
  return (
    <Flex gap={1} overflowX="auto" pb={1}>
      {section.rounds.map((round, idx) => {
        const isActive = idx === activeIdx
        const hasLive = round.matches.some((m) => m.status === 'LIVE')
        const allFinished = round.matches.every((m) => m.status === 'FINISHED')

        return (
          <Box
            key={round.number}
            flexShrink={0}
            px={3}
            py={1.5}
            borderRadius="md"
            cursor="pointer"
            fontSize="xs"
            fontWeight={isActive ? 'bold' : 'medium'}
            bg={isActive ? 'colorPalette.subtle' : 'transparent'}
            color={isActive ? 'colorPalette.fg' : 'fg.muted'}
            colorPalette={hasLive ? 'red' : allFinished ? 'green' : 'gray'}
            borderWidth="1px"
            borderColor={isActive ? 'colorPalette.muted' : 'transparent'}
            transitionProperty="background-color, color, border-color"
            transitionDuration="0.2s"
            onClick={() => onChange(idx)}
            whiteSpace="nowrap"
          >
            {round.name}
            {hasLive && ' *'}
          </Box>
        )
      })}
    </Flex>
  )
}
