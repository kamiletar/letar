'use client'

import { VStack } from '@chakra-ui/react'
import { LuCheck } from 'react-icons/lu'

import { AnimeModerationCard } from '../cards/anime-moderation-card'
import { EmptyState } from '../common/empty-state'
import type { AnimeItem, PinServer } from '../types'

interface ModerationTabProps {
  pendingAnime: AnimeItem[]
  pinServers: PinServer[]
  userRole: string
  onModerate: (animeId: string, action: 'approve' | 'reject' | 'approve_replacement', pin?: boolean) => void
}

export function ModerationTab({ pendingAnime, pinServers, userRole, onModerate }: ModerationTabProps) {
  return (
    <VStack align="stretch" gap={4} mt={4}>
      {pendingAnime.length === 0 ? (
        <EmptyState icon={LuCheck} title="Всё проверено!" subtitle="Нет аниме на модерации" />
      ) : (
        pendingAnime.map((anime) => (
          <AnimeModerationCard
            key={anime.id}
            anime={anime}
            pinServers={pinServers}
            userRole={userRole}
            onApprove={() => onModerate(anime.id, 'approve')}
            onApproveAndPin={() => onModerate(anime.id, 'approve', true)}
            onApproveReplacement={() => onModerate(anime.id, 'approve_replacement')}
            onApproveReplacementAndPin={() => onModerate(anime.id, 'approve_replacement', true)}
            onReject={() => onModerate(anime.id, 'reject')}
          />
        ))
      )}
    </VStack>
  )
}
