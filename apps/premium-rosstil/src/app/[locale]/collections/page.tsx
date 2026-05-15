import type { Season } from '@/generated/prisma'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import { SEASON_LABELS } from '@/lib/seasons'
import { Badge, Box, Card, Container, Heading, Image, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'

export const metadata: Metadata = {
  title: 'Коллекции',
  description: 'Lookbook и коллекции Премиум РосСтиль',
}

export default async function CollectionsPage() {
  const db = getEnhancedPrisma()

  const collections = await db.collection.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: {
      coverImage: { select: { path: true } },
      _count: { select: { products: true } },
    },
  })

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        <VStack gap={2}>
          <Heading size="3xl" textTransform="none">
            Коллекции
          </Heading>
          <Text color="fg.muted" fontSize="lg">
            Модные образы и подборки
          </Text>
        </VStack>

        {collections.length === 0 ? (
          <Box textAlign="center" py={16}>
            <Text color="fg.muted" fontSize="lg">
              Скоро здесь появятся коллекции
            </Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {collections.map((collection) => (
              <NextLink key={collection.id} href={`/collections/${collection.slug}`}>
                <Card.Root
                  overflow="hidden"
                  _hover={{ transform: 'translateY(-4px)', shadow: 'lg' }}
                  transition="all 0.3s"
                  cursor="pointer"
                >
                  {collection.coverImage && (
                    <Image
                      src={getImageUrl(collection.coverImage.path)}
                      alt={collection.name}
                      height="300px"
                      width="100%"
                      objectFit="cover"
                    />
                  )}
                  {!collection.coverImage && (
                    <Box height="300px" bg="bg.subtle" display="flex" alignItems="center" justifyContent="center">
                      <Text color="fg.muted" fontSize="lg">
                        {collection.name}
                      </Text>
                    </Box>
                  )}
                  <Card.Body>
                    <VStack align="start" gap={2}>
                      <Heading size="lg" textTransform="none">
                        {collection.name}
                      </Heading>
                      <Badge colorPalette="purple" size="sm">
                        {SEASON_LABELS[collection.season as Season]}
                        {collection.year ? ` ${collection.year}` : ''}
                      </Badge>
                      {collection.description && (
                        <Text color="fg.muted" fontSize="sm" lineClamp={2}>
                          {collection.description}
                        </Text>
                      )}
                      <Text fontSize="sm" color="fg.muted">
                        {collection._count.products} {getProductLabel(collection._count.products)}
                      </Text>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              </NextLink>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  )
}

function getProductLabel(count: number): string {
  const last = count % 10
  const lastTwo = count % 100
  if (lastTwo >= 11 && lastTwo <= 19) {
    return 'товаров'
  }
  if (last === 1) {
    return 'товар'
  }
  if (last >= 2 && last <= 4) {
    return 'товара'
  }
  return 'товаров'
}
