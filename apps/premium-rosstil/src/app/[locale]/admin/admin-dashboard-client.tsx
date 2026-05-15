'use client'

import { Link } from '@/i18n/navigation'
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { FaGem, FaStore } from 'react-icons/fa'
import {
  FiBell,
  FiBox,
  FiDollarSign,
  FiFileText,
  FiFolder,
  FiImage,
  FiMaximize2,
  FiPlus,
  FiRotateCcw,
  FiShoppingCart,
  FiStar,
  FiTag,
  FiUsers,
} from 'react-icons/fi'

interface AdminDashboardClientProps {
  userCount: number
  productCount: number
  productSizeCount: number
  categoryCount: number
  customOrderCount: number
  newCustomOrderCount: number
  orderCount: number
  newOrderCount: number
  imageCount: number
  sellerCount: number
  pendingApplicationCount: number
  totalCommission: number
  pendingReturnCount: number
  reviewCount: number
  hiddenReviewCount: number
  activePromoCount: number
  /** Активные подписки на уведомления о поступлении */
  pendingStockNotificationCount: number
  /** Участников программы лояльности */
  loyaltyMemberCount: number
  recentUsers: Array<{
    id: string
    name: string | null
    email: string | null
    role: string
    createdAt: Date
  }>
  recentProducts: Array<{
    id: string
    name: string
    createdAt: Date
  }>
  version: string
}

