import { createBreadcrumbSchema, createProductSchema, JsonLd, SITE_URL } from '@/app/_components/json-ld'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/create-image'
import { Badge, Box, Container, Flex, Grid, Heading, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { AddToCartButton } from './_components/add-to-cart-button'
import { ProductSlider } from './_components/product-slider'

// Страница использует headers() через auth - принудительно динамическая
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string; locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const t = await getTranslations({ locale, namespace: 'notFound' })

  const db = getEnhancedPrisma()
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      images: {
        include: { image: true },
        orderBy: { order: 'asc' },
        take: 1,
      },
      ogImageRel: true,
    },
  })

  if (!product) {
    return {
      title: t('title'),
    }
  }

  const firstImage = product.images[0]

  // Логика выбора OG-image:
  // 1. Если product.ogImageId — использовать кастомный
  // 2. Иначе — генерировать из первого изображения через /api/og-image
  let ogImageUrl: string | null = null
  if (product.ogImageRel) {
    // Кастомный OG-image
    ogImageUrl = getImageUrl(product.ogImageRel.path)
  } else if (firstImage) {
    // Автогенерация через /api/og-image (crop по центру 1200x630)
    ogImageUrl = `/api/og-image?url=${encodeURIComponent(getImageUrl(firstImage.image.path))}&w=1200&h=630`
  }

  return {
    title: product.metaTitle || product.name,
    description: product.metaDescription || product.description || `Товар ${product.name}`,
    alternates: {
      canonical: `/shop/${slug}`,
    },
    openGraph: {
      title: product.metaTitle || product.name,
      description: product.metaDescription || product.description || `Товар ${product.name}`,
      url: `${SITE_URL}/shop/${slug}`,
      images: ogImageUrl
        ? [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: product.name,
          },
        ]
        : [],
    },
  }
}

export async function generateStaticParams() {
  try {
    const db = getEnhancedPrisma()
    const products = await db.product.findMany({
      where: { published: true },
      select: { slug: true },
    })

    return products.map((product) => ({
      slug: product.slug,
    }))
  } catch {
    // БД недоступна при билде — страницы будут генерироваться динамически
    return []
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug, locale } = await params
  const t = await getTranslations('shop')
  const tBreadcrumbs = await getTranslations('shop.breadcrumbs')

  const db = getEnhancedPrisma()
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      images: {
        include: { image: true },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!product || !product.published) {
    notFound()
  }

  const price = product.price

  // Трансформируем изображения для клиентского компонента
  const imagesWithUrls = product.images.map((img) => ({
    id: img.id,
    url: getImageUrl(img.image.path),
    alt: img.alt,
  }))

  // Трансформируем продукт для AddToCartButton
  const productWithUrls = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    firstImageUrl: imagesWithUrls[0]?.url ?? null,
  }

  // JSON-LD Schema.org для продукта
  const productSchema = createProductSchema({
    name: product.name,
    description: product.description || `${product.name} - Elfafeya Art`,
    imageUrl: imagesWithUrls[0]?.url ? `${SITE_URL}${imagesWithUrls[0].url}` : `${SITE_URL}/icons/icon-512.png`,
    price: product.price,
    slug: product.slug,
    inStock: product.inStock,
  })

  // JSON-LD BreadcrumbList для улучшения навигации в поисковой выдаче
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: SITE_URL },
    { name: tBreadcrumbs('shop'), url: `${SITE_URL}/shop` },
    { name: product.name, url: `${SITE_URL}/shop/${slug}` },
  ])

  return (
    <>
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />

      <Container maxW="container.xl" py={8}>
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={8}>
          {/* Слайдер изображений */}
          <Box>
            <ProductSlider images={imagesWithUrls} productName={product.name} />
          </Box>

          {/* Информация о товаре */}
          <Box>
            <Flex gap={3} mb={4}>
              {product.inStock
                ? (
                  <Badge colorPalette="green" size="lg" bg="green.700" color="white">
                    {t('inStock')}
                  </Badge>
                )
                : (
                  <Badge colorPalette="red" size="lg" bg="red.600" color="white">
                    {t('outOfStock')}
                  </Badge>
                )}
            </Flex>

            <Heading as="h1" size="2xl" color="fg" mb={4}>
              {product.name}
            </Heading>

            <Text fontSize="3xl" fontWeight="bold" color="fg" mb={6}>
              {price.toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU')} {locale === 'en' ? '₽' : '₽'}
            </Text>

            {product.description && (
              <Text fontSize="lg" color="fg.muted" mb={8} whiteSpace="pre-wrap">
                {product.description}
              </Text>
            )}

            {product.inStock && <AddToCartButton product={productWithUrls} />}
          </Box>
        </Grid>
      </Container>
    </>
  )
}
