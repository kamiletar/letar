'use client'

/**
 * Карточка матча в турнирной сетке.
 *
 * 4 визуальных состояния:
 * - TBD: пунктирная рамка, "Ожидание"
 * - SCHEDULED: нейтральная рамка
 * - LIVE: пульсирующий бейдж, brand-border
 * - FINISHED: победитель bold green, проигравший muted
 */

import { Badge, Box, Flex, Text } from '@chakra-ui/react'
import Link from 'next/link'
import type { BracketMatch, BracketTeam } from './types'

interface BracketMatchCardProps {
  match: BracketMatch
  /** Ширина карточки */
  width?: string
}

export function BracketMatchCard({ match, width = '200px' }: BracketMatchCardProps) {
  const { team1, team2, score1, score2, status, matchId, winnerId, loserDropLabel, label } = match
  const isFinished = status === 'FINISHED'
  const isLive = status === 'LIVE'
  const isTbd = status === 'TBD'

  const borderColor = isLive
    ? 'colorPalette.solid'
    : isFinished
    ? 'border.emphasized'
    : isTbd
    ? 'border.muted'
    : 'border'

  const card = (
    <Box
      data-slot-id={match.slotId}
      w={width}
      minW={width}
      bg="bg.panel"
      borderWidth="1px"
      borderStyle={isTbd ? 'dashed' : 'solid'}
      borderColor={borderColor}
      borderRadius="lg"
      overflow="hidden"
      colorPalette={isLive ? 'brand' : undefined}
      transition="border-color 0.2s"
      _hover={matchId ? { borderColor: 'border.emphasized', shadow: 'sm' } : undefined}
      cursor={matchId ? 'pointer' : 'default'}
    >
      {/* Заголовок */}
      <Flex
        px={2}
        py={1}
        bg="bg.subtle"
        justify="space-between"
        align="center"
        borderBottomWidth="1px"
        borderColor="border.muted"
      >
        <Text fontSize="2xs" color="fg.subtle" fontWeight="medium">
          {label}
        </Text>
        {isLive && (
          <Badge size="xs" colorPalette="red" className="live-pulse">
            LIVE
          </Badge>
        )}
        {isFinished && (
          <Badge size="xs" colorPalette="green">
            Завершён
          </Badge>
        )}
      </Flex>

      {/* Команды */}
      <Box px={2} py={1.5}>
        <TeamRow
          team={team1}
          score={score1}
          isWinner={isFinished && winnerId !== null && team1?.id === winnerId}
          isLoser={isFinished && winnerId !== null && team1?.id !== winnerId}
          isTbd={isTbd && !team1}
        />
        <Box h="1px" bg="border.muted" my={1} />
        <TeamRow
          team={team2}
          score={score2}
          isWinner={isFinished && winnerId !== null && team2?.id === winnerId}
          isLoser={isFinished && winnerId !== null && team2?.id !== winnerId}
          isTbd={isTbd && !team2}
        />
      </Box>

      {/* Бейдж куда падает проигравший */}
      {loserDropLabel && (
        <Box px={2} pb={1}>
          <Text fontSize="2xs" color="fg.subtle">
            {loserDropLabel}
          </Text>
        </Box>
      )}
    </Box>
  )

  if (matchId) {
    return <Link href={`/matches/${matchId}`}>{card}</Link>
  }

  return card
}

/** Строка команды: имя + счёт */
function TeamRow({
  team,
  score,
  isWinner,
  isLoser,
  isTbd,
}: {
  team: BracketTeam | null
  score: number | null
  isWinner: boolean
  isLoser: boolean
  isTbd: boolean
}) {
  return (
    <Flex justify="space-between" align="center" gap={2} minH="24px">
      <Text
        fontSize="xs"
        fontWeight={isWinner ? 'bold' : 'normal'}
        color={isWinner ? 'success.fg' : isLoser ? 'fg.subtle' : 'fg'}
        fontStyle={isTbd ? 'italic' : undefined}
        truncate
      >
        {team ? team.name : 'Ожидание'}
      </Text>
      {score !== null && (
        <Text
          fontSize="xs"
          fontWeight={isWinner ? 'bold' : 'medium'}
          color={isWinner ? 'success.fg' : isLoser ? 'fg.subtle' : 'fg'}
          flexShrink={0}
        >
          {score}
        </Text>
      )}
    </Flex>
  )
}
