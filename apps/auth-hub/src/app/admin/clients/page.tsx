import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge, Box, Card, Code, Heading, HStack, Stack, Table, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { ToggleClientButton } from './_components/toggle-client-button'

export const metadata: Metadata = {
  title: 'OAuth клиенты',
}

/**
 * Управление зарегистрированными OIDC-клиентами Ключницы.
 * Клиенты хранятся в таблице oauthApplication.
 * Для первичного заполнения: nx run auth-hub:db:seed
 */
export default async function ClientsPage() {
  await requireAdmin()

  const clients = await prisma.oauthApplication.findMany({
    orderBy: { createdAt: 'asc' },
  })

  return (
    <Box maxW="5xl" mx="auto" p={6}>
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
                Запустите seed для первичного заполнения:
              </Text>
              <Code fontSize="sm" mx="auto">
                nx run auth-hub:db:seed
              </Code>
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
                  <Table.ColumnHeader>Redirect URLs</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {clients.map((client) => (
                  <Table.Row key={client.id}>
                    <Table.Cell fontWeight="medium">{client.name}</Table.Cell>
                    <Table.Cell>
                      <Text fontSize="xs" fontFamily="mono">
                        {client.clientId}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Stack gap={0.5}>
                        {client.redirectUrls.split(',').map((url) => (
                          <Text key={url} fontSize="xs" color="fg.muted" fontFamily="mono" truncate maxW="xs">
                            {url.trim()}
                          </Text>
                        ))}
                      </Stack>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={client.disabled ? 'red' : 'green'} size="sm">
                        {client.disabled ? 'Отключён' : 'Активен'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <ToggleClientButton clientId={client.clientId} disabled={client.disabled} />
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
