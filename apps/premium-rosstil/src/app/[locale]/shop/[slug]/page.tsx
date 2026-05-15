import { StarRating } from '@/app/_components/star-rating'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import { Box, Container, Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { FaStore } from 'react-icons/fa'
import { ProductCard } from '../../catalog/_components/product-card'

interface ShopPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

const ITEMS_PER_PAGE = 12

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { slug } = await params
  const db = getEnhancedPrisma()

  const seller = await db.seller.findUnique({
    where: { slug },
    select: { shopName: true, description: true },
  })

  if (!seller) {
    return { title: 'Магазин не найден' }
  }

  return {
    title: `${seller.shopName} — Премиум РосСтиль`,
    description: seller.description || `Магазин ${seller.shopName} на Премиум РосСтиль`,
    openGraph: {
      title: seller.shopName,
      description: seller.description || `Магазин ${seller.shopName}`,
      type: 'website',
      locale: 'ru_RU',
      siteName: 'Премиум РосСтиль',
    },
  }
}

export default async function ShopPage({ params, searchParams }: ShopPageProps) {
  const { slug } = await params
  const { page: pageStr } = await searchParams
  const page = pageStr ? parseInt(pageStr, 10) : 1

  const session = await getSession()
  const db = getEnhancedPrisma(session?.user)

  // Загрузить продавца
  const seller = await db.seller.findUnique({
    where: { slug },
    select: {
      id: true,
      shopName: true,
      slug: true,
      description: true,
      status: true,
      contactEmail: true,
      contactPhone: true,
      averageRating: true,
      reviewCount: true,
      createdAt: true,
    },
  })

  if (!seller || seller.status !== 'ACTIVE') {
    notFound()
  }

  // Количество товаров
  const totalProducts = await db.product.count({
    where: { sellerId: seller.id },
  })
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE)
  const currentPage = Math.max(1, Math.min(page, totalPages || 1))

  // Товары продавца с пагинацией
  const products = await db.product.findMany({
    where: { sellerId: seller.id },
    include: {
      seller: { select: { shopName: true, slug: true } },
      variants: {
        include: {
          colorRef: { select: { id: true, name: true, slug: true, hex: true } },
          items: { orderBy: { price: 'asc' } },
          images: {
            include: { image: true },
            orderBy: { order: 'asc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
  })

  // Wishlist
  let wishlistVariantIds: string[] = []
  if (session?.user) {
    const wishlist = await db.wishlist.findUnique({
      where: { userId: session.user.id },
      include: { items: { select: { productVariantId: true } } },
    })
    wishlistVariantIds = wishlist?.items.map((item: { productVariantId: string }) => item.productVariantId) || []
  }

  // Сериализация Decimal → number, images
  const serializedProducts = products.map((product) => ({
    ...product,
    seller: product.seller,
    variants: product.variants.map((variant) => ({
      ...variant,
      colorRef: variant.colorRef,
      items: variant.items.map((item) => ({
        ...item,
        price: Number(item.price),
      })),
      images: variant.images.map((vi) => ({
        id: vi.id,
        url: getImageUrl(vi.image.path),
        alt: vi.alt,
      })),
    })),
  }))

  // Дата регистрации продавца
  const memberSince = seller.createdAt.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <Box py={8} bg="bg.subtle" minH="100vh">
      <Container maxW="7xl">
        {/* Шапка магазина */}
        <Box mb={8} p={6} borderRadius="lg" bg="bg" borderWidth="1px">
          <HStack gap={4} mb={4}>
            <Box color="fg.muted" fontSize="2xl">
              <FaStore />
            </Box>
            <VStack align="start" gap={1}>
              <Heading size="2xl" textTransform="none">
                {seller.shopName}
              </Heading>
              <HStack gap={4} fontSize="sm" color="fg.muted" flexWrap="wrap">
                <Text>На площадке с {memberSince}</Text>
                <Text>
                  {totalProducts} {totalProducts === 1 ? 'товар' : totalProducts < 5 ? 'товара' : 'товаров'}
                </Text>
                {seller.averageRating && seller.reviewCount > 0 && (
                  <StarRating rating={seller.averageRating} count={seller.reviewCount} size="sm" />
                )}
              </HStack>
            </VStack>
          </HStack>

          {seller.description && (
            <Text color="fg.muted" maxW="3xl">
              {seller.description}
            </Text>
          )}
        </Box>

        {/* Товары */}
        {serializedProducts.length === 0 ? (
          <Box textAlign="center" py={16}>
            <Text fontSize="lg" color="fg.muted">
              У продавца пока нет товаров
            </Text>
          </Box>
        ) : (
          <Grid
            templateColumns={{
              base: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            }}
            gap={6}
          >
            {serializedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isAuthenticated={!!session?.user}
                wishlistVariantIds={wishlistVariantIds}
              />
            ))}
          </Grid>
        )}

        {/* Пагинация */}
        {totalPages > 1 && (
          <HStack justify="center" mt={8} gap={2}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <NextLink key={p} href={`/shop/${seller.slug}?page=${p}`}>
                <Box
                  px={3}
                  py={1}
                  borderRadius="md"
                  bg={p === currentPage ? 'fg' : 'bg'}
                  color={p === currentPage ? 'bg' : 'fg'}
                  fontWeight={p === currentPage ? 'bold' : 'normal'}
                  borderWidth="1px"
                  _hover={{ bg: p === currentPage ? 'fg' : 'bg.muted' }}
                >
                  {p}
                </Box>
              </NextLink>
            ))}
          </HStack>
        )}
      </Container>
    </Box>
  )
}
