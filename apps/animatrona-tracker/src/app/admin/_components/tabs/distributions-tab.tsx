'use client'

import { VStack } from '@chakra-ui/react'
import { LuShare2 } from 'react-icons/lu'

import { DistributionCard } from '../cards/distribution-card'
import { EmptyState } from '../common/empty-state'
import type { Distribution } from '../types'

interface DistributionsTabProps {
  distributions: Distribution[]
}

export function DistributionsTab({ distributions }: DistributionsTabProps) {
  return (
    <VStack align="stretch" gap={4} mt={4}>
      {distributions.length === 0 ? (
        <EmptyState
          icon={LuShare2}
          title="Нет раздач"
          subtitle="Активные раздачи появятся когда Desktop начнёт сидировать"
        />
      ) : (
        distributions.map((dist) => <DistributionCard key={dist.id} distribution={dist} />)
      )}
    </VStack>
  )
}
