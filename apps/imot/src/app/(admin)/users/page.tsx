import { UserRole } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Container, Heading, Table, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'

// Форматирование роли
function formatRole(role: UserRole): { label: string; colorPalette: string } {
  switch (role) {
    case UserRole.ADMIN:
      return { label: 'Администратор', colorPalette: 'purple' }
    case UserRole.SPECIALIST:
      return { label: 'Специалист', colorPalette: 'blue' }
    case UserRole.CLIENT:
      return { label: 'Клиент', colorPalette: 'gray' }
    default:
      return { label: role, colorPalette: 'gray' }
  }
}

export default async function UsersPage() {
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

  // Получение всех пользователей с их accounts для отображения провайдеров
  const users = await db.user.findMany({
    include: {
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

  // Подсчет пользователей по ролям
  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === UserRole.ADMIN).length,
    specialists: users.filter((u) => u.role === UserRole.SPECIALIST).length,
    clients: users.filter((u) => u.role === UserRole.CLIENT).length,
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="2xl" textTransform="none" mb={2}>
            Управление пользователями
          </Heading>
          <Text color="fg.muted" mb={4}>
            Все пользователи системы ИМОТ
          </Text>

          {/* Статистика */}
          <Box display="flex" gap={4} flexWrap="wrap">
            <Badge colorPalette="gray" size="lg">
              Всего: {stats.total}
            </Badge>
            <Badge colorPalette="purple" size="lg">
              Админов: {stats.admins}
            </Badge>
            <Badge colorPalette="blue" size="lg">
              Специалистов: {stats.specialists}
            </Badge>
            <Badge colorPalette="gray" size="lg">
              Клиентов: {stats.clients}
            </Badge>
          </Box>
        </Box>

        {users.length > 0 ? (
          <Box overflowX="auto">
            <Table.Root size="sm" variant="outline" data-testid="users-table">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Имя</Table.ColumnHeader>
                  <Table.ColumnHeader>Email</Table.ColumnHeader>
                  <Table.ColumnHeader>Телефон</Table.ColumnHeader>
                  <Table.ColumnHeader>Роль</Table.ColumnHeader>
                  <Table.ColumnHeader>Провайдеры</Table.ColumnHeader>
                  <Table.ColumnHeader>Email подтвержден</Table.ColumnHeader>
                  <Table.ColumnHeader>Дата регистрации</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {users.map((user) => {
                  const roleInfo = formatRole(user.role)
                  return (
                    <Table.Row key={user.id}>
                      <Table.Cell>
                        <Text fontWeight="medium">{user.name || '—'}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" fontFamily="mono" color="fg.muted">
                          {user.email}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{user.phoneNumber || '—'}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={roleInfo.colorPalette} size="sm">
                          {roleInfo.label}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          {user.accounts.length > 0 ? (
                            user.accounts.map((account) => (
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
                        {user.emailVerified ? (
                          <Badge colorPalette="green" size="sm">
                            ✓ Подтвержден
                          </Badge>
                        ) : (
                          <Badge colorPalette="orange" size="sm">
                            Не подтвержден
                          </Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" color="fg.muted">
                          {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
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
            <Text color="fg.muted" fontSize="lg">
              Пользователей пока нет
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
