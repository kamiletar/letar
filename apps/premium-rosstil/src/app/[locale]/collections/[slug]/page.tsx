import type { Season } from '@/generated/prisma'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import { SEASON_LABELS } from '@/lib/seasons'
import { Badge, Box, Card, Container, Heading, HStack, Image, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'

interface CollectionPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params
  const db = getEnhancedPrisma()
  const collection = await db.collection.findUnique({
    where: { slug },
    select: { name: true, description: true },
  })

  if (!collection) {
    return { title: 'Коллекция не найдена' }
  }

  return {
    title: collection.name,
    description: collection.description || `Коллекция ${collection.name} — Премиум РосСтиль`,
  }
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { slug } = await params
  const db = getEnhancedPrisma()

  const collection = await db.collection.findUnique({
    where: { slug },
    include: {
      coverImage: { select: { path: true } },
      products: {
        orderBy: { sortOrder: 'asc' },
        include: {
          product: {
            include: {
              variants: {
                take: 1,
                include: {
                  items: {
                    take: 1,
                    orderBy: { price: 'asc' },
                  },
                  images: {
                    take: 1,
                    orderBy: { order: 'asc' },
                    include: { image: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!collection) {
    notFound()
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Заголовок коллекции */}
        <VStack gap={3} textAlign="center">
          <Badge colorPalette="purple" size="lg">
            {SEASON_LABELS[collection.season as Season]}
            {collection.year ? ` ${collection.year}` : ''}
          </Badge>
          <Heading size="3xl" textTransform="none">
            {collection.name}
          </Heading>
          {collection.description && (
            <Text color="fg.muted" fontSize="lg" maxW="600px">
              {collection.description}
            </Text>
          )}
        </VStack>

        {/* Обложка */}
        {collection.coverImage && (
          <Box borderRadius="xl" overflow="hidden">
            <Image
              src={getImageUrl(collection.coverImage.path)}
              alt={collection.name}
              width="100%"
              maxH="500px"
              objectFit="cover"
            />
          </Box>
        )}

        {/* Товары коллекции */}
        <Heading size="xl" textTransform="none">
          Товары коллекции
        </Heading>

        <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={6}>
          {collection.products.map(({ product }) => {
            const firstVariant = product.variants[0]
            const firstImage = firstVariant?.images[0]
            const minPrice = firstVariant?.items[0]

            return (
              <NextLink key={product.id} href={`/catalog/${product.id}`}>
                <Card.Root
                  overflow="hidden"
                  _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
                  transition="all 0.2s"
                  cursor="pointer"
                >
                  {firstImage ? (
                    <Image
                      src={getImageUrl(firstImage.image.path)}
                      alt={product.name}
                      height="250px"
                      width="100%"
                      objectFit="cover"
                    />
                  ) : (
                    <Box height="250px" bg="bg.subtle" />
                  )}
                  <Card.Body p={3}>
                    <VStack align="start" gap={1}>
                      <Text fontWeight="medium" fontSize="sm" lineClamp={2}>
                        {product.name}
                      </Text>
                      <HStack>
                        {firstVariant && (
                          <Badge size="sm" variant="subtle">
                            {firstVariant.color}
                          </Badge>
                        )}
                      </HStack>
                      {minPrice && (
                        <Text fontWeight="bold" color="fg">
                          {Number(minPrice.price).toLocaleString('ru-RU', {
                            style: 'currency',
                            currency: 'RUB',
                          })}
                        </Text>
                      )}
                    </VStack>
                  </Card.Body>
                </Card.Root>
              </NextLink>
            )
          })}
        </SimpleGrid>

        {collection.products.length === 0 && (
          <Box textAlign="center" py={8}>
            <Text color="fg.muted">В этой коллекции пока нет товаров</Text>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
