import { Gender } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Container, Heading, Link, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { redirect } from 'next/navigation'

// Форматирование пола
function formatGender(gender: Gender | null): string {
  if (!gender) {
    return '—'
  }
  switch (gender) {
    case Gender.MALE:
      return 'Мужской'
    case Gender.FEMALE:
      return 'Женский'
    case Gender.OTHER:
      return 'Другое'
    default:
      return gender
  }
}

// Вычисление возраста по дате рождения
function calculateAge(birthdate: Date | null): string {
  if (!birthdate) {
    return '—'
  }
  const today = new Date()
  const birthDate = new Date(birthdate)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return `${age} лет`
}

export default async function ClientsPage() {
  const session = await getSession()

  // Проверка аутентификации (layout уже проверяет, но оставляем для безопасности)
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Получение enhanced Prisma client с ZenStack политиками
  const db = getEnhancedPrisma(session.user)

  // Получение всех клиентов специалиста
  const clients = await db.client.findMany({
    where: {
      specialistId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/dashboard">← Назад к панели управления</NextLink>
          </Link>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Heading size="2xl" textTransform="none">
              Мои клиенты
            </Heading>
            <Button asChild colorPalette="fg">
              <NextLink href="/clients/new">Добавить клиента</NextLink>
            </Button>
          </Box>
          <Text color="fg.muted">Всего клиентов: {clients.length}</Text>
        </Box>

        {clients.length > 0 ? (
          <Box overflowX="auto">
            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Имя</Table.ColumnHeader>
                  <Table.ColumnHeader>Email</Table.ColumnHeader>
                  <Table.ColumnHeader>Телефон</Table.ColumnHeader>
                  <Table.ColumnHeader>Пол</Table.ColumnHeader>
                  <Table.ColumnHeader>Возраст</Table.ColumnHeader>
                  <Table.ColumnHeader>Основной запрос</Table.ColumnHeader>
                  <Table.ColumnHeader>Добавлен</Table.ColumnHeader>
                  <Table.ColumnHeader>Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {clients.map((client) => (
                  <Table.Row key={client.id}>
                    <Table.Cell>
                      <Text fontWeight="medium">{client.name}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" color="fg.muted">
                        {client.email}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{client.phone || '—'}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{formatGender(client.gender)}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{calculateAge(client.birthdate)}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" lineClamp={2} maxW="300px">
                        {client.mainRequest || '—'}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" color="fg.muted">
                        {new Date(client.createdAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Button asChild size="sm" variant="outline">
                        <NextLink href={`/clients/${client.id}`}>Открыть</NextLink>
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        ) : (
          <Box textAlign="center" py={12}>
            <Text color="fg.muted" mb={4} fontSize="lg">
              У вас пока нет клиентов
            </Text>
            <Text color="fg.muted" mb={6}>
              Добавьте первого клиента, чтобы начать работу с методикой ИМОТ
            </Text>
            <Button asChild colorPalette="fg">
              <NextLink href="/clients/new">Добавить первого клиента</NextLink>
            </Button>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
