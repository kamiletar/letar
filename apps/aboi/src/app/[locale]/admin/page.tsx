import { prismaAuth } from '@/lib/prisma'
import { Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const [productsTotal, productsPublished, productsDeleted, ordersActive, ordersToday] = await Promise.all([
    prismaAuth.product.count({ where: { deletedAt: null } }),
    prismaAuth.product.count({ where: { deletedAt: null, published: true } }),
    prismaAuth.product.count({ where: { deletedAt: { not: null } } }),
    prismaAuth.order.count({
      where: { status: { in: ['PLACED', 'CONFIRMED', 'PAID', 'PRINTING', 'SHIPPED'] } },
    }),
    prismaAuth.order.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ])

  return (
    <Stack gap={8}>
      <Heading as="h1" size="2xl">
        Дашборд
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
        <StatCard label="Товаров активных" value={productsTotal} href="/admin/products" />
        <StatCard label="Опубликовано" value={productsPublished} href="/admin/products?status=published" />
        <StatCard label="В корзине (soft-deleted)" value={productsDeleted} href="/admin/products?status=deleted" />
        <StatCard label="Активных заказов" value={ordersActive} href="/admin/orders" />
        <StatCard label="Заказов сегодня" value={ordersToday} href="/admin/orders" />
      </SimpleGrid>
    </Stack>
  )
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Stack
      asChild
      gap={1}
      p={6}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border"
      bg="bg.surface"
      _hover={{ borderColor: 'brand.solid' }}
    >
      <Link href={href}>
        <Text fontSize="sm" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
          {label}
        </Text>
        <Text fontSize="3xl" fontWeight="bold">
          {value}
        </Text>
      </Link>
    </Stack>
  )
}
