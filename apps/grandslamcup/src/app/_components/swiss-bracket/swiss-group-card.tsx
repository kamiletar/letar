'use client'

/**
 * Карточка W-L группы в Swiss bracket.
 *
 * Показывает заголовок с записью (1-1), список матчей,
 * и бейджи прошедших/вылетевших команд.
 */

import type { SwissBracketGroup, SwissTeam } from '@/lib/swiss-bracket'
import { Badge, Box, Flex, Text, VStack } from '@chakra-ui/react'
import { SwissMatchCard } from './swiss-match-card'

interface SwissGroupCardProps {
  group: SwissBracketGroup
  /** Тип узла — обычная группа, прошедшие, или вылетевшие */
  nodeType: 'group' | 'advanced' | 'eliminated'
  /** Список команд (для терминальных узлов без матчей) */
  teams?: SwissTeam[]
  citySlug?: string
}

/** Цвет по соотношению W-L */
function getGroupColor(wins: number, losses: number): string {
  const diff = wins - losses
  if (diff >= 2) { return 'green' }
  if (diff === 1) { return 'teal' }
  if (diff === 0) { return 'gray' }
  if (diff === -1) { return 'orange' }
  return 'red'
}

export function SwissGroupCard({ group, nodeType, teams, citySlug }: SwissGroupCardProps) {
  const isTerminal = nodeType !== 'group'
  const color = nodeType === 'advanced'
    ? 'green'
    : nodeType === 'eliminated'
    ? 'red'
    : getGroupColor(group.wins, group.losses)

  return (
    <Box
      bg="bg.panel"
      borderWidth="1px"
      borderColor={isTerminal ? `${color}.emphasized` : 'border.emphasized'}
      borderRadius="lg"
      shadow="sm"
      overflow="hidden"
      minW={{ base: 0, md: '11.25rem' }}
      maxW={{ base: '100%', md: '16.25rem' }}
      w="100%"
    >
      {/* Заголовок: W-L запись */}
      <Flex
        px={{ base: 3, md: 2.5 }}
        py={{ base: 2, md: 1.5 }}
        bg={isTerminal ? `${color}.subtle` : 'bg.subtle'}
        borderBottomWidth="1px"
        borderColor="border.muted"
        align="center"
        justify="space-between"
        gap={2}
      >
        <Text fontSize={{ base: 'clamp(1rem, 4.5vw, 1.375rem)', md: 'sm' }} fontWeight="bold" color={`${color}.fg`}>
          {group.wl}
        </Text>
        {nodeType === 'advanced' && (
          <Badge size="xs" colorPalette="green">
            В плей-офф
          </Badge>
        )}
        {nodeType === 'eliminated' && (
          <Badge size="xs" colorPalette="red">
            Вылет
          </Badge>
        )}
        {nodeType === 'group' && group.matches.length > 0 && (
          <Text fontSize={{ base: 'clamp(0.75rem, 3vw, 1rem)', md: '2xs' }} color="fg.subtle">
            {group.matches.filter((m) =>
              m.status === 'FINISHED'
            ).length}/{group.matches.length}
          </Text>
        )}
      </Flex>

      {/* Содержимое */}
      <Box p={{ base: 3, md: 2 }}>
        {/* Матчи (для обычных групп) */}
        {nodeType === 'group' && group.matches.length > 0 && (
          <VStack gap={1.5} align="stretch">
            {group.matches.map((match) => <SwissMatchCard key={match.matchId} match={match} citySlug={citySlug} />)}
          </VStack>
        )}

        {/* Прошедшие команды */}
        {group.advancedTeams.length > 0 && nodeType === 'group' && (
          <VStack gap={1} mt={2} align="stretch">
            {group.advancedTeams.map((t) => (
              <Flex key={t.id} gap={1} align="center">
                <Text fontSize={{ base: 'clamp(0.75rem, 3vw, 1rem)', md: '2xs' }} color="green.fg">
                  ✓
                </Text>
                <Text
                  fontSize={{ base: 'clamp(0.875rem, 3.5vw, 1.125rem)', md: 'xs' }}
                  color="green.fg"
                  fontWeight="medium"
                >
                  {t.name}
                </Text>
              </Flex>
            ))}
          </VStack>
        )}

        {/* Вылетевшие команды */}
        {group.eliminatedTeams.length > 0 && nodeType === 'group' && (
          <VStack gap={1} mt={2} align="stretch">
            {group.eliminatedTeams.map((t) => (
              <Flex key={t.id} gap={1} align="center">
                <Text fontSize={{ base: 'clamp(0.75rem, 3vw, 1rem)', md: '2xs' }} color="red.fg">
                  ✗
                </Text>
                <Text
                  fontSize={{ base: 'clamp(0.875rem, 3.5vw, 1.125rem)', md: 'xs' }}
                  color="red.fg"
                  fontWeight="medium"
                >
                  {t.name}
                </Text>
              </Flex>
            ))}
          </VStack>
        )}

        {/* Список команд для терминальных узлов */}
        {isTerminal && teams && teams.length > 0 && (
          <VStack gap={1} align="stretch">
            {teams.map((t) => (
              <Text
                key={t.id}
                fontSize={{ base: 'clamp(0.875rem, 3.5vw, 1.125rem)', md: 'xs' }}
                fontWeight="medium"
                color={`${color}.fg`}
              >
                {t.name}
              </Text>
            ))}
          </VStack>
        )}

        {/* Пустой узел */}
        {isTerminal && (!teams || teams.length === 0) && group.matches.length === 0 && (
          <Text fontSize={{ base: 'clamp(0.875rem, 3.5vw, 1.125rem)', md: 'xs' }} color="fg.subtle" fontStyle="italic">
            Ожидание...
          </Text>
        )}
      </Box>
    </Box>
  )
}
