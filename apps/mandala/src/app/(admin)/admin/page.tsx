import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Card, Heading, Link, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { LuImage, LuMail, LuPackage, LuShoppingBag, LuUsers } from 'react-icons/lu'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard - Админ',
}

export default async function AdminDashboardPage() {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    notFound()
  }

  const db = getEnhancedPrisma(session.user)

  // Параллельный запрос статистики
  const [mandalasCount, productsCount, messagesStats, ordersStats, usersCount] = await Promise.all([
    db.mandala.count(),
    db.product.count(),
    db.contactMessage.groupBy({
      by: ['read'],
      _count: true,
    }),
    db.order.groupBy({
      by: ['status'],
      _count: true,
    }),
    db.user.count(),
  ])

  const unreadMessages = messagesStats.find((s) => !s.read)?._count ?? 0
  const totalMessages = messagesStats.reduce((acc, s) => acc + s._count, 0)

  const pendingOrders = ordersStats.find((s) => s.status === 'PENDING')?._count ?? 0
  const totalOrders = ordersStats.reduce((acc, s) => acc + s._count, 0)

  const stats = [
    {
      label: 'Мандалы',
      value: mandalasCount,
      icon: LuImage,
      href: '/admin/mandalas',
      color: 'purple.400',
    },
    {
      label: 'Товары',
      value: productsCount,
      icon: LuShoppingBag,
      href: '/admin/products',
      color: 'green.400',
    },
    {
      label: 'Заказы',
      value: totalOrders,
      subtitle: pendingOrders > 0 ? `${pendingOrders} новых` : undefined,
      icon: LuPackage,
      href: '/admin/orders',
      color: pendingOrders > 0 ? 'yellow.400' : 'cyan.400',
    },
    {
      label: 'Сообщения',
      value: totalMessages,
      subtitle: unreadMessages > 0 ? `${unreadMessages} новых` : undefined,
      icon: LuMail,
      href: '/admin/contacts',
      color: unreadMessages > 0 ? 'red.400' : 'blue.400',
    },
    {
      label: 'Пользователи',
      value: usersCount,
      icon: LuUsers,
      href: '#',
      color: 'orange.400',
    },
  ]

  return (
    <Box>
      <Heading size="lg" mb={6}>
        Dashboard
      </Heading>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} _hover={{ textDecoration: 'none' }}>
            <Card.Root
              bg={{ _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' }}
              borderColor="border.subtle"
              _hover={{ bg: 'bg.hover', transform: 'translateY(-2px)' }}
              transition="all 0.2s"
            >
              <Card.Body>
                <Stack direction="row" justify="space-between" align="flex-start">
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>
                      {stat.label}
                    </Text>
                    <Text fontSize="3xl" fontWeight="bold" color="fg">
                      {stat.value}
                    </Text>
                    {stat.subtitle && (
                      <Text fontSize="sm" color={stat.color}>
                        {stat.subtitle}
                      </Text>
                    )}
                  </Box>
                  <Box color={stat.color}>
                    <stat.icon size={32} />
                  </Box>
                </Stack>
              </Card.Body>
            </Card.Root>
          </Link>
        ))}
      </SimpleGrid>
    </Box>
  )
}
