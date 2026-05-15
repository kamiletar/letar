import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Container, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'

export const metadata = {
  title: 'Подписчики рассылки',
}

export default async function NewsletterAdminPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  const [subscribers, activeCount, totalCount] = await Promise.all([
    db.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true },
        },
      },
    }),
    db.newsletterSubscriber.count({ where: { isActive: true } }),
    db.newsletterSubscriber.count(),
  ])

  return (
    <Container maxW="5xl" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="xl" mb={2}>
            Подписчики рассылки
          </Heading>
          <HStack gap={4}>
            <Badge colorPalette="green" size="lg">
              {activeCount} активных
            </Badge>
            <Badge colorPalette="gray" size="lg">
              {totalCount} всего
            </Badge>
          </HStack>
        </Box>

        <Table.Root variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Email</Table.ColumnHeader>
              <Table.ColumnHeader>Имя</Table.ColumnHeader>
              <Table.ColumnHeader>Статус</Table.ColumnHeader>
              <Table.ColumnHeader>Дата подписки</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {subscribers.map((sub) => (
              <Table.Row key={sub.id}>
                <Table.Cell>{sub.email}</Table.Cell>
                <Table.Cell>
                  <Text color="fg.muted">{sub.user?.name || '—'}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge colorPalette={sub.isActive ? 'green' : 'red'}>{sub.isActive ? 'Активна' : 'Отписан'}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm" color="fg.muted">
                    {new Intl.DateTimeFormat('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }).format(sub.createdAt)}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
            {subscribers.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={4}>
                  <Text color="fg.muted" textAlign="center" py={4}>
                    Пока нет подписчиков
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </VStack>
    </Container>
  )
}
