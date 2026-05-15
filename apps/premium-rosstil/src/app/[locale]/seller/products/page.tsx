import { Link } from '@/i18n/navigation'
import { requireSeller } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Button, Card, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { FiPlus } from 'react-icons/fi'

interface SearchParams {
  q?: string
}

/**
 * Список товаров продавца с поиском.
 */
export default async function SellerProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireSeller()
  const db = getEnhancedPrisma(user)
  const params = await searchParams

  const seller = await db.seller.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })

  if (!seller) {
    return <Text>Профиль продавца не найден.</Text>
  }

  const where = {
    sellerId: seller.id,
    ...(params.q ? { name: { contains: params.q, mode: 'insensitive' as const } } : {}),
  }

  const products = await db.product.findMany({
    where,
    include: {
      variants: {
        include: {
          items: {
            select: { price: true, availableCount: true },
          },
        },
      },
      category: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between">
        <Box>
          <Heading size="xl">Мои товары</Heading>
          <Text color="fg.muted">{products.length} товаров</Text>
        </Box>
        <Button asChild colorPalette="fg">
          <Link href="/seller/products/new">
            <FiPlus /> Добавить товар
          </Link>
        </Button>
      </HStack>

      {products.length === 0 ? (
        <Card.Root>
          <Card.Body>
            <VStack py={8}>
              <Text color="fg.muted">У вас пока нет товаров</Text>
              <Button asChild colorPalette="fg" size="sm">
                <Link href="/seller/products/new">Создать первый товар</Link>
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          {products.map((product) => {
            const totalItems = product.variants.reduce(
              (sum, v) => sum + v.items.reduce((s, i) => s + i.availableCount, 0),
              0
            )
            const minPrice = Math.min(...product.variants.flatMap((v) => v.items.map((i) => Number(i.price))))
            const hasPrice = isFinite(minPrice)

            return (
              <Link key={product.id} href={`/seller/products/${product.id}/edit`}>
                <Card.Root _hover={{ shadow: 'md', transform: 'translateY(-1px)' }} transition="all 0.2s">
                  <Card.Body>
                    <VStack align="stretch" gap={2}>
                      <Heading size="md" lineClamp={1}>
                        {product.name}
                      </Heading>
                      <HStack gap={2}>
                        {product.category && (
                          <Badge variant="subtle" size="sm">
                            {product.category.name}
                          </Badge>
                        )}
                        <Badge colorPalette={totalItems > 0 ? 'green' : 'red'} size="sm">
                          {totalItems > 0 ? `В наличии: ${totalItems}` : 'Нет в наличии'}
                        </Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="fg.muted">
                          Вариантов: {product.variants.length}
                        </Text>
                        {hasPrice && <Text fontWeight="semibold">от {minPrice.toLocaleString('ru-RU')} ₽</Text>}
                      </HStack>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              </Link>
            )
          })}
        </SimpleGrid>
      )}
    </VStack>
  )
}
