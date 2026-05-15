import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import { getRecommendedProducts, type SerializedProduct } from '@/lib/recommendation-utils'
import { Container, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import { ProductCard } from '../catalog/_components/product-card'

/** Тип item wishlist из БД */
interface WishlistItemWithProduct {
  productVariant: {
    product: {
      id: string
      categoryId: string | null
      gender: 'MALE' | 'FEMALE'
    }
  }
}

/**
 * Блок "Вам может понравиться" на главной странице.
 * - Авторизован: рекомендации на основе wishlist (категория/пол из wishlist items)
 * - Не авторизован: топ по рейтингу, исключая новую коллекцию (она уже в FeaturedProducts)
 */
export async function RecommendedProducts() {
  const session = await getSession()
  const db = getEnhancedPrisma()

  let products: SerializedProduct[] = []
  let wishlistVariantIds: string[] = []

  if (session?.user) {
    // Авторизован: определяем предпочтения по wishlist
    const wishlist = await db.wishlist.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          select: {
            productVariantId: true,
            productVariant: {
              select: {
                product: {
                  select: {
                    id: true,
                    categoryId: true,
                    gender: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    wishlistVariantIds = wishlist?.items.map((i: { productVariantId: string }) => i.productVariantId) || []

    if (wishlist?.items && wishlist.items.length > 0) {
      // Извлекаем предпочитаемые категории и пол из wishlist
      const wishlistProductIds = wishlist.items.map((i: WishlistItemWithProduct) => i.productVariant.product.id)
      const categories = wishlist.items
        .map((i: WishlistItemWithProduct) => i.productVariant.product.categoryId)
        .filter((c: string | null): c is string => c !== null)
      const genders = wishlist.items.map((i: WishlistItemWithProduct) => i.productVariant.product.gender)

      // Определяем преобладающий пол
      const genderCounts = genders.reduce(
        (acc: Record<string, number>, g: string) => {
          acc[g] = (acc[g] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )
      const dominantGender = Object.entries(genderCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as
        | 'MALE'
        | 'FEMALE'
        | undefined

      // Рекомендуем товары из тех же категорий/пола, исключая уже в wishlist
      const primaryCategory = categories[0] || null

      products = await getRecommendedProducts(db, {
        excludeIds: wishlistProductIds,
        categoryId: primaryCategory,
        gender: dominantGender,
        limit: 4,
      })
    }
  }

  // Fallback для неавторизованных или если wishlist пуст: топ по рейтингу
  if (products.length === 0) {
    // Исключаем товары из новой коллекции (они уже в FeaturedProducts)
    const topProducts = await db.product.findMany({
      where: {
        isNewCollection: false,
        averageRating: { not: null },
        variants: {
          some: {
            items: {
              some: { availableCount: { gt: 0 } },
            },
          },
        },
      },
      take: 4,
      orderBy: [{ averageRating: 'desc' }, { reviewCount: 'desc' }],
      include: {
        seller: {
          select: { shopName: true, slug: true },
        },
        variants: {
          include: {
            colorRef: true,
            items: {
              orderBy: { price: 'asc' },
            },
            images: {
              include: { image: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
      },
    })

    products = topProducts.map((product) => ({
      ...product,
      variants: product.variants.map((variant: (typeof product.variants)[number]) => ({
        ...variant,
        items: variant.items.map((item: (typeof variant.items)[number]) => ({
          ...item,
          price: Number(item.price),
        })),
        images: variant.images.map((vi: (typeof variant.images)[number]) => ({
          id: vi.id,
          url: getImageUrl(vi.image.path),
          alt: vi.alt,
        })),
      })),
    }))
  }

  if (products.length === 0) {
    return null
  }

  return (
    <Container maxW="7xl" py={{ base: 12, md: 16 }}>
      <VStack gap={10} align="stretch">
        <VStack gap={3} textAlign="center">
          <Heading as="h2" size="2xl" textTransform="none">
            Вам может понравиться
          </Heading>
          <Text fontSize="lg" color="fg.muted">
            Подобрали специально для вас
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
          {products.map((product) => (
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
  )
}
