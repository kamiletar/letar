'use client'

import { Badge, Box, Button, Card, HStack, Text, VStack } from '@chakra-ui/react'
import type { LicenseCategory, PartnershipStatus } from '@letar/driving-school-db/prisma'
import { LuBuilding2, LuCalendar, LuPause, LuPlay, LuTrash2 } from 'react-icons/lu'

import type { PartnershipSummary } from '../../_actions/partnership.action'

// Локализация статусов
const STATUS_LABELS: Record<PartnershipStatus, string> = {
  PENDING: 'Ожидает',
  ACTIVE: 'Активно',
  SUSPENDED: 'Приостановлено',
  TERMINATED: 'Расторгнуто',
}

const STATUS_COLORS: Record<PartnershipStatus, string> = {
  PENDING: 'yellow',
  ACTIVE: 'green',
  SUSPENDED: 'orange',
  TERMINATED: 'red',
}

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

interface PartnershipCardProps {
  partnership: PartnershipSummary
  currentSchoolId: string
  onSuspend?: () => void
  onResume?: () => void
  onTerminate?: () => void
  isLoading?: boolean
}

/**
 * Карточка партнёрства между автошколами
 */
export function PartnershipCard({
  partnership,
  currentSchoolId,
  onSuspend,
  onResume,
  onTerminate,
  isLoading,
}: PartnershipCardProps) {
  const isInitiator = partnership.initiatorOrg.id === currentSchoolId
  const otherSchool = isInitiator ? partnership.partnerOrg : partnership.initiatorOrg
  const roleLabel = isInitiator ? 'Вы направляете' : 'Вы принимаете'

  return (
    <Card.Root variant="outline" size="sm">
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {/* Заголовок */}
          <HStack justify="space-between">
            <HStack>
              <Box bg="bg.muted" borderRadius="md" p={2} display="flex" alignItems="center" justifyContent="center">
                <LuBuilding2 />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontWeight="semibold">{otherSchool.name}</Text>
                <Text fontSize="sm" color="fg.muted">
                  {roleLabel}
                </Text>
              </VStack>
            </HStack>
            <Badge colorPalette={STATUS_COLORS[partnership.status]}>{STATUS_LABELS[partnership.status]}</Badge>
          </HStack>

          {/* Категории */}
          {partnership.categories.length > 0 && (
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={1}>
                Категории:
              </Text>
              <HStack wrap="wrap" gap={1}>
                {partnership.categories
                  .filter((c) => c.isActive)
                  .map((cat) => (
                    <Badge key={cat.id} variant="subtle">
                      {CATEGORY_LABELS[cat.category] ?? cat.category}
                      {cat.pricePerLesson && (
                        <Text as="span" ml={1} color="fg.muted">
                          ({cat.pricePerLesson}₽)
                        </Text>
                      )}
                    </Badge>
                  ))}
              </HStack>
            </Box>
          )}

          {/* Условия */}
          {partnership.terms && (
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Условия:
              </Text>
              <Text fontSize="sm" lineClamp={2}>
                {partnership.terms}
              </Text>
            </Box>
          )}

          {/* Срок действия */}
          {partnership.expiresAt && (
            <HStack fontSize="sm" color="fg.muted">
              <LuCalendar />
              <Text>Действует до: {new Date(partnership.expiresAt).toLocaleDateString('ru-RU')}</Text>
            </HStack>
          )}

          {/* Действия (только для инициатора и активных/приостановленных) */}
          {isInitiator && partnership.status !== 'PENDING' && partnership.status !== 'TERMINATED' && (
            <HStack justify="flex-end" pt={2}>
              {partnership.status === 'ACTIVE' && onSuspend && (
                <Button size="sm" variant="ghost" colorPalette="orange" onClick={onSuspend} loading={isLoading}>
                  <LuPause />
                  Приостановить
                </Button>
              )}
              {partnership.status === 'SUSPENDED' && onResume && (
                <Button size="sm" variant="ghost" colorPalette="green" onClick={onResume} loading={isLoading}>
                  <LuPlay />
                  Возобновить
                </Button>
              )}
              {onTerminate && (
                <Button size="sm" variant="ghost" colorPalette="red" onClick={onTerminate} loading={isLoading}>
                  <LuTrash2 />
                  Расторгнуть
                </Button>
              )}
            </HStack>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
