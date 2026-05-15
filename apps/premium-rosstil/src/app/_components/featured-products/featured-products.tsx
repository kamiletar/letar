import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import { Box, Container, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import { ProductCard } from '../../[locale]/catalog/_components/product-card'

/** Тип изображения из БД */
interface DbImage {
  path: string
}

/** Тип связи вариант-изображение из БД */
interface VariantImageDb {
  id: string
  image: DbImage
  alt: string | null
}

/** Тип item (размер/цена) из БД */
interface ProductItemDb {
  id: string
  price: unknown // Prisma Decimal приходит как unknown
  availableCount: number
}

/** Тип варианта продукта из БД */
interface ProductVariantDb {
  id: string
  color: string
  colorRef?: { id: string; name: string; slug: string; hex: string } | null
  items: ProductItemDb[]
  images: VariantImageDb[]
}

/** Тип продукта с вариантами из БД */
interface ProductWithVariantsDb {
  id: string
  name: string
  variants: ProductVariantDb[]
}

/** Тип сериализованного продукта для ProductCard */
interface SerializedProduct {
  id: string
  name: string
  variants: Array<{
    id: string
    color: string
    colorRef?: { id: string; name: string; slug: string; hex: string } | null
    items: Array<{ price: number }>
    images: Array<{ id: string; url: string; alt: string | null }>
  }>
}

/** Тип item в wishlist */
interface WishlistItem {
  productVariantId: string
}

export const FeaturedProducts = async () => {
  const session = await getSession()
  const db = getEnhancedPrisma(session?.user)

  // Получаем 4 случайных или новых продукта
  const products = await db.product.findMany({
    where: {
      variants: {
        some: {
          items: {
            some: {
              availableCount: { gt: 0 },
            },
          },
        },
      },
    },
    take: 4,
    orderBy: { createdAt: 'desc' }, // Сначала новые
    include: {
      variants: {
        include: {
          items: true,
          images: {
            include: { image: true },
            orderBy: { order: 'asc' },
            take: 1,
          },
        },
      },
    },
  })

  if (products.length === 0) {
    return null
  }

  // Сериализация данных идентично ProductsList
  const serializedProducts: SerializedProduct[] = products.map((product: ProductWithVariantsDb) => ({
    ...product,
    variants: product.variants.map((variant: ProductVariantDb) => ({
      ...variant,
      items: variant.items.map((item: ProductItemDb) => ({
        ...item,
        price: Number(item.price),
      })),
      images: variant.images.map((vi: VariantImageDb) => ({
        id: vi.id,
        url: getImageUrl(vi.image.path),
        alt: vi.alt,
      })),
    })),
  }))

  const wishlistVariantIds: string[] = []
  if (session?.user) {
    const wishlist = await db.wishlist.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          select: { productVariantId: true },
        },
      },
    })
    if (wishlist?.items) {
      wishlistVariantIds.push(...wishlist.items.map((item: WishlistItem) => item.productVariantId))
    }
  }

  return (
    <Box py={{ base: 16, md: 24 }} bg="bg.subtle">
      <Container maxW="7xl">
        <VStack gap={12} align="stretch">
          <VStack gap={4} textAlign="center">
            <Heading as="h2" size="2xl">
              Новинки Коллекции
            </Heading>
            <Text fontSize="xl" color="fg.muted">
              Успейте приобрести эксклюзивные модели
            </Text>
          </VStack>

          <Grid
            templateColumns={{
              base: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            }}
            gap={6}
          >
            {serializedProducts.map((product: SerializedProduct) => (
              <ProductCard
                key={product.id}
                product={product}
                isAuthenticated={!!session?.user}
                wishlistVariantIds={wishlistVariantIds}
              />
            ))}
          </Grid>
        </VStack>
      </Container>
    </Box>
  )
}
