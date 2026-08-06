export const dynamic = 'force-dynamic'

import type { OrderStatus } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { EmptyState, Pagination, SearchFilter, StatusFilter, TableSkeleton } from '@letar/admin-ui'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { LuPackage } from 'react-icons/lu'
import { OrdersTable } from './_components/orders-table'

// ZenStack v3: типы не отражают include, добавляем явный тип
interface OrderWithItems {
  id: string
  name: string
  phone: string
  email: string | null
  total: number
  status: OrderStatus
  createdAt: Date
  items: Array<{
    id: string
    quantity: number
    product: { name: string }
  }>
}

export const metadata = {
  title: 'Заказы - Админ',
}

const PAGE_SIZE = 10

interface OrdersPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    page?: string
  }>
}

export default async function OrdersListPage({ searchParams }: OrdersPageProps) {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  const { q, status, page } = await searchParams
  const currentPage = Number(page) || 1

  // Строим условия фильтрации
  // ZenStack v3: не используем Prisma типы напрямую
  const where: Record<string, unknown> = {}

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { id: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (status) {
    where.status = status
  }

  const db = getEnhancedPrisma(session.user)

  // Параллельно запрашиваем данные и count
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              // Оптимизация: загружаем только нужные поля (экономит память при большом description)
              select: { name: true },
            },
          },
        },
      },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.count({ where }),
  ])

  const hasFilters = q || status

  return (
    <Stack gap={6}>
      <HStack justify="space-between" align="center">
        <Heading size={{ base: 'md', md: 'lg' }}>Заказы</Heading>
      </HStack>

      {/* Панель поиска и фильтров */}
      <HStack gap={4} flexWrap="wrap">
        <Suspense fallback={<Box h="32px" />}>
          <SearchFilter placeholder="Поиск по имени, телефону, ID..." />
        </Suspense>
        <Suspense fallback={<Box h="24px" />}>
          <StatusFilter
            paramName="status"
            options={[
              { value: 'PENDING', label: 'Ожидает' },
              { value: 'CONFIRMED', label: 'Подтверждён' },
              { value: 'SHIPPED', label: 'Отправлен' },
              { value: 'DELIVERED', label: 'Доставлен' },
              { value: 'CANCELLED', label: 'Отменён' },
            ]}
          />
        </Suspense>
      </HStack>

      {orders.length === 0
        ? (
          hasFilters
            ? (
              <Box py={8} textAlign="center">
                <Text color="fg.muted">Ничего не найдено по заданным фильтрам</Text>
              </Box>
            )
            : (
              <EmptyState
                icon={LuPackage}
                title="Нет заказов"
                description="Заказы появятся после оформления покупки клиентами"
              />
            )
        )
        : (
          <>
            <Suspense fallback={<TableSkeleton rows={PAGE_SIZE} columns={8} />}>
              {/* ZenStack v3: приводим к типу с relations */}
              <OrdersTable orders={orders as unknown as OrderWithItems[]} />
            </Suspense>

            {/* Пагинация */}
            <Suspense fallback={<Box h="48px" />}>
              <Pagination total={total} pageSize={PAGE_SIZE} />
            </Suspense>
          </>
        )}
    </Stack>
  )
}
