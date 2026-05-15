import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge, Box, Card, Heading, HStack, Stack, Table, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OAuth клиенты',
}

/**
 * Управление зарегистрированными OAuth-клиентами
 */
export default async function ClientsPage() {
  await requireAdmin()

  const clients = await prisma.oauthApplication.findMany({
    orderBy: { createdAt: 'asc' },
  })

  return (
    <Box maxW="4xl" mx="auto" p={6}>
      <HStack justify="space-between" mb={6}>
        <Heading size="xl">OAuth клиенты</Heading>
        <Text color="fg.muted" fontSize="sm">
          {clients.length} клиентов
        </Text>
      </HStack>

      {clients.length === 0 ? (
        <Card.Root>
          <Card.Body>
            <Stack textAlign="center" gap={2} py={8}>
              <Text fontWeight="bold">Нет зарегистрированных клиентов</Text>
              <Text color="fg.muted" fontSize="sm">
                Клиенты создаются через trustedClients в конфигурации или через API
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>
      ) : (
        <Card.Root>
          <Card.Body p={0}>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Имя</Table.ColumnHeader>
                  <Table.ColumnHeader>Client ID</Table.ColumnHeader>
                  <Table.ColumnHeader>Тип</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {clients.map((client) => (
                  <Table.Row key={client.id}>
                    <Table.Cell fontWeight="medium">{client.name}</Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" fontFamily="mono">
                        {client.clientId}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>{client.type}</Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={client.disabled ? 'red' : 'green'}>
                        {client.disabled ? 'Отключён' : 'Активен'}
                      </Badge>
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
