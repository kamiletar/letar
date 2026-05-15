'use client'

import { Box, EmptyState, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuHandshake } from 'react-icons/lu'

import type { PartnershipSummary } from '../../_actions/partnership.action'
import { PartnershipCard } from './partnership-card'

interface PartnershipsListProps {
  partnerships: PartnershipSummary[]
  currentSchoolId: string
  onSuspend: (partnershipId: string) => void
  onResume: (partnershipId: string) => void
  onTerminate: (partnershipId: string) => void
  loadingId?: string
}

/**
 * Список партнёрств между автошколами
 */
export function PartnershipsList({
  partnerships,
  currentSchoolId,
  onSuspend,
  onResume,
  onTerminate,
  loadingId,
}: PartnershipsListProps) {
  if (partnerships.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuHandshake />
          </EmptyState.Indicator>
          <EmptyState.Title>Нет партнёрств</EmptyState.Title>
          <EmptyState.Description>
            Создайте партнёрство с другой автошколой для обмена учениками по определённым категориям
          </EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  // Группируем партнёрства по статусу
  const activePartnerships = partnerships.filter((p) => p.status === 'ACTIVE')
  const pendingPartnerships = partnerships.filter((p) => p.status === 'PENDING')
  const suspendedPartnerships = partnerships.filter((p) => p.status === 'SUSPENDED')
  const terminatedPartnerships = partnerships.filter((p) => p.status === 'TERMINATED')

  return (
    <VStack gap={6} align="stretch">
      {/* Ожидающие */}
      {pendingPartnerships.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4} color="yellow.fg">
            Ожидают ответа ({pendingPartnerships.length})
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {pendingPartnerships.map((partnership) => (
              <PartnershipCard
                key={partnership.id}
                partnership={partnership}
                currentSchoolId={currentSchoolId}
                isLoading={loadingId === partnership.id}
              />
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Активные */}
      {activePartnerships.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Активные партнёрства ({activePartnerships.length})
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {activePartnerships.map((partnership) => (
              <PartnershipCard
                key={partnership.id}
                partnership={partnership}
                currentSchoolId={currentSchoolId}
                onSuspend={() => onSuspend(partnership.id)}
                onTerminate={() => onTerminate(partnership.id)}
                isLoading={loadingId === partnership.id}
              />
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Приостановленные */}
      {suspendedPartnerships.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4} color="orange.fg">
            Приостановленные ({suspendedPartnerships.length})
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {suspendedPartnerships.map((partnership) => (
              <PartnershipCard
                key={partnership.id}
                partnership={partnership}
                currentSchoolId={currentSchoolId}
                onResume={() => onResume(partnership.id)}
                onTerminate={() => onTerminate(partnership.id)}
                isLoading={loadingId === partnership.id}
              />
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Расторгнутые */}
      {terminatedPartnerships.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4} color="fg.muted">
            Расторгнутые ({terminatedPartnerships.length})
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {terminatedPartnerships.map((partnership) => (
              <PartnershipCard
                key={partnership.id}
                partnership={partnership}
                currentSchoolId={currentSchoolId}
                isLoading={loadingId === partnership.id}
              />
            ))}
          </SimpleGrid>
        </Box>
      )}
    </VStack>
  )
}
