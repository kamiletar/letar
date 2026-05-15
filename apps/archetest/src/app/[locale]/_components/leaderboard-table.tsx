'use client'

import { Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import type { LeaderboardEntry } from '../_actions/leaderboard.action'
import { LeaderboardUserRow } from './leaderboard-user-row'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  const t = useTranslations('quiz.leaderboard')

  if (entries.length === 0) {
    return (
      <VStack py={12} gap={2}>
        <Text fontSize="lg">🏆</Text>
        <Text color="fg.muted">{t('empty')}</Text>
      </VStack>
    )
  }

  return (
    <VStack gap={2} w="100%">
      {entries.map((entry, i) => (
        <LeaderboardUserRow
          key={entry.userId}
          entry={entry}
          position={i + 1}
          isCurrentUser={entry.userId === currentUserId}
        />
      ))}
    </VStack>
  )
}
