import { Box, Heading, Text } from '@chakra-ui/react'

import type { AuditAction } from '@letar/driving-school-db/prisma'

import { AuditFilters } from './_components/audit-filters'
import { AuditLogsInfinite } from './_components/audit-logs-infinite'

export const metadata = {
  title: 'Аудит действий',
  description: 'Журнал всех действий на платформе',
}

interface PageProps {
  searchParams: Promise<{
    action?: AuditAction | 'all'
    dateRange?: 'today' | 'week' | 'month' | 'all'
    search?: string
  }>
}

export default async function AuditPage({ searchParams }: PageProps) {
  const params = await searchParams

  const filters = {
    action: params.action || 'all',
    dateRange: params.dateRange || 'all',
    search: params.search || '',
  }

  return (
    <>
      {/* Заголовок */}
      <Box>
        <Heading size="xl">Аудит действий</Heading>
        <Text color="fg.muted" mt={2}>
          Журнал всех действий пользователей на платформе
        </Text>
      </Box>

      {/* Фильтры */}
      <AuditFilters currentFilters={filters} />

      {/* Таблица логов с Infinite Scroll */}
      <AuditLogsInfinite filters={filters} />
    </>
  )
}
