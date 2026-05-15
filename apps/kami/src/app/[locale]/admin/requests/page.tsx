import { prisma } from '@/lib/db'
import {
  ADMIN_PAGE_SIZE,
  REQUEST_STATUS_COLORS,
  REQUEST_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from '@/lib/utils/constants'
import { Badge, Box, HStack, Table, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { AdminPageLayout } from '../_components'

interface RequestsPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ status?: string; page?: string }>
}

/**
 * Фильтр по статусу заявок
 */
function StatusFilter({ locale, currentStatus }: { locale: string; currentStatus?: string }) {
  return (
    <HStack gap={2} flexWrap="wrap">
      <Link href={`/${locale}/admin/requests`}>
        <Badge variant={!currentStatus ? 'solid' : 'subtle'} colorPalette="gray" px={3} py={1} cursor="pointer">
          Все
        </Badge>
      </Link>
      {Object.entries(REQUEST_STATUS_LABELS).map(([key, label]) => (
        <Link key={key} href={`/${locale}/admin/requests?status=${key}`}>
          <Badge
            variant={currentStatus === key ? 'solid' : 'subtle'}
            colorPalette={REQUEST_STATUS_COLORS[key]}
            px={3}
            py={1}
            cursor="pointer"
          >
            {label}
          </Badge>
        </Link>
      ))}
    </HStack>
  )
}

/**
 * Список заявок на консультации
 */
export default async function RequestsPage({ params, searchParams }: RequestsPageProps) {
  const { locale } = await params
  const { status, page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const whereClause = status ? { status } : undefined

  // Параллельные запросы: данные + count
  const [requests, total] = await Promise.all([
    prisma.consultingRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: ADMIN_PAGE_SIZE,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        telegram: true,
        status: true,
        serviceType: true,
        createdAt: true,
        service: {
          select: { title: true },
        },
        bookedSlots: {
          select: { id: true },
        },
      },
    }),
    prisma.consultingRequest.count({ where: whereClause }),
  ])

  return (
    <AdminPageLayout
      title="Заявки"
      total={total}
      basePath={`/${locale}/admin/requests`}
      emptyText="Заявок пока нет"
      isEmpty={requests.length === 0}
      headerExtra={<StatusFilter locale={locale} currentStatus={status} />}
    >
      <Box overflowX="auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Клиент</Table.ColumnHeader>
              <Table.ColumnHeader>Услуга</Table.ColumnHeader>
              <Table.ColumnHeader>Статус</Table.ColumnHeader>
              <Table.ColumnHeader>Слоты</Table.ColumnHeader>
              <Table.ColumnHeader>Дата</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {requests.map((request) => (
              <Table.Row key={request.id}>
                <Table.Cell>
                  <VStack align="start" gap={0}>
                    <Text fontWeight="medium">{request.name}</Text>
                    <Text fontSize="sm" color="fg.muted">
                      {request.email}
                    </Text>
                    {request.telegram && (
                      <Text fontSize="sm" color="fg.muted">
                        @{request.telegram.replace('@', '')}
                      </Text>
                    )}
                  </VStack>
                </Table.Cell>
                <Table.Cell>
                  <VStack align="start" gap={0}>
                    {request.service?.title && <Text fontSize="sm">{request.service.title}</Text>}
                    {request.serviceType && (
                      <Badge variant="subtle" colorPalette="gray" size="sm">
                        {SERVICE_TYPE_LABELS[request.serviceType] || request.serviceType}
                      </Badge>
                    )}
                  </VStack>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="subtle" colorPalette={REQUEST_STATUS_COLORS[request.status] || 'gray'}>
                    {REQUEST_STATUS_LABELS[request.status] || request.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {request.bookedSlots.length > 0 ? (
                    <Badge variant="subtle" colorPalette="purple">
                      {request.bookedSlots.length}
                    </Badge>
                  ) : (
                    <Text color="fg.muted">—</Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm" color="fg.muted">
                    {new Date(request.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </AdminPageLayout>
  )
}
