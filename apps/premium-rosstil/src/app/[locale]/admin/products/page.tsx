import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import { Box, Button, Card, Container, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { BulkRemoveNewCollection } from './_components/bulk-remove-new-collection'
import { SortableProductList } from './_components/sortable-product-list'

export default async function AdminProductsPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  // Get all products with their variants, items, images, and category
  const products = await db.product.findMany({
    include: {
      category: {
        select: { name: true },
      },
      variants: {
        include: {
          items: {
            include: {
              size: true,
            },
            orderBy: {
              sizeId: 'asc',
            },
          },
          images: {
            include: {
              image: true, // Включаем связь с Image
            },
            orderBy: {
              order: 'asc',
            },
            take: 1, // Just get the first image for preview
          },
        },
      },
    },
    orderBy: {
      sortOrder: 'asc',
    },
  })

  // Получаем категории для фильтра массового снятия
  const categories = await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  })

  // Типизация для удобства
  type ProductWithRelations = (typeof products)[number]
  type VariantWithRelations = ProductWithRelations['variants'][number]

  // Calculate total variants and items across all products
  const totalVariants = products.reduce(
    (sum: number, product: ProductWithRelations) => sum + product.variants.length,
    0
  )
  const totalItems = products.reduce(
    (sum: number, product: ProductWithRelations) =>
      sum +
      product.variants.reduce(
        (variantSum: number, variant: VariantWithRelations) => variantSum + variant.items.length,
        0
      ),
    0
  )
  const newCollectionCount = products.filter((p: ProductWithRelations) => p.isNewCollection).length

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin">← Вернуться к панели администратора</NextLink>
          </Link>
          <HStack justify="space-between" align="start" mb={2}>
            <Heading size="2xl" textTransform="none">
              Продукты
            </Heading>
            <Button asChild colorPalette="fg">
              <NextLink href="/admin/products/new">Создать продукт</NextLink>
            </Button>
          </HStack>
          <Text color="fg.muted" mb={4}>
            Всего продуктов: {products.length} • Вариантов: {totalVariants} • Товаров: {totalItems}
          </Text>
          <BulkRemoveNewCollection categories={categories} newCollectionCount={newCollectionCount} />
        </Box>

        {products.length === 0 ? (
          <Card.Root>
            <Card.Body>
              <Text textAlign="center" color="fg.muted" py={8}>
                Пока нет ни одного продукта в базе данных
              </Text>
            </Card.Body>
          </Card.Root>
        ) : (
          <>
            <Text fontSize="sm" color="fg.muted" mb={2}>
              Перетаскивайте продукты для изменения порядка в каталоге
            </Text>
            <SortableProductList
              products={products.map((product: ProductWithRelations) => ({
                ...product,
                createdAt: product.createdAt.toISOString(),
                categoryName: product.category?.name ?? null,
                variants: product.variants.map((v: VariantWithRelations) => ({
                  ...v,
                  items: v.items.map((i: VariantWithRelations['items'][number]) => ({
                    ...i,
                    price: i.price.toString(),
                  })),
                  // Преобразуем изображения: добавляем url из image.path
                  images: v.images.map((vi: VariantWithRelations['images'][number]) => ({
                    url: getImageUrl(vi.image.path),
                    alt: vi.alt,
                  })),
                })),
              }))}
            />
          </>
        )}
      </VStack>
    </Container>
  )
}
