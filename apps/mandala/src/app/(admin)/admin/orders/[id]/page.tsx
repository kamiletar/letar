import { OrderStatusLabels } from '@/generated/form-schemas'
import { OrderStatus } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Button, Card, Flex, Heading, Link, Stack, Table, Text, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { updateOrderStatusFormAction } from './_actions/update-order-status.action'

export const metadata = {
  title: 'Заказ - Админ',
}

const statusColors: Record<string, string> = {
  PENDING: 'yellow',
  CONFIRMED: 'blue',
  SHIPPED: 'purple',
  DELIVERED: 'green',
  CANCELLED: 'red',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  const db = getEnhancedPrisma(session.user)
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: true },
      },
    },
  })

  if (!order) {
    return notFound()
  }

  return (
    <Box>
      <Stack direction="row" justify="space-between" align="center" mb={6}>
        <Heading size="lg">Заказ #{order.id.slice(0, 8)}</Heading>
        <Link href="/admin/orders" color="fg.muted" _hover={{ color: 'fg.brand' }}>
          ← К списку заказов
        </Link>
      </Stack>

      <Stack direction={{ base: 'column', lg: 'row' }} gap={6} align="flex-start">
        {/* Информация о заказе */}
        <Box flex={1}>
          <Card.Root bg={{ _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' }} borderColor="border.subtle" mb={6}>
            <Card.Header>
              <Heading size="md">Контактные данные</Heading>
            </Card.Header>
            <Card.Body>
              <VStack gap={3} align="stretch">
                <Flex justify="space-between">
                  <Text color="fg.muted">Имя:</Text>
                  <Text color="fg" fontWeight="bold">
                    {order.name}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text color="fg.muted">Телефон:</Text>
                  <Link href={`tel:${order.phone}`} color="fg" _hover={{ color: 'fg.brand' }}>
                    {order.phone}
                  </Link>
                </Flex>
                {order.email && (
                  <Flex justify="space-between">
                    <Text color="fg.muted">Email:</Text>
                    <Link href={`mailto:${order.email}`} color="fg" _hover={{ color: 'fg.brand' }}>
                      {order.email}
                    </Link>
                  </Flex>
                )}
                {order.address && (
                  <Box>
                    <Text color="fg.muted" mb={1}>
                      Адрес:
                    </Text>
                    <Text color="fg">{order.address}</Text>
                  </Box>
                )}
                {order.comment && (
                  <Box>
                    <Text color="fg.muted" mb={1}>
                      Комментарий:
                    </Text>
                    <Text color="fg" whiteSpace="pre-wrap">
                      {order.comment}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>

          <Card.Root bg={{ _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' }} borderColor="border.subtle">
            <Card.Header>
              <Heading size="md">Товары</Heading>
            </Card.Header>
            <Card.Body p={0}>
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Товар</Table.ColumnHeader>
                    <Table.ColumnHeader>Цена</Table.ColumnHeader>
                    <Table.ColumnHeader>Кол-во</Table.ColumnHeader>
                    <Table.ColumnHeader>Сумма</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {order.items.map((item) => (
                    <Table.Row key={item.id}>
                      <Table.Cell>
                        <Link href={`/admin/products/${item.productId}`} color="fg" _hover={{ color: 'fg.brand' }}>
                          {item.product.name}
                        </Link>
                      </Table.Cell>
                      <Table.Cell>{item.price} руб</Table.Cell>
                      <Table.Cell>{item.quantity}</Table.Cell>
                      <Table.Cell fontWeight="bold">{item.price * item.quantity} руб</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Card.Body>
          </Card.Root>
        </Box>

        {/* Статус и действия */}
        <Box w={{ base: 'full', lg: '300px' }}>
          <Card.Root
            bg={{ _light: 'blackAlpha.100', _dark: 'whiteAlpha.100' }}
            borderColor="border.subtle"
            position="sticky"
            top="100px"
          >
            <Card.Header>
              <Flex justify="space-between" align="center">
                <Heading size="md">Статус</Heading>
                <Badge colorPalette={statusColors[order.status] || 'gray'} fontSize="md">
                  {OrderStatusLabels[order.status as keyof typeof OrderStatusLabels]}
                </Badge>
              </Flex>
            </Card.Header>
            <Card.Body>
              <VStack gap={3} align="stretch">
                <Box borderTopWidth="1px" borderColor="border.subtle" pt={3}>
                  <Text fontSize="sm" color="fg.muted" mb={1}>
                    Создан
                  </Text>
                  <Text color="fg">
                    {new Date(order.createdAt).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </Box>

                <Box borderTopWidth="1px" borderColor="border.subtle" pt={3}>
                  <Text fontSize="2xl" fontWeight="bold" color="fg">
                    {order.total} руб
                  </Text>
                </Box>

                <Box borderTopWidth="1px" borderColor="border.subtle" pt={3}>
                  <Text fontSize="sm" color="fg.muted" mb={2}>
                    Изменить статус
                  </Text>
                  <VStack gap={2}>
                    {Object.values(OrderStatus).map((status) => (
                      <form
                        key={status}
                        action={updateOrderStatusFormAction.bind(null, order.id, status)}
                        style={{ width: '100%' }}
                      >
                        <Button
                          type="submit"
                          size="sm"
                          w="full"
                          variant={order.status === status ? 'solid' : 'outline'}
                          colorPalette={statusColors[status] || 'gray'}
                          disabled={order.status === status}
                        >
                          {OrderStatusLabels[status]}
                        </Button>
                      </form>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </Card.Body>
          </Card.Root>
        </Box>
      </Stack>
    </Box>
  )
}
