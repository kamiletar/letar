import type { Season } from '@/generated/prisma'
import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { SEASON_LABELS } from '@/lib/seasons'
import { Badge, Card, Container, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'

export default async function AdminCollectionsPage() {
  const authUser = await requireAuth()
  if (authUser.role !== 'ADMIN') {
    redirect('/')
  }

  const db = getEnhancedPrisma(authUser)

  const collections = await db.collection.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { products: true } },
    },
  })

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={6} align="stretch">
        <HStack justify="space-between">
          <Heading size="2xl" textTransform="none">
            Коллекции
          </Heading>
          <Badge variant="subtle">{collections.length} коллекций</Badge>
        </HStack>

        <Card.Root>
          <Card.Body>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Название</Table.ColumnHeader>
                  <Table.ColumnHeader>Slug</Table.ColumnHeader>
                  <Table.ColumnHeader>Сезон</Table.ColumnHeader>
                  <Table.ColumnHeader>Год</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center">Товаров</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center">Статус</Table.ColumnHeader>
                  <Table.ColumnHeader>Создана</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {collections.map((collection) => (
                  <Table.Row key={collection.id}>
                    <Table.Cell>
                      <Text fontWeight="medium">{collection.name}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" color="fg.muted">
                        {collection.slug}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette="purple" size="sm">
                        {SEASON_LABELS[collection.season as Season]}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>{collection.year || '—'}</Table.Cell>
                    <Table.Cell textAlign="center">{collection._count.products}</Table.Cell>
                    <Table.Cell textAlign="center">
                      <Badge colorPalette={collection.isPublished ? 'green' : 'gray'} size="sm">
                        {collection.isPublished ? 'Опубликована' : 'Черновик'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{new Date(collection.createdAt).toLocaleDateString('ru-RU')}</Text>
                    </Table.Cell>
                  </Table.Row>
                ))}

                {collections.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={7}>
                      <Text textAlign="center" py={4} color="fg.muted">
                        Нет коллекций
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  )
}
