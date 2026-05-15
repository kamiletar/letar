'use client'

/**
 * Лидерборд инструкторов — топ по рейтингу.
 */

import { Avatar, Box, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { LuStar, LuThumbsUp, LuTrophy } from 'react-icons/lu'

import type { InstructorLeaderboardEntry } from '../../../_actions/instructor-analytics.action'

interface InstructorLeaderboardProps {
  instructors: InstructorLeaderboardEntry[]
}

/**
 * Цвета для мест в лидерборде
 */
const PLACE_COLORS: Record<number, { bg: string; color: string; icon: string }> = {
  1: { bg: 'yellow.100', color: 'yellow.700', icon: 'yellow.500' },
  2: { bg: 'gray.100', color: 'gray.600', icon: 'gray.400' },
  3: { bg: 'orange.100', color: 'orange.700', icon: 'orange.500' },
}

function LeaderboardItem({ instructor, place }: { instructor: InstructorLeaderboardEntry; place: number }) {
  const placeColors = PLACE_COLORS[place] ?? { bg: 'bg.subtle', color: 'fg.muted', icon: 'fg.muted' }

  return (
    <HStack
      gap={3}
      p={3}
      borderRadius="md"
      bg={place <= 3 ? placeColors.bg : 'transparent'}
      _hover={{ bg: place <= 3 ? placeColors.bg : 'bg.subtle' }}
      transition="background 0.2s"
    >
      {/* Место */}
      <Box
        w={8}
        h={8}
        borderRadius="full"
        bg={place <= 3 ? placeColors.bg : 'bg.subtle'}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {place <= 3 ? (
          <Icon boxSize={5} color={placeColors.icon}>
            <LuTrophy />
          </Icon>
        ) : (
          <Text fontWeight="bold" color="fg.muted" fontSize="sm">
            {place}
          </Text>
        )}
      </Box>

      {/* Аватар и имя */}
      <HStack gap={3} flex={1}>
        <Avatar.Root size="sm">
          <Avatar.Image src={instructor.image ?? undefined} />
          <Avatar.Fallback name={instructor.name} />
        </Avatar.Root>
        <VStack align="start" gap={0} flex={1}>
          <Text fontWeight="medium" fontSize="sm" lineClamp={1}>
            {instructor.name}
          </Text>
          {instructor.recommendRate !== null && (
            <HStack gap={1}>
              <Icon boxSize={3} color="green.500">
                <LuThumbsUp />
              </Icon>
              <Text fontSize="xs" color="fg.muted">
                {instructor.recommendRate}% рекомендуют
              </Text>
            </HStack>
          )}
        </VStack>
      </HStack>

      {/* Рейтинг */}
      <VStack gap={0} align="end">
        {instructor.averageRating !== null ? (
          <HStack gap={1}>
            <Icon boxSize={4} color="yellow.500">
              <LuStar fill="currentColor" />
            </Icon>
            <Text fontWeight="bold" fontSize="lg">
              {instructor.averageRating.toFixed(1)}
            </Text>
          </HStack>
        ) : (
          <Text color="fg.muted">—</Text>
        )}
        <Text fontSize="xs" color="fg.muted">
          {instructor.reviewCount} отз.
        </Text>
      </VStack>
    </HStack>
  )
}

export function InstructorLeaderboard({ instructors }: InstructorLeaderboardProps) {
  if (instructors.length === 0) {
    return (
      <Box p={6} textAlign="center">
        <Text color="fg.muted">Нет данных для лидерборда</Text>
      </Box>
    )
  }

  return (
    <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" overflow="hidden">
      {/* Заголовок */}
      <Box p={4} borderBottomWidth="1px">
        <HStack gap={2}>
          <Icon boxSize={5} color="yellow.500">
            <LuTrophy />
          </Icon>
          <Text fontWeight="semibold">Лучшие инструкторы</Text>
        </HStack>
      </Box>

      {/* Список */}
      <VStack align="stretch" gap={0} p={2}>
        {instructors.map((instructor, index) => (
          <LeaderboardItem key={instructor.id} instructor={instructor} place={index + 1} />
        ))}
      </VStack>

      {/* Подсказка */}
      <Box p={3} borderTopWidth="1px" bg="bg.subtle">
        <Text fontSize="xs" color="fg.muted" textAlign="center">
          Рейтинг основан на оценках учеников
        </Text>
      </Box>
    </Box>
  )
}
