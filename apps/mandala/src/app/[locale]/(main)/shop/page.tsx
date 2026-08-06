import { createItemListSchema, JsonLd, SITE_URL } from '@/app/_components/json-ld'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/create-image'
import { Box, Container, Grid, Heading, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ProductCard } from './_components/product-card'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'shop.page' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: '/shop',
    },
  }
}

export default async function ShopPage() {
  const t = await getTranslations('shop')

  const db = getEnhancedPrisma()
  // Оптимизация: загружаем только нужные поля для карточек товаров
  const products = await db.product.findMany({
    where: { published: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      price: true,
      inStock: true,
      images: {
        select: {
          id: true,
          alt: true,
          image: { select: { path: true } },
        },
        orderBy: { order: 'asc' },
        take: 1, // Для карточки нужна только первая картинка
      },
    },
    orderBy: { order: 'asc' },
  })

  // Трансформируем данные для клиентского компонента
  const productsWithUrls = products.map((product) => ({
    ...product,
    images: product.images.map((img) => ({
      id: img.id,
      url: getImageUrl(img.image.path),
      alt: img.alt,
    })),
  }))

  // JSON-LD ItemList для улучшения индексации коллекции товаров
  const itemListSchema = createItemListSchema(
    'Elfafeya Art Shop',
    products.map((p) => ({
      url: `${SITE_URL}/shop/${p.slug}`,
      name: p.name,
    })),
  )

  return (
    <>
      <JsonLd data={itemListSchema} />
      <Container maxW="container.xl" py={8}>
        <Box textAlign="center" mb={8}>
          <Heading as="h1" size="2xl" color="fg" mb={2}>
            {t('title')}
          </Heading>
          <Text fontSize="lg" color="fg.muted">
            {t('page.metaDescription')}
          </Text>
        </Box>

        {products.length === 0
          ? (
            <Box textAlign="center" py={10}>
              <Text fontSize="xl" color="fg.muted">
                {t('empty')}
              </Text>
            </Box>
          )
          : (
            <Grid
              templateColumns={{
                base: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              }}
              gap={6}
            >
              {productsWithUrls.map((product) => <ProductCard key={product.id} product={product} />)}
            </Grid>
          )}
      </Container>
    </>
  )
}
