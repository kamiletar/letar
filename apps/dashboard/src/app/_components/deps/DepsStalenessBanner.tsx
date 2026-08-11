'use client'

import { formatDateTime } from '@/lib/format'
import { Badge, Box, Button, HStack, Text } from '@chakra-ui/react'
import { LuCopy } from 'react-icons/lu'

interface Props {
  lockfileUpdatedAt: string | null
  lastScanAt: string | null
}

const COMMAND = 'bun scripts/deps-scan.ts'

/**
 * Возраст lockfile: ≤7 дней скрыт, 7–14 жёлтый, >14 красный (§25 PLAN-INFRA.md).
 */
export function DepsStalenessBanner({ lockfileUpdatedAt, lastScanAt }: Props) {
  if (!lockfileUpdatedAt) {
    return null
  }

  const days = Math.floor((Date.now() - new Date(lockfileUpdatedAt).getTime()) / (1000 * 60 * 60 * 24))

  if (days <= 7) {
    return null
  }

  const severe = days > 14

  return (
    <Box
      borderWidth="1px"
      borderColor={severe ? 'red.500' : 'yellow.500'}
      bg={severe ? 'red.subtle' : 'yellow.subtle'}
      borderRadius="md"
      p="4"
      mb="6"
    >
      <HStack justify="space-between" flexWrap="wrap" gap="3">
        <Box>
          <HStack gap="2" mb="1">
            <Badge colorPalette={severe ? 'red' : 'yellow'}>{severe ? 'Критично' : 'Внимание'}</Badge>
            <Text fontWeight="medium">
              Зависимости не обновлялись {days} дн. (lockfile от {formatDateTime(lockfileUpdatedAt)})
            </Text>
          </HStack>
          <Text fontSize="sm" color="fg.muted">
            {lastScanAt ? `Последний скан: ${formatDateTime(lastScanAt)}` : 'Скан ни разу не запускался'}
          </Text>
        </Box>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigator.clipboard?.writeText(COMMAND)}
        >
          <LuCopy /> Скопировать команду
        </Button>
      </HStack>
    </Box>
  )
}
