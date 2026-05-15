'use client'

import { Card, SimpleGrid, Text, VStack } from '@chakra-ui/react'

import type { RateLimitStats } from './types'

interface StatsGridProps {
  stats: RateLimitStats | null
}

/**
 * Сетка карточек со статистикой Rate Limiting.
 */
export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} gap={4}>
      <Card.Root>
        <Card.Body>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold">
              {stats?.defaultLimit || 100}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Лимит по умолчанию
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
      <Card.Root>
        <Card.Body>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold">
              {stats?.windowSeconds || 60}с
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Окно лимита
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
      <Card.Root>
        <Card.Body>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold">
              {stats?.activeKeys || 0}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Активных ключей
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
      <Card.Root>
        <Card.Body>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="info.solid">
              {stats?.customLimits || 0}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Кастомных лимитов
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
      <Card.Root>
        <Card.Body>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="success.solid">
              {stats?.whitelisted || 0}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              В whitelist
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
      <Card.Root>
        <Card.Body>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="error.solid">
              {stats?.blacklisted || 0}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              В blacklist
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    </SimpleGrid>
  )
}
