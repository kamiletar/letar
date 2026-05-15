'use client'

/**
 * Список игроков в заявке тренера (live-матч)
 *
 * Расширенные статусы: доступен / играл в 1-м / играл в обоих / замена.
 * Группировка: основной состав → запасные.
 * Счётчик замен во 2-м тайме (до 2).
 * Mobile-first: крупные строки (48px+), цветовые статусы, кнопка "Выпустить".
 */

import { Badge, Box, Button, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'

import type { LineupStatus } from '@/generated/prisma'

export interface PlayerLineupItem {
  id: string
  name: string
  status: LineupStatus
  /** Выступал ли в 1-м тайме */
  playedHalf1: boolean
  /** Выступал ли в 2-м тайме */
  playedHalf2: boolean
}

/** Расширенный статус игрока */
type PlayerMatchStatus =
  | 'available' // доступен для выхода
  | 'played_this_half' // уже выступил в текущем тайме
  | 'played_other_half' // играл в другом тайме, может повторить
  | 'played_both' // играл в обоих таймах

interface PlayerListProps {
  players: PlayerLineupItem[]
  currentHalf: number
  canSendPlayer: boolean
  /** Количество использованных замен во 2-м тайме */
  substitutionsUsed: number
  maxSubstitutions: number
  onSendPlayer: (playerId: string, playerName: string) => Promise<void>
}

/** Определить расширенный статус игрока */
function getPlayerMatchStatus(player: PlayerLineupItem, currentHalf: number): PlayerMatchStatus {
  if (player.playedHalf1 && player.playedHalf2) {
    return 'played_both'
  }
  if (currentHalf === 1 && player.playedHalf1) {
    return 'played_this_half'
  }
  if (currentHalf === 2 && player.playedHalf2) {
    return 'played_this_half'
  }
  if (currentHalf === 2 && player.playedHalf1) {
    return 'played_other_half'
  }
  return 'available'
}

/** Бейдж по расширенному статусу */
function statusBadgeInfo(matchStatus: PlayerMatchStatus, lineupStatus: LineupStatus) {
  switch (matchStatus) {
    case 'played_both':
      return { color: 'gray', label: 'Оба тайма' }
    case 'played_this_half':
      return { color: 'blue', label: 'Выступил' }
    case 'played_other_half':
      return { color: 'teal', label: 'Играл в 1-м' }
    case 'available':
      if (lineupStatus === 'SUBSTITUTE') {
        return { color: 'yellow', label: 'Замена' }
      }
      return { color: 'green', label: 'Готов' }
  }
}

/** Может ли игрок выйти */
function canPlayerBeSelected(
  matchStatus: PlayerMatchStatus,
  lineupStatus: LineupStatus,
  currentHalf: number,
  substitutionsUsed: number,
  maxSubstitutions: number
): boolean {
  // Уже выступил в этом тайме или в обоих — нельзя
  if (matchStatus === 'played_this_half' || matchStatus === 'played_both') {
    return false
  }
  // Во 2-м тайме запасной может выйти только если лимит замен не исчерпан
  if (currentHalf === 2 && lineupStatus === 'SUBSTITUTE') {
    return substitutionsUsed < maxSubstitutions
  }
  return true
}

export function PlayerList({
  players,
  currentHalf,
  canSendPlayer,
  substitutionsUsed,
  maxSubstitutions,
  onSendPlayer,
}: PlayerListProps) {
  const [sendingId, setSendingId] = useState<string | null>(null)

  const handleSend = async (playerId: string, playerName: string) => {
    setSendingId(playerId)
    try {
      await onSendPlayer(playerId, playerName)
    } finally {
      setSendingId(null)
    }
  }

  // Группируем: основной состав → запасные
  const { starters, substitutes, notPlayed } = useMemo(() => {
    const _starters: (PlayerLineupItem & { matchStatus: PlayerMatchStatus })[] = []
    const _substitutes: (PlayerLineupItem & { matchStatus: PlayerMatchStatus })[] = []

    for (const p of players) {
      const ms = getPlayerMatchStatus(p, currentHalf)
      const item = { ...p, matchStatus: ms }
      if (p.status === 'SUBSTITUTE') {
        _substitutes.push(item)
      } else {
        _starters.push(item)
      }
    }

    // Подсчёт кто ещё не играл
    const _notPlayed = players.filter((p) => !p.playedHalf1 && !p.playedHalf2).map((p) => p.name)

    return { starters: _starters, substitutes: _substitutes, notPlayed: _notPlayed }
  }, [players, currentHalf])

  const renderPlayer = (player: PlayerLineupItem & { matchStatus: PlayerMatchStatus }) => {
    const badge = statusBadgeInfo(player.matchStatus, player.status)
    const playerCanGo =
      canSendPlayer &&
      canPlayerBeSelected(player.matchStatus, player.status, currentHalf, substitutionsUsed, maxSubstitutions)
    const isSending = sendingId === player.id

    return (
      <Flex
        key={player.id}
        align="center"
        justify="space-between"
        p={3}
        minH="56px"
        bg={
          player.matchStatus === 'played_this_half' || player.matchStatus === 'played_both' ? 'bg.muted' : 'bg.subtle'
        }
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.subtle"
        opacity={player.matchStatus === 'played_both' ? 0.5 : 1}
      >
        <Box flex={1}>
          <Text fontWeight="semibold" fontSize="md">
            {player.name}
          </Text>
          <Badge colorPalette={badge.color} size="sm" mt={1}>
            {badge.label}
          </Badge>
        </Box>

        {playerCanGo && (
          <Button
            size="sm"
            colorPalette="green"
            onClick={() => handleSend(player.id, player.name)}
            loading={isSending}
            minW="100px"
          >
            Выпустить
          </Button>
        )}
      </Flex>
    )
  }

  return (
    <VStack gap={3} align="stretch">
      {/* Информация о тайме */}
      <HStack justify="space-between" px={1}>
        <Text fontSize="sm" color="fg.muted">
          Тайм {currentHalf}
        </Text>
        {currentHalf === 2 && (
          <Badge colorPalette={substitutionsUsed >= maxSubstitutions ? 'red' : 'blue'} size="sm">
            Замены: {substitutionsUsed}/{maxSubstitutions}
          </Badge>
        )}
      </HStack>

      {/* Основной состав */}
      {starters.length > 0 && (
        <VStack gap={2} align="stretch">
          {starters.map(renderPlayer)}
        </VStack>
      )}

      {/* Запасные */}
      {substitutes.length > 0 && (
        <VStack gap={2} align="stretch">
          <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color="fg.muted" letterSpacing="wide" px={1}>
            Запасные
          </Text>
          {substitutes.map(renderPlayer)}
        </VStack>
      )}

      {/* Подсказка: кто ещё не играл */}
      {notPlayed.length > 0 && notPlayed.length <= 5 && (
        <Text fontSize="xs" color="fg.muted" px={1}>
          Ещё не выступали: {notPlayed.join(', ')}
        </Text>
      )}
    </VStack>
  )
}
