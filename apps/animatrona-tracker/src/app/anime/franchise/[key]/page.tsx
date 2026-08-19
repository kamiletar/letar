import { getEnhancedPrisma, prisma } from '@/lib/db'
import { resolveImageUrl } from '@/lib/ipfs'
import { Badge, Box, Container, Grid, Heading, HStack, Image, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { LuArrowLeft, LuEye, LuStar } from 'react-icons/lu'

/** Обёртка для иконок в серверном компоненте */
function ArrowLeftIcon() {
  return <LuArrowLeft size={20} />
}
function EyeIcon() {
  return <LuEye size={14} />
}
function StarIcon() {
  return <LuStar size={14} color="var(--chakra-colors-yellow-500)" />
}

import { Breadcrumbs } from '@/app/_components/breadcrumbs'

type Params = Promise<{ key: string }>

/**
 * Страница франшизы — все аниме одной франшизы плиткой.
 * Группировка по franchiseKey (надёжнее BFS по AnimeRelation).
 */
export default async function FranchisePage({ params }: { params: Params }) {
  const { key } = await params
  const db = getEnhancedPrisma(null)

  // Находим franchiseKey стартового аниме
  const startAnime = await prisma.anime.findUnique({
    where: { id: key },
    select: { franchiseKey: true },
  })

  const animeList = await db.anime.findMany({
    where: {
      status: 'PUBLISHED',
      franchiseKey: startAnime?.franchiseKey ?? key,
    },
    orderBy: { year: 'asc' },
    select: {
      id: true,
      title: true,
      titleOriginal: true,
      coverUrl: true,
      shikimoriId: true,
      year: true,
      studio: true,
      genres: true,
      viewCount: true,
      avgRating: true,
      _count: { select: { episodes: true } },
    },
  })

  if (animeList.length === 0) {
    notFound()
  }

  // Название франшизы — самый ранний тайтл
  const franchiseTitle = animeList[0].title

  return (
    <Box minH="100vh" bg="bg">
      {/* Шапка */}
      <Box bg="bg.panel" borderBottomWidth="1px" py={3}>
        <Container maxW="container.xl">
          <VStack align="flex-start" gap={1}>
            <Breadcrumbs
              items={[
                { label: 'Каталог аниме', href: '/anime' },
                { label: 'Франшизы', href: '/anime?view=franchise' },
                { label: franchiseTitle },
              ]}
            />
            <HStack gap={3}>
              <NextLink href="/anime?view=franchise">
                <Box color="fg.muted" _hover={{ color: 'fg' }}>
                  <ArrowLeftIcon />
                </Box>
              </NextLink>
              <Heading as="h1" size="lg">
                {franchiseTitle}
              </Heading>
              <Badge colorPalette="purple" size="md">
                {animeList.length} тайтлов
              </Badge>
            </HStack>
          </VStack>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        <Grid
          templateColumns={{
            base: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            xl: 'repeat(4, 1fr)',
          }}
          gap={6}
        >
          {animeList.map((anime) => {
            const coverUrl = resolveImageUrl(anime.coverUrl)
            const slug = anime.shikimoriId ?? anime.id
            return (
              <NextLink key={anime.id} href={`/anime/${slug}`}>
                <Box
                  borderRadius="xl"
                  overflow="hidden"
                  borderWidth="1px"
                  bg="bg.panel"
                  transitionProperty="box-shadow, border-color"
                  transitionDuration="0.2s"
                  _hover={{ shadow: 'lg', borderColor: 'brand.500' }}
                >
                  <Box position="relative" aspectRatio="2/3" bg="bg.muted">
                    <Image src={coverUrl} alt={anime.title} objectFit="cover" w="100%" h="100%" />
                    {anime._count.episodes > 0 && (
                      <Badge position="absolute" top={2} right={2} colorPalette="brand" size="sm">
                        {anime._count.episodes} эп.
                      </Badge>
                    )}
                    {anime.year && (
                      <Badge position="absolute" bottom={2} right={2} bg="blackAlpha.700" color="white" size="sm">
                        {anime.year}
                      </Badge>
                    )}
                  </Box>
                  <Box p={3}>
                    <Text fontWeight="semibold" lineClamp={2} mb={1}>
                      {anime.title}
                    </Text>
                    {anime.titleOriginal && (
                      <Text fontSize="xs" color="fg.muted" lineClamp={1} mb={2}>
                        {anime.titleOriginal}
                      </Text>
                    )}
                    <HStack gap={2} fontSize="xs" color="fg.muted" flexWrap="wrap">
                      {anime.studio && <Text>{anime.studio}</Text>}
                      {anime.genres.slice(0, 2).map((g) => (
                        <Badge key={g} size="sm" colorPalette="gray">
                          {g}
                        </Badge>
                      ))}
                    </HStack>
                    <HStack gap={2} fontSize="xs" color="fg.muted" mt={2}>
                      {anime.viewCount > 0 && (
                        <HStack gap={1}>
                          <EyeIcon />
                          <Text>{anime.viewCount}</Text>
                        </HStack>
                      )}
                      {anime.avgRating !== null && anime.avgRating > 0 && (
                        <HStack gap={1}>
                          <StarIcon />
                          <Text>{anime.avgRating.toFixed(1)}</Text>
                        </HStack>
                      )}
                    </HStack>
                  </Box>
                </Box>
              </NextLink>
            )
          })}
        </Grid>
      </Container>
    </Box>
  )
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { key } = await params
  const db = getEnhancedPrisma(null)
  const anime = await db.anime.findUnique({
    where: { id: key },
    select: { title: true },
  })
  return {
    title: anime ? `${anime.title} — Франшиза` : 'Франшиза',
  }
}
