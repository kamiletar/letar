import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Container, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { ApplicationActions } from './_components/application-actions'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

const sellerStatusLabels: Record<string, string> = {
  PENDING: 'На модерации',
  ACTIVE: 'Активен',
  SUSPENDED: 'Заблокирован',
  CLOSED: 'Закрыт',
}

const sellerStatusColors: Record<string, string> = {
  PENDING: 'orange',
  ACTIVE: 'green',
  SUSPENDED: 'red',
  CLOSED: 'gray',
}

const applicationStatusLabels: Record<string, string> = {
  PENDING: 'На рассмотрении',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
}

const applicationStatusColors: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
}

export default async function AdminSellersPage({ searchParams }: PageProps) {
  const user = await requireAdmin()
  const { tab = 'sellers' } = await searchParams
  const db = getEnhancedPrisma(user)

  // Загрузить данные в зависимости от таба
  const [sellers, applications, pendingCount] = await Promise.all([
    db.seller.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        shopName: true,
        slug: true,
        status: true,
        contactEmail: true,
        commissionRate: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        _count: { select: { products: true, subOrders: true } },
      },
    }),
    db.sellerApplication.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        shopName: true,
        status: true,
        contactEmail: true,
        contactPhone: true,
        inn: true,
        portfolioLinks: true,
        reviewNote: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    db.sellerApplication.count({ where: { status: 'PENDING' } }),
  ])

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={6} align="stretch">
        <Heading size="2xl" textTransform="none">
          Продавцы
        </Heading>

        {/* Табы */}
        <HStack gap={4}>
          <NextLink href="/admin/sellers?tab=sellers">
            <Text
              fontWeight={tab === 'sellers' ? 'bold' : 'normal'}
              textDecoration={tab === 'sellers' ? 'underline' : 'none'}
            >
              Продавцы ({sellers.length})
            </Text>
          </NextLink>
          <NextLink href="/admin/sellers?tab=applications">
            <HStack gap={1}>
              <Text
                fontWeight={tab === 'applications' ? 'bold' : 'normal'}
                textDecoration={tab === 'applications' ? 'underline' : 'none'}
              >
                Заявки ({applications.length})
              </Text>
              {pendingCount > 0 && (
                <Badge colorPalette="orange" size="sm">
                  {pendingCount}
                </Badge>
              )}
            </HStack>
          </NextLink>
        </HStack>

        {/* Таблица продавцов */}
        {tab === 'sellers' && (
          <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Магазин</Table.ColumnHeader>
                  <Table.ColumnHeader>Владелец</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader>Комиссия</Table.ColumnHeader>
                  <Table.ColumnHeader>Товаров</Table.ColumnHeader>
                  <Table.ColumnHeader>Заказов</Table.ColumnHeader>
                  <Table.ColumnHeader>Дата</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sellers.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={7}>
                      <Text textAlign="center" color="fg.muted" py={4}>
                        Нет продавцов
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  sellers.map((seller) => (
                    <Table.Row key={seller.id}>
                      <Table.Cell>
                        <VStack align="start" gap={0}>
                          <NextLink href={`/shop/${seller.slug}`}>
                            <Text fontWeight="medium" _hover={{ textDecoration: 'underline' }}>
                              {seller.shopName}
                            </Text>
                          </NextLink>
                          <Text fontSize="xs" color="fg.muted">
                            {seller.contactEmail}
                          </Text>
                        </VStack>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{seller.user.name || seller.user.email}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={sellerStatusColors[seller.status] || 'gray'}>
                          {sellerStatusLabels[seller.status] || seller.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{(Number(seller.commissionRate) * 100).toFixed(0)}%</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{seller._count.products}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{seller._count.subOrders}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{seller.createdAt.toLocaleDateString('ru-RU')}</Text>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        )}

        {/* Таблица заявок */}
        {tab === 'applications' && (
          <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Магазин</Table.ColumnHeader>
                  <Table.ColumnHeader>Заявитель</Table.ColumnHeader>
                  <Table.ColumnHeader>Контакты</Table.ColumnHeader>
                  <Table.ColumnHeader>ИНН</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader>Дата</Table.ColumnHeader>
                  <Table.ColumnHeader>Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {applications.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={7}>
                      <Text textAlign="center" color="fg.muted" py={4}>
                        Нет заявок
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  applications.map((app) => (
                    <Table.Row key={app.id}>
                      <Table.Cell>
                        <Text fontWeight="medium">{app.shopName}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{app.user.name || app.user.email}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <VStack align="start" gap={0}>
                          <Text fontSize="xs">{app.contactEmail}</Text>
                          <Text fontSize="xs">{app.contactPhone}</Text>
                        </VStack>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{app.inn || '—'}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <VStack align="start" gap={1}>
                          <Badge colorPalette={applicationStatusColors[app.status] || 'gray'}>
                            {applicationStatusLabels[app.status] || app.status}
                          </Badge>
                          {app.reviewNote && (
                            <Text fontSize="xs" color="fg.muted">
                              {app.reviewNote}
                            </Text>
                          )}
                        </VStack>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{app.createdAt.toLocaleDateString('ru-RU')}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        {app.status === 'PENDING' ? (
                          <ApplicationActions applicationId={app.id} />
                        ) : (
                          <Text fontSize="xs" color="fg.muted">
                            Обработана
                          </Text>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
