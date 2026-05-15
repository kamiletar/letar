'use client'

import { licenseCategoryLabels, transmissionTypeLabels } from '@/driving-school-form/labels'
import { Badge, Box, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { formatDate } from '@letar/format-utils'
import { LuCalendar, LuCheck, LuClock, LuPencil, LuTrash2 } from 'react-icons/lu'
import type { StudentLicenseData } from '../_actions/license.action'
import { isLicenseExpired, isLicenseExpiringSoon } from '../_utils/license.utils'

interface LicenseCardProps {
  license: StudentLicenseData
  onRenew: (license: StudentLicenseData) => void
  onDelete: (license: StudentLicenseData) => void
}

export function LicenseCard({ license, onRenew, onDelete }: LicenseCardProps) {
  const expired = isLicenseExpired(license.expiresAt)
  const expiringSoon = !expired && isLicenseExpiringSoon(license.expiresAt)
  const categoryLabel = licenseCategoryLabels[license.category] || license.category

  // Определяем цвет бейджа статуса
  const getStatusBadge = () => {
    if (expired) {
      return (
        <Badge colorPalette="red" variant="solid">
          Истекли
        </Badge>
      )
    }
    if (expiringSoon) {
      return (
        <Badge colorPalette="orange" variant="solid">
          Скоро истекают
        </Badge>
      )
    }
    if (license.isVerified) {
      return (
        <Badge colorPalette="green" variant="subtle">
          <Icon size="sm">
            <LuCheck />
          </Icon>
          Подтверждены
        </Badge>
      )
    }
    return (
      <Badge colorPalette="gray" variant="subtle">
        <Icon size="sm">
          <LuClock />
        </Icon>
        Ожидает проверки
      </Badge>
    )
  }

  // Ограничение по трансмиссии
  const transmissionLabel = license.transmissionRestriction
    ? transmissionTypeLabels[license.transmissionRestriction] || license.transmissionRestriction
    : null

  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="lg"
      bg={expired ? 'red.subtle' : expiringSoon ? 'orange.subtle' : 'bg.panel'}
      borderColor={expired ? 'red.muted' : expiringSoon ? 'orange.muted' : 'border.muted'}
    >
      <VStack align="stretch" gap={3}>
        {/* Заголовок с категорией и статусом */}
        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <HStack gap={2}>
            <Badge size="lg" colorPalette="blue" variant="solid">
              {license.category}
            </Badge>
            <Text fontWeight="medium">{categoryLabel.split(' — ')[1] || categoryLabel}</Text>
          </HStack>
          {getStatusBadge()}
        </HStack>

        {/* Ограничение по трансмиссии */}
        {transmissionLabel && (
          <HStack gap={2}>
            <Text fontSize="sm" color="fg.muted">
              Ограничение:
            </Text>
            <Badge colorPalette="purple" variant="subtle">
              Только {transmissionLabel}
            </Badge>
          </HStack>
        )}

        {/* Даты */}
        <HStack gap={4} flexWrap="wrap">
          <HStack gap={1} fontSize="sm" color="fg.muted">
            <Icon size="sm">
              <LuCalendar />
            </Icon>
            <Text>Получены: {formatDate(license.obtainedAt)}</Text>
          </HStack>
          <HStack gap={1} fontSize="sm" color={expired ? 'red.fg' : expiringSoon ? 'orange.fg' : 'fg.muted'}>
            <Icon size="sm">
              <LuCalendar />
            </Icon>
            <Text>Действуют до: {formatDate(license.expiresAt)}</Text>
          </HStack>
        </HStack>

        {/* Информация о верификации */}
        {license.isVerified && license.verifiedAt && (
          <Text fontSize="xs" color="fg.muted">
            Подтверждены инструктором {formatDate(license.verifiedAt)}
          </Text>
        )}

        {/* Кнопки действий */}
        <HStack gap={2} pt={2}>
          {(expired || expiringSoon) && (
            <Button size="sm" colorPalette="brand" onClick={() => onRenew(license)}>
              <Icon>
                <LuPencil />
              </Icon>
              Обновить права
            </Button>
          )}
          <Button size="sm" variant="ghost" colorPalette="red" onClick={() => onDelete(license)}>
            <Icon>
              <LuTrash2 />
            </Icon>
            Удалить
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
