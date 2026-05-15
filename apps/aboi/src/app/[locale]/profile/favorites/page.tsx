import { Box, Container, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth-utils'
import { prismaAuth } from '@/lib/prisma'
import { WishlistRemoveButton } from './_components/wishlist-remove'

export default async function FavoritesPage() {
  const user = await requireAuth()
  const items = await prismaAuth.wishlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1, include: { image: true } },
        },
      },
    },
  })

  return (
    <Container maxW="5xl" py={{ base: 8, md: 12 }}>
      <Stack gap={6}>
        <Heading as="h1" size="3xl">
          Избранное
        </Heading>

        {items.length === 0
          ? (
            <Box p={12} bg="bg.subtle" borderRadius="xl" textAlign="center">
              <Text color="fg.muted">В избранном пусто.</Text>
              <Box asChild color="brand.solid" mt={2} _hover={{ textDecoration: 'underline' }}>
                <Link href="/catalog">Перейти в каталог →</Link>
              </Box>
            </Box>
          )
          : (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={4}>
              {items.map((item) => {
                const cover = item.product.images[0]?.image
                return (
                  <Stack
                    key={item.id}
                    gap={2}
                    borderRadius="xl"
                    overflow="hidden"
                    borderWidth="1px"
                    borderColor="border"
                    bg="bg.surface"
                  >
                    <Box asChild>
                      <Link href={`/catalog/${item.product.slug}`}>
                        {cover
                          ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/files/${cover.path}`}
                              alt={item.product.name}
                              style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover' }}
                            />
                          )
                          : <Box w="full" aspectRatio="4/5" bg="bg.muted" />}
                      </Link>
                    </Box>
                    <Stack gap={1} px={3} pb={3}>
                      <Box asChild fontWeight="medium" _hover={{ color: 'brand.solid' }}>
                        <Link href={`/catalog/${item.product.slug}`}>{item.product.name}</Link>
                      </Box>
                      <Text fontSize="sm" color="fg.muted">
                        {(item.product.pricePerMeter / 100).toFixed(0)} ₽ / пог. м
                      </Text>
                      <WishlistRemoveButton productId={item.productId} />
                    </Stack>
                  </Stack>
                )
              })}
            </SimpleGrid>
          )}
      </Stack>
    </Container>
  )
}
