'use client'

import { Badge, Box, Button, Card, HStack, Text, VStack } from '@chakra-ui/react'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import { LuBuilding2, LuCheck, LuX } from 'react-icons/lu'

import type { PartnershipSummary } from '../../_actions/partnership.action'

// Локализация категорий
const CATEGORY_LABELS: Partial<Record<LicenseCategory, string>> = {
  A: 'A (мотоцикл)',
  A1: 'A1',
  B: 'B (авто)',
  B1: 'B1',
  C: 'C (грузовой)',
  C1: 'C1',
  D: 'D (автобус)',
  D1: 'D1',
  M: 'M (мопед)',
  BE: 'BE',
  CE: 'CE',
  DE: 'DE',
  Tb: 'Tb (троллейбус)',
  Tm: 'Tm (трамвай)',
}

interface IncomingRequestCardProps {
  request: PartnershipSummary
  onAccept: () => void
  onReject: () => void
  isLoading?: boolean
}

/**
 * Карточка входящего запроса на партнёрство
 */
export function IncomingRequestCard({ request, onAccept, onReject, isLoading }: IncomingRequestCardProps) {
  return (
    <Card.Root variant="outline" borderColor="yellow.emphasized">
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {/* Заголовок */}
          <HStack justify="space-between">
            <HStack>
              <Box
                bg="yellow.subtle"
                borderRadius="md"
                p={2}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <LuBuilding2 />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontWeight="semibold">{request.initiatorOrg.name}</Text>
                <Text fontSize="sm" color="fg.muted">
                  Запрос на партнёрство
                </Text>
              </VStack>
            </HStack>
            <Badge colorPalette="yellow">Новый запрос</Badge>
          </HStack>

          {/* Категории */}
          {request.categories.length > 0 && (
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={1}>
                Запрашиваемые категории:
              </Text>
              <HStack wrap="wrap" gap={1}>
                {request.categories.map((cat) => (
                  <Badge key={cat.id} variant="subtle" colorPalette="brand">
                    {CATEGORY_LABELS[cat.category] ?? cat.category}
                    {cat.pricePerLesson && (
                      <Text as="span" ml={1}>
                        ({cat.pricePerLesson}₽/занятие)
                      </Text>
                    )}
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}

          {/* Условия */}
          {request.terms && (
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Условия от школы:
              </Text>
              <Text fontSize="sm">{request.terms}</Text>
            </Box>
          )}

          {/* Дата запроса */}
          <Text fontSize="sm" color="fg.muted">
            Получен: {new Date(request.createdAt).toLocaleDateString('ru-RU')}
          </Text>

          {/* Действия */}
          <HStack justify="flex-end" pt={2}>
            <Button size="sm" variant="ghost" colorPalette="red" onClick={onReject} disabled={isLoading}>
              <LuX />
              Отклонить
            </Button>
            <Button size="sm" colorPalette="green" onClick={onAccept} loading={isLoading}>
              <LuCheck />
              Принять
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
