import { Gender } from '@/generated/prisma'
import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Container, Heading, Link, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'

// Format phone number to Russian format
function formatPhone(phone: string | null): string {
  if (!phone) {
    return '—'
  }
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  // Format as +7 (XXX) XXX-XX-XX
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }
  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`
  }
  return phone
}

// Format gender
function formatGender(gender: Gender | null): string {
  if (!gender) {
    return '—'
  }
  switch (gender) {
    case Gender.MALE:
      return 'Мужской'
    case Gender.FEMALE:
      return 'Женский'
    default:
      return gender
  }
}

export default async function AdminUsersPage() {
  const user = await requireAdmin()

  // Get enhanced Prisma client with access control policies
  const db = getEnhancedPrisma(user)

  // Get all users with their accounts and profile for provider info
  const users = await db.user.findMany({
    include: {
      accounts: {
        select: {
          providerId: true,
        },
      },
      profile: {
        select: {
          phoneNumber: true,
          birthdate: true,
          gender: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin">← Вернуться к панели администратора</NextLink>
          </Link>
          <Heading size="2xl" textAlign="center" textTransform="none" mb={2}>
            Пользователи
          </Heading>
          <Text textAlign="center" color="fg.muted">
            Всего зарегистрированных пользователей: {users.length}
          </Text>
        </Box>

        <Box overflowX="auto">
          <Table.Root data-testid="users-table" size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Имя</Table.ColumnHeader>
                <Table.ColumnHeader>Email</Table.ColumnHeader>
                <Table.ColumnHeader>Телефон</Table.ColumnHeader>
                <Table.ColumnHeader>Дата рождения</Table.ColumnHeader>
                <Table.ColumnHeader>Пол</Table.ColumnHeader>
                <Table.ColumnHeader>Роль</Table.ColumnHeader>
                <Table.ColumnHeader>Провайдеры</Table.ColumnHeader>
                <Table.ColumnHeader>Дата регистрации</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users.map((user: (typeof users)[number]) => (
                <Table.Row key={user.id}>
                  <Table.Cell>
                    <Text fontWeight="medium">{user.name || '—'}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Link
                      href={`mailto:${user.email}`}
                      fontSize="sm"
                      fontFamily="mono"
                      color="fg"
                      _hover={{ color: 'fg.muted', textDecoration: 'underline' }}
                    >
                      {user.email}
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    {user.profile?.phoneNumber ? (
                      <Link
                        href={`tel:${user.profile.phoneNumber}`}
                        fontSize="sm"
                        fontFamily="mono"
                        color="fg"
                        _hover={{ color: 'fg.muted', textDecoration: 'underline' }}
                      >
                        {formatPhone(user.profile.phoneNumber)}
                      </Link>
                    ) : (
                      <Text fontSize="sm" fontFamily="mono">
                        —
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="fg.muted">
                      {user.profile?.birthdate
                        ? new Date(user.profile.birthdate).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{formatGender(user.profile?.gender ?? null)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={user.role === 'ADMIN' ? 'purple' : 'gray'} size="sm">
                      {user.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {user.accounts.map((account: (typeof user.accounts)[number]) => (
                        <Badge key={account.providerId} colorPalette="fg" size="sm" variant="subtle">
                          {account.providerId}
                        </Badge>
                      ))}
                    </Box>
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
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </VStack>
    </Container>
  )
}
