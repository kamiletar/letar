import { prismaAuth } from '@/lib/prisma'
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo'
import { Badge, Box, Container, Heading, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AddToCart } from './_components/add-to-cart'
import { ProductGallery } from './_components/product-gallery'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://neyroaboi.ru'

// Динамический рендер — карточка читает из БД.
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string; locale: string }>
}

async function getPublishedProduct(slug: string) {
  return prismaAuth.product.findFirst({
    where: { slug, published: true, deletedAt: null },
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
        include: { image: true },
      },
    },
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getPublishedProduct(slug)
  if (!product) return { title: 'Товар не найден' }

  const description = product.description ?? `Дизайнерские обои «${product.name}» — печать под заказ, флизелин 1.07 м.`
  const cover = product.images[0]?.image

  return {
    title: product.name,
    description,
    alternates: { canonical: `/catalog/${product.slug}/` },
    openGraph: {
      title: product.name,
      description,
      url: `${BASE_URL}/catalog/${product.slug}/`,
      images: cover ? [{ url: `${BASE_URL}/api/files/${cover.path}` }] : undefined,
      type: 'website',
    },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = await getPublishedProduct(slug)
  if (!product) notFound()

  const imageUrls = product.images.map((pi) => `${BASE_URL}/api/files/${pi.image.path}`)
  const jsonLd = [
    productJsonLd({
      slug: product.slug,
      name: product.name,
      description: product.description,
      pricePerMeter: product.pricePerMeter,
      imageUrls,
    }),
    breadcrumbJsonLd([
      { name: 'Главная', path: '/' },
      { name: 'Каталог', path: '/catalog/' },
      { name: product.name, path: `/catalog/${product.slug}/` },
    ]),
  ]
  // Safe-by-construction: JSON.stringify не пускает символы, ломающие HTML, кроме </script>;
  // дополнительно экранируем </script> как замену.
  const jsonLdHtml = JSON.stringify(jsonLd).replace(/<\/script>/g, '<\\/script>')

  return (
    <Box bg="bg" color="fg" minH="100dvh">
      <JsonLdScript html={jsonLdHtml} />

      <Container maxW="7xl" py={{ base: 8, md: 12 }}>
        <HStack gap={2} fontSize="sm" color="fg.muted" mb={6}>
          <Box asChild _hover={{ color: 'brand.solid' }}>
            <Link href="/">Главная</Link>
          </Box>
          <Text>/</Text>
          <Box asChild _hover={{ color: 'brand.solid' }}>
            <Link href="/catalog">Каталог</Link>
          </Box>
          <Text>/</Text>
          <Text color="fg">{product.name}</Text>
        </HStack>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={{ base: 6, md: 12 }}>
          <ProductGallery
            images={product.images.map((pi) => ({ path: pi.image.path, alt: pi.image.alt }))}
            productName={product.name}
          />

          <Stack gap={5}>
            {product.affirmations.length > 0 && (
              <HStack gap={2} wrap="wrap">
                {product.affirmations.map((aff) => (
                  <Badge key={aff} colorPalette="brand" variant="subtle">
                    {aff}
                  </Badge>
                ))}
              </HStack>
            )}

            <Heading as="h1" size={{ base: '2xl', md: '4xl' }} lineHeight="1.1">
              {product.name}
            </Heading>

            {product.description && (
              <Text color="fg.muted" fontSize="lg" lineHeight="1.6">
                {product.description}
              </Text>
            )}

            <Stack gap={1} p={5} bg="bg.subtle" borderRadius="xl">
              <Text fontSize="sm" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
                Цена
              </Text>
              <Text fontSize="3xl" fontWeight="bold">
                {(product.pricePerMeter / 100).toFixed(0)} ₽{' '}
                <Text as="span" fontSize="md" fontWeight="normal" color="fg.muted">
                  / пог. м
                </Text>
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Минимальный заказ: {Number(product.minLengthMeters).toFixed(1)} м · Флизелин 1.07 м · Печать под заказ
              </Text>
            </Stack>

            <AddToCart
              productId={product.id}
              minLengthMeters={Number(product.minLengthMeters)}
              pricePerMeter={product.pricePerMeter}
            />

            <Box asChild fontSize="sm" color="brand.solid" textAlign="center">
              <Link href="/cart">Перейти в корзину →</Link>
            </Box>

            <Text fontSize="xs" color="fg.subtle">
              НейроАбоИ — декоративный продукт. Не является медицинским изделием.
            </Text>
          </Stack>
        </SimpleGrid>
      </Container>
    </Box>
  )
}

/**
 * Server-component, инжектящий JSON-LD на страницу.
 * Пропс `html` — уже сериализованный JSON со экранированным `</script>`.
 * Контент полностью контролируется сервером (никакого пользовательского ввода).
 */
function JsonLdScript({ html }: { html: string }) {
  const dangerProp = { __html: html }
  // eslint-disable-next-line react/no-danger
  return <script type="application/ld+json" dangerouslySetInnerHTML={dangerProp} />
}
