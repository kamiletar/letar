'use client'

import { Card, Heading, Text, VStack } from '@chakra-ui/react'

import type { RateLimitStats } from './types'

interface InfoCardProps {
  stats: RateLimitStats | null
}

/**
 * Информационная карточка о работе Rate Limiting.
 */
export function InfoCard({ stats }: InfoCardProps) {
  return (
    <Card.Root bg="bg.muted">
      <Card.Body>
        <VStack align="start" gap={2}>
          <Heading size="sm">Как работает Rate Limiting</Heading>
          <Text fontSize="sm" color="fg.muted">
            • <strong>Лимит по умолчанию:</strong> {stats?.defaultLimit || 100} запросов в минуту на API-ключ
          </Text>
          <Text fontSize="sm" color="fg.muted">
            • <strong>Кастомный лимит:</strong> Можно установить индивидуальный лимит для каждой организации
          </Text>
          <Text fontSize="sm" color="fg.muted">
            • <strong>Whitelist:</strong> Организации без ограничений (для партнёров, крупных клиентов)
          </Text>
          <Text fontSize="sm" color="fg.muted">
            • <strong>Blacklist:</strong> Полная блокировка API-доступа (при злоупотреблениях)
          </Text>
          <Text fontSize="sm" color="fg.muted">
            • <strong>Заголовки ответа:</strong> X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
          </Text>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
