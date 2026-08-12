import { createItemListSchema, JsonLd, SITE_URL } from '@/app/_components/json-ld'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/create-image'
import { Box, Container, Grid, Heading, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ProductCard } from './_components/product-card'

// Список товаров редактируется через админку (/admin/products) — без force-dynamic
// Next.js App Router по умолчанию запекает страницу на этапе билда (SSG), и изменения
// в БД (наличие товара, новые товары) не отражаются без полного ребилда. Тот же класс
// ошибки уже был пойман в apps/aboi/catalog и apps/domwellbes/houses — см. правило
// "MUST export const dynamic = 'force-dynamic'" в .claude/rules/nextjs-apps.md.
export const dynamic = 'force-dynamic'

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
    // Товары не в наличии — в конец списка. Без этого сортировка по одному лишь
    // `order` пускает вперёд любой товар с дефолтным order=0 (в т.ч. накопившиеся
    // нераспроданные/тестовые товары из e2e), из-за чего "первая карточка" на /shop
    // может оказаться недоступной для покупки — гостевой checkout ищет кнопку
    // "Добавить в корзину" именно у первого товара и не находит её.
    orderBy: [{ inStock: 'desc' }, { order: 'asc' }],
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
