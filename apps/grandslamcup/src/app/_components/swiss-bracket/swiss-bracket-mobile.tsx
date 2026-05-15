'use client'

/**
 * Мобильная визуализация Swiss bracket.
 *
 * Табы по раундам (1-5), внутри — вертикальный список W-L групп.
 * Текущий/последний раунд открыт по умолчанию.
 */

import type { SwissBracketData } from '@/lib/swiss-bracket'
import { Badge, Box, Flex, Text, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { SwissGroupCard } from './swiss-group-card'

interface SwissBracketMobileProps {
  data: SwissBracketData
  citySlug?: string
}

export function SwissBracketMobile({ data, citySlug }: SwissBracketMobileProps) {
  // Выбираем текущий раунд: первый, где есть незавершённые матчи (или последний)
  const defaultRound = useMemo(() => {
    const idx = data.rounds.findIndex((r) => r.groups.some((g) => g.matches.some((m) => m.status !== 'FINISHED')))
    return idx >= 0 ? idx : data.rounds.length - 1
  }, [data.rounds])

  const [activeRoundIdx, setActiveRoundIdx] = useState(Math.max(0, defaultRound))
  const activeRound = data.rounds[activeRoundIdx]

  // Прошедшие/вылетевшие для текущего раунда
  const roundAdvanced = data.advanced.filter((t) => t.afterRound === activeRound?.number)
  const roundEliminated = data.eliminated.filter((t) => t.afterRound === activeRound?.number)

  return (
    <VStack gap={3} align="stretch" minW={0} w="100%">
      {/* Табы раундов */}
      <Flex
        gap={1}
        overflowX="auto"
        overflowY="hidden"
        pb={1}
        w="100%"
        minW={0}
        css={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { height: '4px' },
        }}
      >
        {data.rounds.map((round, idx) => {
          const isActive = idx === activeRoundIdx
          const hasLive = round.groups.some((g) => g.matches.some((m) => m.status === 'LIVE'))
          const allFinished = round.groups.every((g) => g.matches.every((m) => m.status === 'FINISHED'))

          return (
            <Box
              key={round.number}
              flexShrink={0}
              px={{ base: 4, md: 3 }}
              py={{ base: 2, md: 1.5 }}
              borderRadius="md"
              cursor="pointer"
              fontSize="clamp(0.875rem, 3.5vw, 1.125rem)"
              fontWeight={isActive ? 'bold' : 'medium'}
              bg={isActive ? 'colorPalette.subtle' : 'transparent'}
              color={isActive ? 'colorPalette.fg' : 'fg.muted'}
              colorPalette={hasLive ? 'red' : allFinished ? 'green' : 'gray'}
              borderWidth="1px"
              borderColor={isActive ? 'colorPalette.muted' : 'transparent'}
              transition="all 0.2s"
              onClick={() => setActiveRoundIdx(idx)}
              whiteSpace="nowrap"
            >
              Тур {round.number}
              {hasLive && ' *'}
            </Box>
          )
        })}
      </Flex>

      {/* Группы текущего раунда */}
      {activeRound && (
        <VStack gap={4} align="stretch">
          {activeRound.groups.map((group) => (
            <SwissGroupCard key={group.wl} group={group} nodeType="group" citySlug={citySlug} />
          ))}

          {/* Прошедшие в этом раунде */}
          {roundAdvanced.length > 0 && (
            <Box>
              <Flex gap={2} align="center" mb={2}>
                <Badge colorPalette="green" size="sm">
                  В плей-офф
                </Badge>
              </Flex>
              <VStack gap={1} align="stretch">
                {roundAdvanced.map((t) => (
                  <Text
                    key={t.id}
                    fontSize={{ base: 'clamp(0.875rem, 3.5vw, 1.125rem)', md: 'sm' }}
                    color="green.fg"
                    fontWeight="medium"
                  >
                    {t.name} ({t.wl})
                  </Text>
                ))}
              </VStack>
            </Box>
          )}

          {/* Вылетевшие в этом раунде */}
          {roundEliminated.length > 0 && (
            <Box>
              <Flex gap={2} align="center" mb={2}>
                <Badge colorPalette="red" size="sm">
                  Вылет
                </Badge>
              </Flex>
              <VStack gap={1} align="stretch">
                {roundEliminated.map((t) => (
                  <Text
                    key={t.id}
                    fontSize={{ base: 'clamp(0.875rem, 3.5vw, 1.125rem)', md: 'sm' }}
                    color="red.fg"
                    fontWeight="medium"
                  >
                    {t.name} ({t.wl})
                  </Text>
                ))}
              </VStack>
            </Box>
          )}

          {activeRound.groups.length === 0 && (
            <Text color="fg.muted" textAlign="center" py={8}>
              Тур ещё не начался
            </Text>
          )}
        </VStack>
      )}

      {/* Общая сводка */}
      <Flex gap={4} justify="center" pt={2}>
        <Text fontSize={{ base: 'clamp(0.75rem, 3vw, 1rem)', md: 'xs' }} color="fg.subtle">
          В плей-офф: {data.advanced.length}/{Math.ceil(data.totalTeams / 2)}
        </Text>
        <Text fontSize={{ base: 'clamp(0.75rem, 3vw, 1rem)', md: 'xs' }} color="fg.subtle">
          Вылетели: {data.eliminated.length}/{Math.ceil(data.totalTeams / 2)}
        </Text>
      </Flex>
    </VStack>
  )
}
