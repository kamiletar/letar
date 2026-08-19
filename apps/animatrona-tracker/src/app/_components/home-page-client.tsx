'use client'

import { resolveImageUrl } from '@/lib/ipfs'
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  Image,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuCheck, LuFilm, LuLibrary, LuSearch, LuTv } from 'react-icons/lu'

import type { WatchProgressSummaryItem } from '@/app/api/watch-progress/summary/route'

import type { GenreCount } from '../page'
import { ContinueWatchingSection } from './continue-watching-section'

interface LatestAnimeItem {
  id: string
  title: string
  coverUrl: string | null
  shikimoriId: number | null
  year: number | null
  genres: string[]
  _count: { episodes: number }
}

interface HomePageClientProps {
  genreCounts: GenreCount[]
  totalCount: number
  latestAnime: LatestAnimeItem[]
}

export function HomePageClient({ genreCounts, totalCount, latestAnime }: HomePageClientProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgressSummaryItem>>({})

  // Загружаем прогресс просмотра
  useEffect(() => {
    fetch('/api/watch-progress/summary')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setProgressMap(json.data)
        }
      })
      .catch(() => {
        // Прогресс опциональный — игнорируем ошибки
      })
  }, [])

  /** Поиск по Enter или кнопке */
  const handleSearch = () => {
    if (query.trim()) {
      router.push(`/anime?q=${encodeURIComponent(query.trim())}`)
    } else {
      router.push('/anime')
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <Box minH="100vh" bg="bg">
      {/* Hero секция */}
      <Box
        bg="linear-gradient(135deg, var(--chakra-colors-brand-600) 0%, var(--chakra-colors-brand-800) 100%)"
        py={{ base: 12, md: 20 }}
        color="white"
      >
        <Container maxW="container.xl">
          <VStack gap={8} textAlign="center">
            <VStack gap={4}>
              <HStack gap={2}>
                <Icon as={LuFilm} boxSize={10} />
                <Heading as="h1" size="4xl" fontWeight="bold">
                  Animatrona
                </Heading>
              </HStack>
              <Text fontSize="xl" opacity={0.9} maxW="600px">
                Децентрализованная платформа для просмотра аниме через IPFS. Смотрите без ограничений и цензуры.
              </Text>
            </VStack>

            {/* Поиск */}
            <Flex gap={2} w="100%" maxW="600px">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Поиск аниме по названию..."
                size="lg"
                bg="white"
                color="gray.900"
                _placeholder={{ color: 'gray.500' }}
                borderRadius="lg"
              />
              <Button onClick={handleSearch} size="lg" colorPalette="accent" borderRadius="lg">
                <Icon as={LuSearch} mr={2} />
                Найти
              </Button>
            </Flex>

            {/* Статистика */}
            <HStack gap={6} opacity={0.85} fontSize="sm">
              <HStack gap={1}>
                <Icon as={LuTv} />
                <Text fontWeight="medium">{totalCount} аниме</Text>
              </HStack>
              <HStack gap={1}>
                <Icon as={LuLibrary} />
                <Text fontWeight="medium">{genreCounts.length} жанров</Text>
              </HStack>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Продолжить просмотр (показывается только авторизованным с прогрессом) */}
      <Container maxW="container.xl" py={8}>
        <ContinueWatchingSection />
      </Container>

      {/* Жанры со счётчиками */}
      {genreCounts.length > 0 && (
        <Box bg="bg.muted" py={12}>
          <Container maxW="container.xl">
            <VStack gap={6} align="stretch">
              <Heading as="h2" size="xl">
                Жанры
              </Heading>

              <Flex gap={3} flexWrap="wrap">
                {genreCounts.map(({ genre, count }) => (
                  <Button key={genre} asChild variant="outline" size="sm" borderRadius="full">
                    <NextLink href={`/anime?genre=${encodeURIComponent(genre)}`}>
                      {genre}
                      <Badge ml={1} colorPalette="brand" variant="solid" borderRadius="full" fontSize="xs">
                        {count}
                      </Badge>
                    </NextLink>
                  </Button>
                ))}
              </Flex>
            </VStack>
          </Container>
        </Box>
      )}

      {/* Последние добавленные */}
      {latestAnime.length > 0 && (
        <Container maxW="container.xl" py={12}>
          <VStack gap={6} align="stretch">
            <Flex justify="space-between" align="center">
              <Heading as="h2" size="xl">
                Последние добавленные
              </Heading>
              <Button asChild variant="ghost" size="sm">
                <NextLink href="/anime">Весь каталог →</NextLink>
              </Button>
            </Flex>

            <SimpleGrid columns={{ base: 2, sm: 3, md: 4, xl: 4 }} gap={4}>
              {latestAnime.map((anime) => (
                <LatestAnimeCard key={anime.id} anime={anime} progress={progressMap[anime.id]} />
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      )}

      {/* Как это работает */}
      <Box bg="bg.muted" py={12}>
        <Container maxW="container.xl">
          <VStack gap={10}>
            <VStack gap={2} textAlign="center">
              <Heading as="h2" size="xl">
                Как это работает
              </Heading>
              <Text color="fg.muted">Децентрализованное хранение и доставка контента</Text>
            </VStack>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={8} w="100%">
              <FeatureCard
                step={1}
                title="IPFS хранение"
                description="Аниме хранится в децентрализованной сети IPFS — устойчиво к цензуре и блокировкам."
              />
              <FeatureCard
                step={2}
                title="Публикация из Desktop"
                description="Загрузите аниме в IPFS через Animatrona Desktop и опубликуйте в каталог трекера."
              />
              <FeatureCard
                step={3}
                title="Смотрите в браузере"
                description="Аниме доступно прямо в браузере через IPFS Gateway. Без рекламы и ограничений."
              />
            </Grid>
          </VStack>
        </Container>
      </Box>

      {/* Footer */}
      <Box as="footer" py={8} borderTopWidth="1px">
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <HStack gap={2}>
              <Icon as={LuFilm} />
              <Text fontWeight="semibold">Animatrona Tracker</Text>
            </HStack>
            <Text color="fg.muted" fontSize="sm">
              © 2025 Animatrona. Powered by IPFS.
            </Text>
          </Flex>
        </Container>
      </Box>
    </Box>
  )
}

interface FeatureCardProps {
  step: number
  title: string
  description: string
}

function FeatureCard({ step, title, description }: FeatureCardProps) {
  return (
    <VStack gap={4} p={6} bg="bg" borderRadius="xl" borderWidth="1px">
      <Flex
        w={12}
        h={12}
        bg="brand.500"
        color="white"
        borderRadius="full"
        align="center"
        justify="center"
        fontWeight="bold"
        fontSize="xl"
      >
        {step}
      </Flex>
      <VStack gap={2} textAlign="center">
        <Heading as="h3" size="md">
          {title}
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {description}
        </Text>
      </VStack>
    </VStack>
  )
}

function LatestAnimeCard({ anime, progress }: { anime: LatestAnimeItem; progress?: WatchProgressSummaryItem }) {
  const slug = anime.shikimoriId ?? anime.id
  const coverUrl = resolveImageUrl(anime.coverUrl)
  const totalEpisodes = anime._count.episodes
  const hasProgress = progress && (progress.watchedEpisodes > 0 || progress.lastEpisode !== null)
  const overallProgress = hasProgress && totalEpisodes > 0
    ? Math.min(
      Math.round(
        ((progress.watchedEpisodes + (progress.lastEpisodeProgress > 0 ? progress.lastEpisodeProgress / 100 : 0))
          / totalEpisodes)
          * 100,
      ),
      100,
    )
    : 0

  return (
    <NextLink href={`/anime/${slug}`}>
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

          {/* Бейдж прогресса */}
          {hasProgress && (
            <Badge
              position="absolute"
              top={2}
              left={2}
              bg="blackAlpha.700"
              color="white"
              size="sm"
              display="flex"
              alignItems="center"
              gap={1}
            >
              {progress.watchedEpisodes === totalEpisodes
                ? (
                  <>
                    <Icon as={LuCheck} boxSize={3} />
                    Просмотрено
                  </>
                )
                : (
                  `${progress.watchedEpisodes}/${totalEpisodes} эп.`
                )}
            </Badge>
          )}

          {!hasProgress && anime._count.episodes > 0 && (
            <Badge position="absolute" top={2} right={2} colorPalette="brand" size="sm">
              {anime._count.episodes} эп.
            </Badge>
          )}

          {anime.year && (
            <Badge position="absolute" bottom={2} right={2} bg="blackAlpha.700" color="white" size="sm">
              {anime.year}
            </Badge>
          )}

          {/* Прогресс-бар */}
          {hasProgress && overallProgress > 0 && overallProgress < 100 && (
            <Box position="absolute" bottom={0} left={0} right={0} h="3px" bg="whiteAlpha.300">
              <Box h="100%" bg="brand.500" w={`${overallProgress}%`} transition="width 0.3s" />
            </Box>
          )}
          {hasProgress && overallProgress >= 100 && (
            <Box position="absolute" bottom={0} left={0} right={0} h="3px" bg="green.500" />
          )}
        </Box>

        <Box p={3}>
          <Text fontWeight="semibold" lineClamp={2} fontSize="sm">
            {anime.title}
          </Text>
          {anime.genres.length > 0 && (
            <HStack gap={1} mt={1}>
              {anime.genres.slice(0, 2).map((g) => (
                <Badge key={g} size="sm" colorPalette="gray" fontSize="2xs">
                  {g}
                </Badge>
              ))}
            </HStack>
          )}
        </Box>
      </Box>
    </NextLink>
  )
}
