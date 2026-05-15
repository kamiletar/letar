import { OptimizedImage } from '@/app/_components/ui/optimized-image'
import { prisma } from '@/lib/db'
import { ADMIN_PAGE_SIZE, SERVICE_TYPE_LABELS } from '@/lib/utils/constants'
import { Badge, Box, HStack, Table, Text, VStack } from '@chakra-ui/react'
import { AdminPageLayout, AdminTableActions, PublishStatusBadge } from '../_components'

interface CasesPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

/**
 * Управление кейсами
 */
export default async function CasesPage({ params, searchParams }: CasesPageProps) {
  const { locale } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  // Параллельные запросы: данные + count
  const [cases, total] = await Promise.all([
    prisma.consultingCase.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      take: ADMIN_PAGE_SIZE,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        excerpt: true,
        coverImage: true,
        clientName: true,
        industry: true,
        serviceType: true,
        isPublished: true,
        isFeatured: true,
      },
    }),
    prisma.consultingCase.count(),
  ])

  return (
    <AdminPageLayout
      title="Кейсы"
      total={total}
      basePath={`/${locale}/admin/cases`}
      addPath={`/${locale}/admin/cases/new`}
      emptyText="Кейсов пока нет"
      isEmpty={cases.length === 0}
    >
      <Box overflowX="auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Кейс</Table.ColumnHeader>
              <Table.ColumnHeader>Клиент</Table.ColumnHeader>
              <Table.ColumnHeader>Тип</Table.ColumnHeader>
              <Table.ColumnHeader>Статус</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {cases.map((caseItem) => (
              <Table.Row key={caseItem.id}>
                <Table.Cell>
                  <HStack gap={3}>
                    {caseItem.coverImage && (
                      <OptimizedImage src={caseItem.coverImage} alt={caseItem.title} boxSize="50px" borderRadius="md" />
                    )}
                    <VStack align="start" gap={0}>
                      <Text fontWeight="medium">{caseItem.title}</Text>
                      <Text fontSize="sm" color="fg.muted" lineClamp={1}>
                        {caseItem.excerpt}
                      </Text>
                    </VStack>
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <VStack align="start" gap={0}>
                    {caseItem.clientName ? (
                      <Text fontSize="sm">{caseItem.clientName}</Text>
                    ) : (
                      <Text fontSize="sm" color="fg.muted">
                        —
                      </Text>
                    )}
                    {caseItem.industry && (
                      <Badge variant="subtle" colorPalette="gray" size="sm">
                        {caseItem.industry}
                      </Badge>
                    )}
                  </VStack>
                </Table.Cell>
                <Table.Cell>
                  {caseItem.serviceType ? (
                    <Badge variant="subtle" colorPalette="blue">
                      {SERVICE_TYPE_LABELS[caseItem.serviceType] || caseItem.serviceType}
                    </Badge>
                  ) : (
                    <Text color="fg.muted">—</Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <PublishStatusBadge isPublished={caseItem.isPublished} isFeatured={caseItem.isFeatured} />
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <AdminTableActions editPath={`/${locale}/admin/cases/${caseItem.id}`} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </AdminPageLayout>
  )
}
