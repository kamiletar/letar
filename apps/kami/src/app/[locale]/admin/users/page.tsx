import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Badge, Box, Card, HStack, Heading, Table, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { VerifyButton } from './_components/verify-button'

export const metadata: Metadata = {
  title: 'Пользователи',
}

export const dynamic = 'force-dynamic'

interface UsersPageProps {
  params: Promise<{ locale: string }>
}

/**
 * Список пользователей с ручной верификацией email
 */
export default async function UsersPage({ params }: UsersPageProps) {
  const { locale } = await params
  const session = await getSession()

  if (!session?.user?.roles?.includes('ADMIN')) {
    redirect(`/${locale}/403`)
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      roles: true,
      createdAt: true,
    },
  })

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="xl">Пользователи</Heading>
        <Text color="fg.muted" fontSize="sm">
          {users.length} пользователей
        </Text>
      </HStack>

      {users.length === 0 ? (
        <Box p={8} bg="bg.subtle" borderRadius="xl" textAlign="center">
          <Text color="fg.muted">Пользователей пока нет</Text>
        </Box>
      ) : (
        <Card.Root>
          <Card.Body p={0}>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Пользователь</Table.ColumnHeader>
                  <Table.ColumnHeader>Роли</Table.ColumnHeader>
                  <Table.ColumnHeader>Email верификация</Table.ColumnHeader>
                  <Table.ColumnHeader>Дата регистрации</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {users.map((user) => (
                  <Table.Row key={user.id} _hover={{ bg: 'bg.subtle' }}>
                    <Table.Cell>
                      <Text fontWeight="medium" fontSize="sm">
                        {user.name}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {user.email}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <HStack gap={1}>
                        {user.roles.map((role) => (
                          <Badge key={role} size="xs" colorPalette={role === 'ADMIN' ? 'purple' : 'gray'}>
                            {role}
                          </Badge>
                        ))}
                      </HStack>
                    </Table.Cell>
                    <Table.Cell>
                      <VerifyButton userId={user.id} emailVerified={user.emailVerified} />
                    </Table.Cell>
                    <Table.Cell fontSize="xs" color="fg.muted">
                      {user.createdAt.toLocaleDateString('ru-RU')}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Body>
        </Card.Root>
      )}
    </Box>
  )
}
