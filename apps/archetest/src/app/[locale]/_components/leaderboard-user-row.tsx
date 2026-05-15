'use client'

import { Box, HStack, Text } from '@chakra-ui/react'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import type { LeaderboardEntry } from '../_actions/leaderboard.action'
import { RANKS_MAP } from '../_data/ranks'

interface LeaderboardUserRowProps {
  entry: LeaderboardEntry
  position: number
  isCurrentUser: boolean
}

export function LeaderboardUserRow({ entry, position, isCurrentUser }: LeaderboardUserRowProps) {
  const locale = useLocale()
  const isRu = locale === 'ru'
  const rank = RANKS_MAP.get(entry.rankCode)

  return (
    <Box
      p={3}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={isCurrentUser ? 'blue.500' : 'border'}
      bg={isCurrentUser ? 'blue.50' : 'bg'}
      _dark={isCurrentUser ? { bg: 'blue.950' } : undefined}
    >
      <HStack gap={3} justify="space-between">
        <HStack gap={3}>
          {/* Позиция */}
          <Text
            fontWeight="bold"
            fontSize="lg"
            minW="28px"
            textAlign="center"
            color={position <= 3 ? 'yellow.600' : 'fg'}
          >
            {position <= 3 ? ['🥇', '🥈', '🥉'][position - 1] : `#${position}`}
          </Text>

          {/* Аватар */}
          {entry.image ? (
            <Box flexShrink={0} w="32px" h="32px" borderRadius="full" overflow="hidden">
              <Image
                src={entry.image}
                alt={entry.name}
                width={32}
                height={32}
                style={{ borderRadius: '50%', objectFit: 'cover', width: 32, height: 32 }}
              />
            </Box>
          ) : (
            <Box
              flexShrink={0}
              w="32px"
              h="32px"
              borderRadius="full"
              bg="bg.emphasized"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="sm">{entry.name[0]?.toUpperCase()}</Text>
            </Box>
          )}

          {/* Имя + ранг */}
          <Box minW={0}>
            <Text fontWeight="medium" fontSize="sm" truncate>
              {entry.name}
              {isCurrentUser && (
                <Text as="span" color="blue.500" ml={1} fontSize="xs">
                  (Вы)
                </Text>
              )}
            </Text>
            <HStack gap={1}>
              <Text fontSize="xs">{rank?.icon}</Text>
              <Text fontSize="xs" color="fg.muted">
                {rank ? (isRu ? rank.label : rank.labelEn) : entry.rankCode}
              </Text>
            </HStack>
          </Box>
        </HStack>

        {/* Метрики */}
        <HStack gap={4} display={{ base: 'none', md: 'flex' }}>
          <Box textAlign="center">
            <Text fontSize="sm" fontWeight="bold">
              {entry.sessionsCount}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              Сессии
            </Text>
          </Box>
          <Box textAlign="center">
            <Text fontSize="sm" fontWeight="bold">
              {entry.achievementsCount}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              🏆
            </Text>
          </Box>
          <Box textAlign="center">
            <Text fontSize="sm" fontWeight="bold" color="blue.500">
              {entry.xp}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              XP
            </Text>
          </Box>
        </HStack>

        {/* XP на мобилке */}
        <Text fontSize="sm" fontWeight="bold" color="blue.500" display={{ base: 'block', md: 'none' }}>
          {entry.xp} XP
        </Text>
      </HStack>
    </Box>
  )
}
