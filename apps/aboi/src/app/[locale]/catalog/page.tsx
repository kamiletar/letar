import { prismaAuth } from '@/lib/prisma'
import { Box, Container, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Каталог обоев',
  description: 'Дизайнерские обои с зашитыми аффирмациями. Печать под заказ, флизелин 1.07 м, от 1 пог. м.',
  alternates: { canonical: '/catalog/' },
}

// Динамический рендер — каталог читает из БД, БД недоступна при сборке (SSG).
export const dynamic = 'force-dynamic'

export default async function CatalogPage() {
  const products = await prismaAuth.product.findMany({
    where: { published: true, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
        include: { image: true },
      },
    },
    take: 60,
  })

  return (
    <Box bg="bg" color="fg" minH="100dvh">
      <Container maxW="7xl" py={{ base: 12, md: 16 }}>
        <Stack gap={4} mb={10}>
          <Heading as="h1" size={{ base: '2xl', md: '4xl' }}>
            Каталог
          </Heading>
          <Text color="fg.muted" fontSize="lg" maxW="2xl">
            Дизайнерские паттерны с зашитыми аффирмациями. Печатаем на флизелине под заказ. От 1 пог. метра, цена за
            метр — <strong>1500 ₽</strong>.
          </Text>
        </Stack>

        {products.length === 0
          ? (
            <Box p={20} bg="bg.subtle" borderRadius="xl" textAlign="center">
              <Text color="fg.muted">Каталог наполняется. Загляните чуть позже.</Text>
            </Box>
          )
          : (
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={{ base: 6, md: 8 }}>
              {products.map((p) => {
                const cover = p.images[0]?.image
                return (
                  <Stack
                    key={p.id}
                    asChild
                    gap={3}
                    borderRadius="xl"
                    overflow="hidden"
                    borderWidth="1px"
                    borderColor="border"
                    bg="bg.surface"
                    transition="all 0.2s"
                    _hover={{ borderColor: 'brand.solid', transform: 'translateY(-2px)' }}
                  >
                    <Link href={`/catalog/${p.slug}`}>
                      {cover
                        ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/files/${cover.path}`}
                            alt={cover.alt ?? p.name}
                            style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover' }}
                          />
                        )
                        : <Box w="full" aspectRatio="4/5" bg="bg.muted" />}
                      <Stack gap={1} p={4}>
                        <Heading as="h3" size="md">{p.name}</Heading>
                        <Text color="fg.muted" fontSize="sm">
                          {(p.pricePerMeter / 100).toFixed(0)} ₽ / пог. м
                        </Text>
                      </Stack>
                    </Link>
                  </Stack>
                )
              })}
            </SimpleGrid>
          )}
      </Container>
    </Box>
  )
}
