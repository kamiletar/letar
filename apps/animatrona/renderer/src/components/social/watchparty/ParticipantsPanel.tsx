/**
 * ParticipantsPanel — Панель участников Watch Party
 *
 * Показывает список участников комнаты с их статусами.
 */

'use client'

import { Avatar, Badge, Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { LuCrown, LuUser } from 'react-icons/lu'

import type { WatchPartyParticipant } from '../../../../../shared/types/orbitdb'
import { SyncIndicator } from './SyncIndicator'

export interface ParticipantsPanelProps {
  /** Список участников */
  participants: WatchPartyParticipant[]
  /** Текущая позиция хоста */
  hostPosition: number
  /** Загрузка */
  isLoading?: boolean
}

export function ParticipantsPanel({ participants, hostPosition, isLoading }: ParticipantsPanelProps) {
  if (isLoading) {
    return (
      <Box p={4}>
        <Text color="fg.muted">Загрузка участников...</Text>
      </Box>
    )
  }

  if (participants.length === 0) {
    return (
      <Box p={4}>
        <Text color="fg.muted">Нет участников</Text>
      </Box>
    )
  }

  // Сортируем: хост первый, затем по имени
  const sorted = [...participants].sort((a, b) => {
    if (a.role === 'host' && b.role !== 'host') {
      return -1
    }
    if (a.role !== 'host' && b.role === 'host') {
      return 1
    }
    return a.displayName.localeCompare(b.displayName)
  })

  return (
    <VStack align="stretch" gap={0}>
      <Box px={4} py={3} borderBottomWidth={1} borderColor="border.subtle">
        <HStack justify="space-between">
          <Heading size="sm">Участники</Heading>
          <Badge colorPalette="gray" variant="subtle">
            {participants.length}
          </Badge>
        </HStack>
      </Box>

      <VStack align="stretch" gap={0} overflow="auto" maxH="300px">
        {sorted.map((participant) => (
          <ParticipantRow key={participant.peerId} participant={participant} hostPosition={hostPosition} />
        ))}
      </VStack>
    </VStack>
  )
}

interface ParticipantRowProps {
  participant: WatchPartyParticipant
  hostPosition: number
}

function ParticipantRow({ participant, hostPosition }: ParticipantRowProps) {
  const isHost = participant.role === 'host'

  return (
    <HStack px={4} py={2} gap={3} _hover={{ bg: 'bg.subtle' }} transition="background 0.15s">
      {/* Аватар */}
      <Avatar.Root size="sm">
        {participant.avatarUrl ? <Avatar.Image src={participant.avatarUrl} /> : (
          <Avatar.Fallback>
            <LuUser />
          </Avatar.Fallback>
        )}
      </Avatar.Root>

      {/* Имя и роль */}
      <VStack align="start" gap={0} flex={1}>
        <HStack gap={1}>
          <Text fontWeight="medium" fontSize="sm">
            {participant.displayName}
          </Text>
          {isHost && <LuCrown style={{ width: 14, height: 14, color: 'var(--chakra-colors-yellow-500)' }} />}
        </HStack>

        {/* Синхронизация (не показываем для хоста) */}
        {!isHost && <SyncIndicator localPosition={participant.currentPosition} hostPosition={hostPosition} />}
      </VStack>

      {/* Статус готовности */}
      {participant.isReady
        ? (
          <Badge colorPalette="green" variant="subtle" size="sm">
            Готов
          </Badge>
        )
        : (
          <Badge colorPalette="gray" variant="subtle" size="sm">
            Ожидание
          </Badge>
        )}
    </HStack>
  )
}
