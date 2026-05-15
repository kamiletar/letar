import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import { Box, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { FaStore } from 'react-icons/fa'
import { ProductJsonLd } from '../_components/product-json-ld'
import { ProductReviews } from '../_components/product-reviews'
import { ProductView } from '../_components/product-view'
import { SimilarProducts } from '../_components/similar-products'
import { getProduct } from '../_lib/get-product'

interface ProductPageProps {
  params: Promise<{ id: string; slug?: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Generate metadata for SEO
export async function generateMetadata({ params, searchParams }: ProductPageProps): Promise<Metadata> {
  const { id } = await params
  const { variant: variantId, size: sizeId } = await searchParams

  // React cache() дедуплицирует запрос — product загружается один раз для metadata + page
  const product = await getProduct(id)

  if (!product) {
    return {
      title: 'Продукт не найден',
    }
  }

  // Find selected variant and item if provided in URL
  const selectedVariant =
    typeof variantId === 'string'
      ? product.variants.find((v: (typeof product.variants)[number]) => v.id === variantId)
      : null
  const selectedItem =
    typeof sizeId === 'string' && selectedVariant
      ? selectedVariant.items.find((item: (typeof selectedVariant.items)[number]) => item.id === sizeId)
      : null

  // Use selected variant's first image or fallback to first variant
  const selectedVariantImage = selectedVariant?.images[0]
  const fallbackImage = product.variants[0]?.images[0]
  const firstImagePath = selectedVariantImage?.image.path || fallbackImage?.image.path
  const firstImageUrl = firstImagePath ? getImageUrl(firstImagePath) : null

  // Generate optimized OG image URL using custom API with Sharp crop
  const ogImageUrl = firstImageUrl ? `/api/og-image?url=${encodeURIComponent(firstImageUrl)}&w=1200&h=630` : null

  // Build title with specific variant and size if selected
  let title = `${product.name}`
  if (selectedVariant) {
    title += ` — ${selectedVariant.color}`
  }
  if (selectedItem) {
    title += `, размер ${selectedItem.size.international}`
  }
  title += ` — Премиум РосСтиль`

  // Build description - use product description if available
  let description = product.description
    ? product.description
    : `${product.name}. Дизайнерская одежда от Елены Аксяновой.`

  // Add variant information
  if (selectedVariant) {
    description += ` Цвет: ${selectedVariant.color}.`
    if (selectedVariant.composition) {
      description += ` Состав: ${selectedVariant.composition}.`
    }
  } else if (product.variants.length > 0) {
    description += ` Доступные цвета: ${product.variants
      .map((v: (typeof product.variants)[number]) => v.color)
      .join(', ')}.`
  }

  // Add price information
  if (selectedItem) {
    description += ` Цена: ${Number(selectedItem.price).toLocaleString('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    })}.`
  } else {
    const minPrice = product.variants.reduce((min: number, variant: (typeof product.variants)[number]) => {
      const variantMin = variant.items.reduce(
        (vMin: number, item: (typeof variant.items)[number]) => Math.min(vMin, Number(item.price)),
        Infinity
      )
      return Math.min(min, variantMin)
    }, Infinity)

    if (minPrice !== Infinity) {
      description += ` От ${minPrice.toLocaleString('ru-RU', {
        style: 'currency',
        currency: 'RUB',
      })}.`
    }
  }

  // Build Open Graph title
  let ogTitle = product.name
  if (selectedVariant) {
    ogTitle += ` — ${selectedVariant.color}`
  }
  if (selectedItem) {
    ogTitle += `, ${selectedItem.size.international}`
  }

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      images: ogImageUrl
        ? [
            {
              url: ogImageUrl,
              width: 1200,
              height: 630,
              alt: `${product.name}${selectedVariant ? ` — ${selectedVariant.color}` : ''}`,
            },
          ]
        : [],
      type: 'website',
      locale: 'ru_RU',
      siteName: 'Премиум РосСтиль',
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params

  // React cache() дедуплицирует — повторный вызов после generateMetadata бесплатен
  const product = await getProduct(id)

  if (!product) {
    notFound()
  }

  const session = await getSession()
  const isAuthenticated = !!session?.user

  const db = getEnhancedPrisma()

  // Загружаем размеры и статистику отзывов параллельно
  const [allSizes, reviewStats] = await Promise.all([
    db.productSize.findMany({
      where: { gender: product.gender },
      select: {
        id: true,
        gender: true,
        international: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    }),
    (db.review as any).aggregate({
      _avg: { rating: true },
      _count: { id: true },
      where: { productId: product.id, status: 'PUBLISHED' },
    }),
  ])

  // Данные пользователя — загружаем параллельно все 5 запросов
  let wishlistVariantIds: string[] = []
  let stockNotificationItemIds: string[] = []
  let userMeasurements: {
    bust: number | null
    waist: number | null
    hips: number | null
    height: number | null
    gender: string
  } | null = null
  let companyProfile: {
    companyName: string
    companyINN: string | null
    companyAddress: string | null
    contactPerson: string | null
    companyPhone: string | null
    companyEmail: string | null
  } | null = null
  let userContactInfo: {
    name: string | null
    email: string
    phone: string | null
  } | null = null

  if (isAuthenticated && session?.user) {
    const userDb = getEnhancedPrisma(session.user)

    // Все ID товаров для запроса подписок на уведомления
    const allProductItemIds = product.variants.flatMap((v: (typeof product.variants)[number]) =>
      v.items.map((item: (typeof v.items)[number]) => item.id)
    )

    // Параллельная загрузка всех пользовательских данных
    const [wishlist, measurements, company, userProfile, subscriptions] = await Promise.all([
      userDb.wishlist.findUnique({
        where: { userId: session.user.id },
        include: { items: { select: { productVariantId: true } } },
      }),
      userDb.userMeasurements.findUnique({
        where: { userId: session.user.id },
        select: { bust: true, waist: true, hips: true, height: true, gender: true },
      }),
      userDb.companyProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          companyName: true,
          companyINN: true,
          companyAddress: true,
          contactPerson: true,
          companyPhone: true,
          companyEmail: true,
        },
      }),
      userDb.userProfile.findUnique({
        where: { userId: session.user.id },
        select: { phoneNumber: true },
      }),
      allProductItemIds.length > 0
        ? userDb.stockNotification.findMany({
            where: {
              userId: session.user.id,
              productItemId: { in: allProductItemIds },
              notified: false,
            },
            select: { productItemId: true },
          })
        : Promise.resolve([]),
    ])

    wishlistVariantIds = wishlist?.items.map((item: { productVariantId: string }) => item.productVariantId) || []
    userMeasurements = measurements ?? null
    companyProfile = company ?? null
    userContactInfo = {
      name: session.user.name || null,
      email: session.user.email || '',
      phone: userProfile?.phoneNumber || null,
    }
    stockNotificationItemIds = subscriptions.map((s: { productItemId: string }) => s.productItemId)
  }

  // Convert Decimal to number and transform images for client component

  const serializedProduct = {
    ...product,
    variants: product.variants.map((variant: (typeof product.variants)[number]) => ({
      ...variant,
      items: variant.items.map((item: (typeof variant.items)[number]) => ({
        ...item,
        price: Number(item.price),
        availableCount: item.availableCount,
      })),
      // Преобразуем изображения: добавляем url из image.path
      images: variant.images.map((vi: (typeof variant.images)[number]) => ({
        id: vi.id,
        url: getImageUrl(vi.image.path),
        height: vi.image.height || 0,
        width: vi.image.width || 0,
        alt: vi.alt || '',
        order: vi.order,
      })),
    })),
  }

  return (
    <Container maxW="7xl" py={8}>
      <ProductJsonLd
        product={product}
        reviewCount={reviewStats._count?.id ?? 0}
        averageRating={reviewStats._avg?.rating ?? undefined}
      />
      <ProductView
        product={serializedProduct}
        isAuthenticated={isAuthenticated}
        wishlistVariantIds={wishlistVariantIds}
        stockNotificationItemIds={stockNotificationItemIds}
        userMeasurements={userMeasurements}
        userContactInfo={userContactInfo}
        companyProfile={companyProfile}
        allSizes={allSizes}
      />

      {/* Блок "О продавце" */}
      {product.seller && product.seller.status === 'ACTIVE' && (
        <Box mt={8} p={6} borderWidth="1px" borderRadius="lg" bg="bg.subtle">
          <HStack gap={3} mb={3}>
            <Box color="fg.muted">
              <FaStore />
            </Box>
            <Heading size="md" textTransform="none">
              Продавец
            </Heading>
          </HStack>
          <VStack align="start" gap={2}>
            <NextLink href={`/shop/${product.seller.slug}`}>
              <Text fontWeight="semibold" color="fg" _hover={{ textDecoration: 'underline' }}>
                {product.seller.shopName}
              </Text>
            </NextLink>
            {product.seller.description && (
              <Text fontSize="sm" color="fg.muted" lineClamp={3}>
                {product.seller.description}
              </Text>
            )}
            <NextLink href={`/catalog?seller=${product.seller.slug}`}>
              <Text fontSize="sm" color="fg.muted" _hover={{ textDecoration: 'underline' }}>
                Все товары продавца →
              </Text>
            </NextLink>
          </VStack>
        </Box>
      )}

      {/* Отзывы */}
      <ProductReviews productId={product.id} />

      {/* Похожие товары */}
      <Suspense>
        <SimilarProducts
          productId={product.id}
          categoryId={product.categoryId}
          gender={product.gender}
          sellerId={product.sellerId}
        />
      </Suspense>
    </Container>
  )
}
