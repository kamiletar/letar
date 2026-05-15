'use client'

import { formatFileSize, formatSeedingTime, resolveImageUrl } from '@/lib/ipfs'
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
  Stat,
  Text,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuArrowLeft, LuBookOpen, LuCalendar, LuClock, LuFilm, LuTrophy, LuUpload, LuUsers } from 'react-icons/lu'

import { getNextRank, RANK_COLORS } from '@/lib/uploader-score'

/** Роли с русскими названиями */
const ROLE_LABELS: Record<string, string> = {
  USER: 'Пользователь',
  MODERATOR: 'Модератор',
  ADMIN: 'Администратор',
}

const ROLE_COLORS: Record<string, string> = {
  USER: 'gray',
  MODERATOR: 'blue',
  ADMIN: 'red',
}

interface PublicUser {
  id: string
  name: string | null
  image: string | null
  role: string
  createdAt: Date
  uploaderScore: number
  uploaderRank: string | null
}

interface PublishedAnime {
  id: string
  title: string
  coverUrl: string | null
  directoryCid: string | null
  year: number | null
  createdAt: Date
}

interface PublicDistributionStats {
  totalBytesUploaded: number
  totalSeedingTimeMs: number
  totalPeersHelped: number
}

interface ActivityStats {
  libraryCount: number
  completedAnimeCount: number
  watchedEpisodesCount: number
}

interface PublicProfileClientProps {
  user: PublicUser
  publishedAnime: PublishedAnime[]
  publishedCount: number
  distributionStats: PublicDistributionStats | null
  activityStats: ActivityStats
}

