import { UserRole } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Container, Heading, Table, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'

export default async function SpecialistsPage() {
  const session = await getSession()

  // Проверка аутентификации
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Проверка роли (только админ)
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  // Получение enhanced Prisma client с ZenStack политиками
  const db = getEnhancedPrisma(session.user)

  // Получение всех специалистов с их клиентами
  const specialists = await db.user.findMany({
    where: {
      role: UserRole.SPECIALIST,
    },
    include: {
      specialistClients: {
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      accounts: {
        select: {
          providerId: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Статистика
  const stats = {
    total: specialists.length,
    totalClients: specialists.reduce((sum, s) => sum + s.specialistClients.length, 0),
    withClients: specialists.filter((s) => s.specialistClients.length > 0).length,
    withoutClients: specialists.filter((s) => s.specialistClients.length === 0).length,
  }

  const averageClients = stats.total > 0 ? (stats.totalClients / stats.total).toFixed(1) : '0'

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="2xl" textTransform="none" mb={2}>
            Управление специалистами
          </Heading>
          <Text color="fg.muted" mb={4}>
            Все специалисты ИМОТ и их клиенты
          </Text>

          {/* Статистика */}
          <Box display="flex" gap={4} flexWrap="wrap">
            <Badge colorPalette="blue" size="lg">
              Всего специалистов: {stats.total}
            </Badge>
            <Badge colorPalette="green" size="lg">
              Всего клиентов: {stats.totalClients}
            </Badge>
            <Badge colorPalette="purple" size="lg">
              Среднее: {averageClients} клиентов
            </Badge>
            <Badge colorPalette="gray" size="lg">
              С клиентами: {stats.withClients}
            </Badge>
            <Badge colorPalette="orange" size="lg">
              Без клиентов: {stats.withoutClients}
            </Badge>
          </Box>
        </Box>

        {specialists.length > 0 ? (
          <Box overflowX="auto">
            <Table.Root size="sm" variant="outline" data-testid="specialists-table">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Специалист</Table.ColumnHeader>
                  <Table.ColumnHeader>Email</Table.ColumnHeader>
                  <Table.ColumnHeader>Телефон</Table.ColumnHeader>
                  <Table.ColumnHeader>Провайдеры</Table.ColumnHeader>
                  <Table.ColumnHeader>Количество клиентов</Table.ColumnHeader>
                  <Table.ColumnHeader>Последние клиенты</Table.ColumnHeader>
                  <Table.ColumnHeader>Дата регистрации</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {specialists.map((specialist) => {
                  const clientsCount = specialist.specialistClients.length
                  const recentClients = specialist.specialistClients.slice(0, 3)

                  return (
                    <Table.Row key={specialist.id}>
                      <Table.Cell>
                        <Text fontWeight="medium">{specialist.name || '—'}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" fontFamily="mono" color="fg.muted">
                          {specialist.email}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{specialist.phoneNumber || '—'}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          {specialist.accounts.length > 0 ? (
                            specialist.accounts.map((account) => (
                              <Badge key={account.providerId} colorPalette="green" size="sm" variant="subtle">
                                {account.providerId}
                              </Badge>
                            ))
                          ) : (
                            <Badge colorPalette="gray" size="sm" variant="subtle">
                              credentials
                            </Badge>
                          )}
                        </Box>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={clientsCount > 0 ? 'blue' : 'gray'} size="md">
                          {clientsCount} {clientsCount === 1 ? 'клиент' : 'клиентов'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {recentClients.length > 0 ? (
                          <VStack align="stretch" gap={1}>
                            {recentClients.map((client) => (
                              <Text key={client.id} fontSize="xs" color="fg.muted">
                                • {client.name}
                              </Text>
                            ))}
                            {clientsCount > 3 && (
                              <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                                +{clientsCount - 3} ещё
                              </Text>
                            )}
                          </VStack>
                        ) : (
                          <Text fontSize="sm" color="fg.muted">
                            Нет клиентов
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" color="fg.muted">
                          {new Date(specialist.createdAt).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        ) : (
          <Box textAlign="center" py={12}>
            <Text color="fg.muted" fontSize="lg" mb={2}>
              Специалистов пока нет
            </Text>
            <Text color="fg.muted" fontSize="sm">
              Когда пользователь с ролью SPECIALIST зарегистрируется, он появится здесь
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
