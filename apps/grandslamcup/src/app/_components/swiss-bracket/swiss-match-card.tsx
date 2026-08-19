'use client'

/**
 * Карточка матча внутри Swiss bracket W-L группы.
 * Компактнее чем BracketMatchCard — показывает 2 команды в одну строку.
 */

import type { SwissBracketMatch } from '@/lib/swiss-bracket'
import { Badge, Flex, Text } from '@chakra-ui/react'
import Link from 'next/link'

interface SwissMatchCardProps {
  match: SwissBracketMatch
  citySlug?: string
}

export function SwissMatchCard({ match, citySlug }: SwissMatchCardProps) {
  const { homeTeam, awayTeam, homeScore, awayScore, status, matchId, winnerId } = match
  const isFinished = status === 'FINISHED'
  const isLive = status === 'LIVE'

  const homeIsWinner = isFinished && winnerId === homeTeam.id
  const awayIsWinner = isFinished && winnerId === awayTeam.id

  const content = (
    <Flex
      gap={{ base: 3, md: 2 }}
      align="center"
      py={{ base: 2.5, md: 1.5 }}
      px={{ base: 3, md: 2 }}
      borderRadius="md"
      bg={{ base: 'white', _dark: 'bg.panel' }}
      borderWidth="1px"
      borderColor={isLive ? 'red.emphasized' : 'border.emphasized'}
      _hover={matchId ? { borderColor: { base: 'gray.400', _dark: 'border.inverted' }, shadow: 'sm' } : undefined}
      cursor={matchId ? 'pointer' : 'default'}
      transitionProperty="border-color, box-shadow"
      transitionDuration="0.15s"
    >
      {/* Домашняя команда */}
      <Text
        fontSize={{ base: 'clamp(0.875rem, 3.5vw, 1.125rem)', md: 'xs' }}
        fontWeight={homeIsWinner ? 'bold' : 'normal'}
        color={homeIsWinner ? 'green.fg' : awayIsWinner ? 'fg.subtle' : 'fg'}
        flex={1}
        truncate
        textAlign="right"
      >
        {homeTeam.name}
      </Text>

      {/* Счёт */}
      <Flex gap={1} align="center" flexShrink={0} minW={{ base: '56px', md: '48px' }} justify="center">
        {isFinished || isLive
          ? (
            <>
              <Text
                fontSize={{ base: 'clamp(0.9375rem, 4vw, 1.25rem)', md: 'xs' }}
                fontWeight={homeIsWinner ? 'bold' : 'medium'}
                color={homeIsWinner ? 'green.fg' : 'fg'}
              >
                {homeScore}
              </Text>
              <Text fontSize={{ base: 'clamp(0.75rem, 3vw, 1rem)', md: '2xs' }} color="fg.subtle">
                :
              </Text>
              <Text
                fontSize={{ base: 'clamp(0.9375rem, 4vw, 1.25rem)', md: 'xs' }}
                fontWeight={awayIsWinner ? 'bold' : 'medium'}
                color={awayIsWinner ? 'green.fg' : 'fg'}
              >
                {awayScore}
              </Text>
            </>
          )
          : (
            <Text fontSize={{ base: 'clamp(0.75rem, 3vw, 1rem)', md: '2xs' }} color="fg.subtle">
              vs
            </Text>
          )}
        {isLive && (
          <Badge size="xs" colorPalette="red" ml={1}>
            LIVE
          </Badge>
        )}
      </Flex>

      {/* Гостевая команда */}
      <Text
        fontSize={{ base: 'clamp(0.875rem, 3.5vw, 1.125rem)', md: 'xs' }}
        fontWeight={awayIsWinner ? 'bold' : 'normal'}
        color={awayIsWinner ? 'green.fg' : homeIsWinner ? 'fg.subtle' : 'fg'}
        flex={1}
        truncate
      >
        {awayTeam.name}
      </Text>
    </Flex>
  )

  if (matchId) {
    const href = citySlug ? `/${citySlug}/matches/${matchId}` : `/matches/${matchId}`
    return <Link href={href}>{content}</Link>
  }

  return content
}