export function PublicProfileClient({
  user,
  publishedAnime,
  publishedCount,
  distributionStats,
  activityStats,
}: PublicProfileClientProps) {
  return (
    <Box minH="100vh" bg="bg">
      {/* Header */}
      <Box bg="bg.panel" borderBottomWidth="1px" py={4}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <HStack gap={4}>
              <Button asChild variant="ghost" size="sm">
                <NextLink href="/anime">
                  <Icon as={LuArrowLeft} mr={2} />
                  Каталог
                </NextLink>
              </Button>
              <Heading size="lg">Профиль</Heading>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        <VStack align="stretch" gap={8}>
          {/* Hero — информация о пользователе */}
          <Box bg="bg.panel" p={8} borderRadius="xl" borderWidth="1px">
            <Flex gap={6} align="center" direction={{ base: 'column', sm: 'row' }}>
              {/* Аватар */}
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || 'Аватар'}
                  boxSize={20}
                  borderRadius="full"
                  objectFit="cover"
                />
              ) : (
                <Box
                  w={20}
                  h={20}
                  borderRadius="full"
                  bg="brand.500"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  fontSize="3xl"
                  fontWeight="bold"
                >
                  {user.name?.[0]?.toUpperCase() || '?'}
                </Box>
              )}

              <VStack align={{ base: 'center', sm: 'flex-start' }} gap={2}>
                <HStack gap={3} flexWrap="wrap">
                  <Heading size="xl">{user.name || 'Пользователь'}</Heading>
                  <Badge colorPalette={ROLE_COLORS[user.role] || 'gray'} size="lg">
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
                  {user.uploaderRank && user.uploaderScore > 0 && (
                    <Badge
                      colorPalette={RANK_COLORS[user.uploaderRank] || 'gray'}
                      size="lg"
                      display="flex"
                      alignItems="center"
                      gap={1}
                    >
                      <Icon as={LuTrophy} boxSize={3} />
                      {user.uploaderRank}
                    </Badge>
                  )}
                </HStack>
                <HStack color="fg.muted" fontSize="sm" gap={2}>
                  <Icon as={LuCalendar} />
                  <Text>
                    На трекере с {new Date(user.createdAt).toLocaleDateString('ru', { year: 'numeric', month: 'long' })}
                  </Text>
                </HStack>
              </VStack>
            </Flex>
          </Box>

          {/* Статистика */}
          <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={4}>
            <Stat.Root>
              <Stat.Label>
                <HStack gap={1}>
                  <Icon as={LuFilm} boxSize={3} />
                  <Text>Опубликовано</Text>
                </HStack>
              </Stat.Label>
              <Stat.ValueText color="green.500">{publishedCount}</Stat.ValueText>
            </Stat.Root>

            {distributionStats && (
              <>
                <Stat.Root>
                  <Stat.Label>
                    <HStack gap={1}>
                      <Icon as={LuUpload} boxSize={3} />
                      <Text>Отдано</Text>
                    </HStack>
                  </Stat.Label>
                  <Stat.ValueText>{formatFileSize(distributionStats.totalBytesUploaded)}</Stat.ValueText>
                </Stat.Root>

                <Stat.Root>
                  <Stat.Label>
                    <HStack gap={1}>
                      <Icon as={LuClock} boxSize={3} />
                      <Text>Время раздачи</Text>
                    </HStack>
                  </Stat.Label>
                  <Stat.ValueText>{formatSeedingTime(distributionStats.totalSeedingTimeMs)}</Stat.ValueText>
                </Stat.Root>

                <Stat.Root>
                  <Stat.Label>
                    <HStack gap={1}>
                      <Icon as={LuUsers} boxSize={3} />
                      <Text>Помог пирам</Text>
                    </HStack>
                  </Stat.Label>
                  <Stat.ValueText>{distributionStats.totalPeersHelped}</Stat.ValueText>
                </Stat.Root>
              </>
            )}

            {!distributionStats && (
              <>
                <Stat.Root>
                  <Stat.Label>
                    <HStack gap={1}>
                      <Icon as={LuBookOpen} boxSize={3} />
                      <Text>В библиотеке</Text>
                    </HStack>
                  </Stat.Label>
                  <Stat.ValueText>{activityStats.libraryCount}</Stat.ValueText>
                </Stat.Root>

                <Stat.Root>
                  <Stat.Label>Просмотрено</Stat.Label>
                  <Stat.ValueText>{activityStats.completedAnimeCount}</Stat.ValueText>
                </Stat.Root>

                <Stat.Root>
                  <Stat.Label>Эпизодов</Stat.Label>
                  <Stat.ValueText>{activityStats.watchedEpisodesCount}</Stat.ValueText>
                </Stat.Root>
              </>
            )}
          </Grid>

          {/* Рейтинг загрузчика */}
          {user.uploaderScore > 0 && (
            <Box bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px">
              <HStack mb={4}>
                <Icon as={LuTrophy} />
                <Heading size="sm">Рейтинг загрузчика</Heading>
              </HStack>
              <Flex gap={6} align="center" direction={{ base: 'column', sm: 'row' }}>
                <VStack gap={1}>
                  <Text fontSize="3xl" fontWeight="bold" color="brand.500">
                    {user.uploaderScore.toLocaleString('ru')}
                  </Text>
                  <Badge colorPalette={RANK_COLORS[user.uploaderRank || ''] || 'gray'} size="lg">
                    {user.uploaderRank || 'Новичок'}
                  </Badge>
                </VStack>
                {(() => {
                  const next = getNextRank(user.uploaderScore)
                  if (!next) {
                    return (
                      <VStack flex={1} align="stretch" gap={1}>
                        <Text fontSize="sm" color="fg.muted">
                          Максимальный ранг достигнут!
                        </Text>
                        <Box h="8px" bg="brand.500" borderRadius="full" />
                      </VStack>
                    )
                  }
                  const progress = Math.min(Math.round((user.uploaderScore / next.minScore) * 100), 99)
                  return (
                    <VStack flex={1} align="stretch" gap={1}>
                      <Flex justify="space-between" fontSize="sm" color="fg.muted">
                        <Text>До «{next.rank}»</Text>
                        <Text>{next.minScore - user.uploaderScore} очков</Text>
                      </Flex>
                      <Box h="8px" bg="bg.muted" borderRadius="full" overflow="hidden">
                        <Box h="100%" bg="brand.500" w={`${progress}%`} borderRadius="full" transition="width 0.3s" />
                      </Box>
                    </VStack>
                  )
                })()}
              </Flex>
            </Box>
          )}

          {/* Активность просмотра (если есть distStats — показываем отдельно) */}
          {distributionStats && (activityStats.libraryCount > 0 || activityStats.completedAnimeCount > 0) && (
            <Box bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px">
              <HStack mb={4}>
                <Icon as={LuBookOpen} />
                <Heading size="sm">Активность просмотра</Heading>
              </HStack>
              <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                <Stat.Root>
                  <Stat.Label>В библиотеке</Stat.Label>
                  <Stat.ValueText>{activityStats.libraryCount}</Stat.ValueText>
                </Stat.Root>
                <Stat.Root>
                  <Stat.Label>Просмотрено аниме</Stat.Label>
                  <Stat.ValueText>{activityStats.completedAnimeCount}</Stat.ValueText>
                </Stat.Root>
                <Stat.Root>
                  <Stat.Label>Просмотрено эпизодов</Stat.Label>
                  <Stat.ValueText>{activityStats.watchedEpisodesCount}</Stat.ValueText>
                </Stat.Root>
              </Grid>
            </Box>
          )}

          {/* Опубликованные аниме */}
          <Box>
            <Heading size="lg" mb={4}>
              <Icon as={LuFilm} mr={2} />
              Опубликованные аниме
            </Heading>

            {publishedAnime.length === 0 ? (
              <Box textAlign="center" py={12} bg="bg.panel" borderRadius="xl" borderWidth="1px">
                <Icon as={LuFilm} boxSize={10} color="fg.muted" mb={3} />
                <Text color="fg.muted">Пока нет опубликованных аниме</Text>
              </Box>
            ) : (
              <Grid
                templateColumns={{
                  base: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)',
                  lg: 'repeat(6, 1fr)',
                }}
                gap={4}
              >
                {publishedAnime.map((anime) => (
                  <NextLink key={anime.id} href={`/anime/${anime.directoryCid || anime.id}`}>
                    <Box
                      bg="bg.panel"
                      borderRadius="lg"
                      borderWidth="1px"
                      overflow="hidden"
                      transition="all 0.2s"
                      _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
                    >
                      <Image
                        src={resolveImageUrl(anime.coverUrl)}
                        alt={anime.title}
                        aspectRatio="2/3"
                        objectFit="cover"
                        w="100%"
                      />
                      <Box p={2}>
                        <Text fontSize="sm" fontWeight="medium" lineClamp={2}>
                          {anime.title}
                        </Text>
                        {anime.year && (
                          <Text fontSize="xs" color="fg.muted">
                            {anime.year}
                          </Text>
                        )}
                      </Box>
                    </Box>
                  </NextLink>
                ))}
              </Grid>
            )}

            {publishedCount > 12 && (
              <Box textAlign="center" mt={4}>
                <Text color="fg.muted" fontSize="sm">
                  Показано 12 из {publishedCount}
                </Text>
              </Box>
            )}
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
