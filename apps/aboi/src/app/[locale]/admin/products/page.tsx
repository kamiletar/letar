import { prismaAuth } from '@/lib/prisma'
import { Badge, Box, Button, Flex, Heading, HStack, Stack, Table, Text } from '@chakra-ui/react'
import Link from 'next/link'

type Status = 'all' | 'published' | 'draft' | 'deleted'

export default async function ProductsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: Status }>
}) {
  const { status = 'all' } = await searchParams

  const where = (() => {
    switch (status) {
      case 'published':
        return { deletedAt: null, published: true }
      case 'draft':
        return { deletedAt: null, published: false }
      case 'deleted':
        return { deletedAt: { not: null } }
      default:
        return {}
    }
  })()

  const products = await prismaAuth.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
        include: { image: true },
      },
    },
    take: 100,
  })

  return (
    <Stack gap={6}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
        <Heading as="h1" size="2xl">
          Товары
        </Heading>
        <Button asChild colorPalette="brand">
          <Link href="/admin/products/new">+ Новый товар</Link>
        </Button>
      </Flex>

      <HStack gap={2} wrap="wrap">
        <FilterLink current={status} value="all" label="Все" />
        <FilterLink current={status} value="published" label="Опубликованные" />
        <FilterLink current={status} value="draft" label="Черновики" />
        <FilterLink current={status} value="deleted" label="Удалённые" />
      </HStack>

      {products.length === 0
        ? (
          <Box p={12} bg="bg.subtle" borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Пока ничего нет</Text>
          </Box>
        )
        : (
          <Table.Root size="md" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Превью</Table.ColumnHeader>
                <Table.ColumnHeader>Название</Table.ColumnHeader>
                <Table.ColumnHeader>Slug</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Цена / м</Table.ColumnHeader>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {products.map((p) => {
                const thumb = p.images[0]?.image
                return (
                  <Table.Row
                    key={p.id}
                    asChild
                    cursor="pointer"
                    _hover={{ bg: 'bg.subtle' }}
                  >
                    <Link href={`/admin/products/${p.id}`}>
                      <Table.Cell>
                        {thumb
                          ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/files/${thumb.path}`}
                              alt={thumb.alt ?? p.name}
                              width={60}
                              height={60}
                              style={{ borderRadius: 8, objectFit: 'cover' }}
                            />
                          )
                          : <Box w={14} h={14} bg="bg.muted" borderRadius="md" />}
                      </Table.Cell>
                      <Table.Cell fontWeight="medium">{p.name}</Table.Cell>
                      <Table.Cell color="fg.muted" fontFamily="mono" fontSize="sm">
                        {p.slug}
                      </Table.Cell>
                      <Table.Cell textAlign="end">{(p.pricePerMeter / 100).toFixed(0)} ₽</Table.Cell>
                      <Table.Cell>
                        {p.deletedAt
                          ? <Badge colorPalette="red">Удалён</Badge>
                          : p.published
                          ? <Badge colorPalette="green">Опубл.</Badge>
                          : <Badge colorPalette="gray">Черновик</Badge>}
                      </Table.Cell>
                    </Link>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Root>
        )}
    </Stack>
  )
}

function FilterLink({ current, value, label }: { current: string; value: string; label: string }) {
  const active = current === value
  return (
    <Box
      asChild
      px={3}
      py={1.5}
      borderRadius="full"
      borderWidth="1px"
      borderColor={active ? 'brand.solid' : 'border'}
      bg={active ? 'brand.solid' : 'transparent'}
      color={active ? 'white' : 'fg.muted'}
      fontSize="sm"
      _hover={{ borderColor: 'brand.solid' }}
    >
      <Link href={value === 'all' ? '/admin/products' : `/admin/products?status=${value}`}>{label}</Link>
    </Box>
  )
}
