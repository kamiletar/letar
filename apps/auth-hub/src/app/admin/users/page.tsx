import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge, Box, Card, Heading, HStack, Table, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { RoleToggleButton } from './_components/role-toggle-button'

export const metadata: Metadata = {
  title: 'Пользователи',
}

/**
 * Управление пользователями — список с переключением ролей
 */
export default async function UsersPage() {
  const session = await requireAdmin()

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      _count: {
        select: {
          accounts: true,
          projectProfiles: true,
        },
      },
    },
  })

  return (
    <Box maxW="5xl" mx="auto" p={6}>
      <HStack justify="space-between" mb={6}>
        <Heading size="xl">Пользователи</Heading>
        <Text color="fg.muted" fontSize="sm">
          {users.length} пользователей
        </Text>
      </HStack>

      <Card.Root>
        <Card.Body p={0}>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Имя</Table.ColumnHeader>
                <Table.ColumnHeader>Email</Table.ColumnHeader>
                <Table.ColumnHeader>Роль</Table.ColumnHeader>
                <Table.ColumnHeader>Верификация</Table.ColumnHeader>
                <Table.ColumnHeader>Аккаунты</Table.ColumnHeader>
                <Table.ColumnHeader>Дата</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users.map((user) => (
                <Table.Row key={user.id}>
                  <Table.Cell fontWeight="medium">{user.name}</Table.Cell>
                  <Table.Cell fontSize="sm">{user.email}</Table.Cell>
                  <Table.Cell>
                    <RoleToggleButton
                      userId={user.id}
                      currentRoles={user.roles}
                      currentUserId={session.user.id}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      colorPalette={user.emailVerified ? 'green' : 'yellow'}
                      size="sm"
                    >
                      {user.emailVerified ? 'Да' : 'Нет'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{user._count.accounts}</Table.Cell>
                  <Table.Cell fontSize="sm" color="fg.muted">
                    {user.createdAt.toLocaleDateString('ru-RU')}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