export function AdminDashboardClient({
  userCount,
  productCount,
  productSizeCount,
  categoryCount,
  customOrderCount,
  newCustomOrderCount,
  orderCount,
  newOrderCount,
  imageCount,
  sellerCount,
  pendingApplicationCount,
  totalCommission,
  pendingReturnCount,
  reviewCount,
  hiddenReviewCount,
  activePromoCount,
  pendingStockNotificationCount,
  loyaltyMemberCount,
  recentUsers,
  recentProducts,
  version,
}: AdminDashboardClientProps) {
  const stats = [
    {
      label: 'Пользователи',
      value: userCount,
      helpText: 'Всего пользователей',
      icon: FiUsers,
      href: '/admin/users',
      color: 'blue.500',
    },
    {
      label: 'Продукты',
      value: productCount,
      helpText: 'Активные товары',
      icon: FiBox,
      href: '/admin/products',
      color: 'green.500',
    },
    {
      label: 'Размеры',
      value: productSizeCount,
      helpText: 'Доступные размеры',
      icon: FiMaximize2,
      href: '/admin/sizes',
      color: 'purple.500',
    },
    {
      label: 'Категории',
      value: categoryCount,
      helpText: 'Категории товаров',
      icon: FiFolder,
      href: '/admin/categories',
      color: 'cyan.500',
    },
    {
      label: 'Заказы',
      value: orderCount,
      helpText: newOrderCount > 0 ? `${newOrderCount} новых` : 'Заказы из корзины',
      icon: FiShoppingCart,
      href: '/admin/orders',
      color: 'orange.500',
      badge: newOrderCount > 0 ? newOrderCount : undefined,
    },
    {
      label: 'Спецзаказы',
      value: customOrderCount,
      helpText: newCustomOrderCount > 0 ? `${newCustomOrderCount} новых` : 'Индивидуальные заказы',
      icon: FiFileText,
      href: '/admin/custom-orders',
      color: 'pink.500',
      badge: newCustomOrderCount > 0 ? newCustomOrderCount : undefined,
    },
    {
      label: 'Изображения',
      value: imageCount,
      helpText: 'Загруженные файлы',
      icon: FiImage,
      href: '/admin/images',
      color: 'teal.500',
    },
    {
      label: 'Продавцы',
      value: sellerCount,
      helpText: pendingApplicationCount > 0 ? `${pendingApplicationCount} заявок` : 'Активные продавцы',
      icon: FaStore,
      href: '/admin/sellers',
      color: 'yellow.500',
      badge: pendingApplicationCount > 0 ? pendingApplicationCount : undefined,
    },
    {
      label: 'Возвраты',
      value: pendingReturnCount,
      helpText: pendingReturnCount > 0 ? `${pendingReturnCount} ожидают` : 'Нет активных',
      icon: FiRotateCcw,
      href: '/admin/returns',
      color: 'red.500',
      badge: pendingReturnCount > 0 ? pendingReturnCount : undefined,
    },
    {
      label: 'Отзывы',
      value: reviewCount,
      helpText: hiddenReviewCount > 0 ? `${hiddenReviewCount} скрыто` : 'Отзывы покупателей',
      icon: FiStar,
      href: '/admin/reviews',
      color: 'yellow.500',
      badge: hiddenReviewCount > 0 ? hiddenReviewCount : undefined,
    },
    {
      label: 'Промокоды',
      value: activePromoCount,
      helpText: `${activePromoCount} активных`,
      icon: FiTag,
      href: '/admin/promos',
      color: 'purple.500',
    },
    {
      label: 'Ожидают товар',
      value: pendingStockNotificationCount,
      helpText: 'Подписок на поступление',
      icon: FiBell,
      href: '/admin/products',
      color: 'orange.500',
    },
    {
      label: 'Лояльность',
      value: loyaltyMemberCount,
      helpText: 'Участников программы',
      icon: FaGem,
      href: '/admin/loyalty',
      color: 'yellow.500',
    },
    {
      label: 'Комиссия',
      value:
        totalCommission > 0
          ? totalCommission.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 })
          : '0 ₽',
      helpText: 'Финансы маркетплейса',
      icon: FiDollarSign,
      href: '/admin/finances',
      color: 'emerald.500',
    },
  ]

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="2xl" mb={2}>
            Панель управления
          </Heading>
          <Text color="fg.muted">Обзор статистики и управление магазином</Text>
        </Box>

        {/* Stats Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} gap={6}>
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href} passHref>
              <Card.Root _hover={{ transform: 'translateY(-2px)', shadow: 'md' }} transition="all 0.2s">
                <Card.Body>
                  <HStack gap={4}>
                    <Box p={3} bg={`${stat.color}10`} borderRadius="lg" color={stat.color} position="relative">
                      <Icon as={stat.icon} boxSize={6} />
                      {'badge' in stat && stat.badge && (
                        <Badge
                          colorPalette="red"
                          position="absolute"
                          top="-2"
                          right="-2"
                          borderRadius="full"
                          fontSize="xs"
                        >
                          {stat.badge}
                        </Badge>
                      )}
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="fg.muted">
                        {stat.label}
                      </Text>
                      <Heading size="xl">{stat.value}</Heading>
                    </Box>
                  </HStack>
                </Card.Body>
              </Card.Root>
            </Link>
          ))}
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 3 }} gap={8}>
          {/* Main Content Area - 2/3 width */}
          <Box gridColumn={{ lg: 'span 2' }}>
            <VStack gap={8} align="stretch">
              {/* Recent Users */}
              <Card.Root>
                <Card.Header>
                  <HStack justify="space-between">
                    <Heading size="md">Новые пользователи</Heading>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/admin/users">Все пользователи</Link>
                    </Button>
                  </HStack>
                </Card.Header>
                <Card.Body>
                  <Table.Root size="sm" interactive>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Имя</Table.ColumnHeader>
                        <Table.ColumnHeader>Email</Table.ColumnHeader>
                        <Table.ColumnHeader>Роль</Table.ColumnHeader>
                        <Table.ColumnHeader>Дата</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {recentUsers.map((user) => (
                        <Table.Row key={user.id}>
                          <Table.Cell>{user.name || 'Без имени'}</Table.Cell>
                          <Table.Cell>{user.email}</Table.Cell>
                          <Table.Cell>
                            <Badge colorPalette={user.role === 'ADMIN' ? 'purple' : 'gray'}>{user.role}</Badge>
                          </Table.Cell>
                          <Table.Cell>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Card.Body>
              </Card.Root>

              {/* Recent Products */}
              <Card.Root>
                <Card.Header>
                  <HStack justify="space-between">
                    <Heading size="md">Последние товары</Heading>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/admin/products">Все товары</Link>
                    </Button>
                  </HStack>
                </Card.Header>
                <Card.Body>
                  <Table.Root size="sm" interactive>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Название</Table.ColumnHeader>
                        <Table.ColumnHeader>Дата</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {recentProducts.map((product) => (
                        <Table.Row key={product.id}>
                          <Table.Cell fontWeight="medium">{product.name}</Table.Cell>
                          <Table.Cell>{new Date(product.createdAt).toLocaleDateString('ru-RU')}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Card.Body>
              </Card.Root>
            </VStack>
          </Box>

          {/* Sidebar - 1/3 width */}
          <VStack gap={6} align="stretch">
            {/* Quick Actions */}
            <Card.Root>
              <Card.Header>
                <Heading size="md">Быстрые действия</Heading>
              </Card.Header>
              <Card.Body>
                <VStack align="stretch" gap={3}>
                  <Button asChild variant="outline" justifyContent="flex-start">
                    <Link href="/admin/products/new">
                      <Icon as={FiPlus} mr={2} /> Добавить товар
                    </Link>
                  </Button>
                  <Button asChild variant="outline" justifyContent="flex-start">
                    <Link href="/admin/sizes/new">
                      <Icon as={FiMaximize2} mr={2} /> Добавить размер
                    </Link>
                  </Button>
                  <Button asChild variant="outline" justifyContent="flex-start">
                    <Link href="/admin/images">
                      <Icon as={FiImage} mr={2} /> Управление изображениями
                    </Link>
                  </Button>
                  <Button asChild variant="outline" justifyContent="flex-start">
                    <Link href="/admin/sellers">
                      <Icon as={FaStore} mr={2} /> Продавцы
                    </Link>
                  </Button>
                  <Button asChild variant="outline" justifyContent="flex-start">
                    <Link href="/admin/reviews">
                      <Icon as={FiStar} mr={2} /> Отзывы
                    </Link>
                  </Button>
                  <Button asChild variant="outline" justifyContent="flex-start">
                    <Link href="/admin/returns">
                      <Icon as={FiRotateCcw} mr={2} /> Возвраты
                    </Link>
                  </Button>
                  <Button asChild variant="outline" justifyContent="flex-start">
                    <Link href="/admin/promos">
                      <Icon as={FiTag} mr={2} /> Промокоды
                    </Link>
                  </Button>
                  <Button asChild variant="outline" justifyContent="flex-start">
                    <Link href="/admin/finances">
                      <Icon as={FiDollarSign} mr={2} /> Финансы
                    </Link>
                  </Button>
                  <Button asChild variant="outline" justifyContent="flex-start">
                    <Link href="/admin/loyalty">
                      <Icon as={FaGem} mr={2} /> Лояльность
                    </Link>
                  </Button>
                  <Button asChild variant="outline" justifyContent="flex-start">
                    <Link href="/admin/collections">
                      <Icon as={FiFolder} mr={2} /> Коллекции
                    </Link>
                  </Button>
                  <Button asChild variant="outline" justifyContent="flex-start">
                    <Link href="/admin/newsletter">
                      <Icon as={FiBell} mr={2} /> Рассылка
                    </Link>
                  </Button>
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* System Info */}
            <Card.Root>
              <Card.Header>
                <Heading size="md">Система</Heading>
              </Card.Header>
              <Card.Body>
                <VStack align="stretch" gap={3}>
                  <HStack justify="space-between">
                    <Text color="fg.muted" fontSize="sm">
                      Версия
                    </Text>
                    <Badge>v{version}</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="fg.muted" fontSize="sm">
                      Статус
                    </Text>
                    <Badge colorPalette="green">Активна</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="fg.muted" fontSize="sm">
                      База данных
                    </Text>
                    <Badge colorPalette="fg">PostgreSQL</Badge>
                  </HStack>
                </VStack>
              </Card.Body>
            </Card.Root>
          </VStack>
        </SimpleGrid>
      </VStack>
    </Container>
  )
}
