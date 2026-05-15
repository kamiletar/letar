'use client'

import { Link } from '@/i18n/navigation'
import { Box, Card, Heading, HStack, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { FiBox, FiDollarSign, FiShoppingCart, FiStar, FiTrendingUp } from 'react-icons/fi'

interface SellerDashboardClientProps {
  shopName: string
  productCount: number
  totalOrders: number
  newOrders: number
  availableAmount: number
  pendingAmount: number
  averageRating: number | null
  reviewCount: number
}

/**
 * Клиентский компонент dashboard продавца с карточками статистики.
 */
export function SellerDashboardClient({
  shopName,
  productCount,
  totalOrders,
  newOrders,
  availableAmount,
  pendingAmount,
  averageRating,
  reviewCount,
}: SellerDashboardClientProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount)

  const stats = [
    {
      label: 'Товаров',
      value: productCount.toString(),
      helpText: 'Активные товары',
      icon: FiBox,
      color: 'green.500',
      href: '/seller/products',
    },
    {
      label: 'Заказов',
      value: totalOrders.toString(),
      helpText: newOrders > 0 ? `${newOrders} новых` : 'Все подзаказы',
      icon: FiShoppingCart,
      color: 'blue.500',
      href: '/seller/orders',
    },
    {
      label: 'Доступно к выплате',
      value: formatCurrency(availableAmount),
      helpText: 'Можно запросить выплату',
      icon: FiDollarSign,
      color: 'green.600',
      href: '/seller/finances',
    },
    {
      label: 'Ожидает подтверждения',
      value: formatCurrency(pendingAmount),
      helpText: 'На проверке',
      icon: FiTrendingUp,
      color: 'orange.500',
      href: '/seller/finances',
    },
    {
      label: 'Рейтинг',
      value: averageRating ? averageRating.toFixed(1) : '—',
      helpText: `${reviewCount} отзывов`,
      icon: FiStar,
      color: 'yellow.500',
      href: '/seller/reviews',
    },
  ]

  return (
    <VStack gap={8} align="stretch">
      <Box>
        <Heading size="2xl" mb={2}>
          {shopName}
        </Heading>
        <Text color="fg.muted">Панель продавца — обзор</Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} passHref>
            <Card.Root _hover={{ transform: 'translateY(-2px)', shadow: 'md' }} transition="all 0.2s" cursor="pointer">
              <Card.Body>
                <HStack gap={4}>
                  <Box p={3} bg={`${stat.color}10`} borderRadius="lg" color={stat.color}>
                    <Icon as={stat.icon} boxSize={6} />
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="fg.muted">
                      {stat.label}
                    </Text>
                    <Heading size="xl">{stat.value}</Heading>
                    <Text fontSize="xs" color="fg.muted">
                      {stat.helpText}
                    </Text>
                  </Box>
                </HStack>
              </Card.Body>
            </Card.Root>
          </Link>
        ))}
      </SimpleGrid>
    </VStack>
  )
}
