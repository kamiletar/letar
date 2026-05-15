'use client'

import { formatFileSize, formatSeedingTime } from '@/lib/ipfs'
import { Badge, Box, Button, Container, Flex, Heading, HStack, Icon, Table, Tabs, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuArrowLeft, LuBookOpen, LuClock, LuFilm, LuTrophy, LuUpload } from 'react-icons/lu'

/** Статы раздач (для uploaded, seeding time, uptime) */
interface DistStatEntry {
  userId: string
  userName: string
  totalBytesUploaded: number
  totalBytesDownloaded: number
  totalSeedingTimeMs: number
  totalUptimeMs: number
  totalPeersHelped: number
  activeDistributions: number
}

/** Ratio entry */
interface RatioEntry {
  userId: string
  userName: string
  totalBytesUploaded: number
  totalBytesDownloaded: number
  ratio: number
}

/** Счётчик (published, library, episodes) */
interface CountEntry {
  userId: string
  userName: string
  count: number
}

/** Рейтинг загрузчика */
interface ScoreEntry {
  userId: string
  userName: string
  score: number
  rank: string | null
}

interface LeaderboardClientProps {
  currentUserId: string
  topByUploaded: DistStatEntry[]
  topByRatio: RatioEntry[]
  topBySeedingTime: DistStatEntry[]
  topByUptime: DistStatEntry[]
  topByPublished: CountEntry[]
  topByLibrary: CountEntry[]
  topByEpisodes: CountEntry[]
  topByScore: ScoreEntry[]
}

/** Медаль для первых трёх мест */
function Medal({ place }: { place: number }) {
  const medals = ['🥇', '🥈', '🥉']
  if (place <= 3) {
    return <Text fontSize="lg">{medals[place - 1]}</Text>
  }
  return (
    <Text fontSize="sm" color="fg.muted" fontWeight="medium" w={6} textAlign="center">
      {place}
    </Text>
  )
}

/** Подсветка текущего пользователя */
function isMe(userId: string, currentUserId: string) {
  return userId === currentUserId
}

export function LeaderboardClient({
  currentUserId,
  topByUploaded,
  topByRatio,
  topBySeedingTime,
  topByUptime,
  topByPublished,
  topByLibrary,
  topByEpisodes,
  topByScore,
}: LeaderboardClientProps) {
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
                  Аниме
                </NextLink>
              </Button>
              <Heading size="lg">
                <Icon as={LuTrophy} mr={2} />
                Лидерборд
              </Heading>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        <Tabs.Root defaultValue="score" variant="line">
          <Tabs.List
            overflowX="auto"
            mb={6}
            css={{ '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}
          >
            <Tabs.Trigger value="score" whiteSpace="nowrap">
              <Box hideBelow="md" display="inline">
                <Icon as={LuTrophy} mr={1} />
              </Box>
              Рейтинг
            </Tabs.Trigger>
            <Tabs.Trigger value="uploaded" whiteSpace="nowrap">
              <Box hideBelow="md" display="inline">
                <Icon as={LuUpload} mr={1} />
              </Box>
              Отдано
            </Tabs.Trigger>
            <Tabs.Trigger value="ratio" whiteSpace="nowrap">
              Ratio
            </Tabs.Trigger>
            <Tabs.Trigger value="seeding" whiteSpace="nowrap">
              <Box hideBelow="md" display="inline">
                <Icon as={LuClock} mr={1} />
              </Box>
              Сидирование
            </Tabs.Trigger>
            <Tabs.Trigger value="uptime" whiteSpace="nowrap">
              <Box hideBelow="md" display="inline">
                <Icon as={LuClock} mr={1} />
              </Box>
              Аптайм
            </Tabs.Trigger>
            <Tabs.Trigger value="published" whiteSpace="nowrap">
              <Box hideBelow="md" display="inline">
                <Icon as={LuFilm} mr={1} />
              </Box>
              Публикации
            </Tabs.Trigger>
            <Tabs.Trigger value="library" whiteSpace="nowrap">
              <Box hideBelow="md" display="inline">
                <Icon as={LuBookOpen} mr={1} />
              </Box>
              Библиотека
            </Tabs.Trigger>
            <Tabs.Trigger value="episodes" whiteSpace="nowrap">
              Эпизоды
            </Tabs.Trigger>
          </Tabs.List>

          {/* Топ по рейтингу загрузчиков */}
          <Tabs.Content value="score">
            <LeaderTable
              items={topByScore.map((item, i) => ({
                place: i + 1,
                userId: item.userId,
                userName: item.userName,
                value: item.score.toLocaleString('ru'),
                extra: item.rank || undefined,
              }))}
              currentUserId={currentUserId}
              valueLabel="Очки"
            />
          </Tabs.Content>

          {/* Топ по отданным данным */}
          <Tabs.Content value="uploaded">
            <LeaderTable
              items={topByUploaded.map((item, i) => ({
                place: i + 1,
                userId: item.userId,
                userName: item.userName,
                value: formatFileSize(item.totalBytesUploaded),
              }))}
              currentUserId={currentUserId}
              valueLabel="Отдано"
            />
          </Tabs.Content>

          {/* Топ по ratio */}
          <Tabs.Content value="ratio">
            <LeaderTable
              items={topByRatio.map((item, i) => ({
                place: i + 1,
                userId: item.userId,
                userName: item.userName,
                value: item.ratio.toFixed(2),
                extra: `↑ ${formatFileSize(item.totalBytesUploaded)} / ↓ ${formatFileSize(item.totalBytesDownloaded)}`,
              }))}
              currentUserId={currentUserId}
              valueLabel="Ratio"
            />
          </Tabs.Content>

          {/* Топ по времени сидирования */}
          <Tabs.Content value="seeding">
            <LeaderTable
              items={topBySeedingTime.map((item, i) => ({
                place: i + 1,
                userId: item.userId,
                userName: item.userName,
                value: formatSeedingTime(item.totalSeedingTimeMs),
              }))}
              currentUserId={currentUserId}
              valueLabel="Время раздачи"
            />
          </Tabs.Content>

          {/* Топ по аптайму */}
          <Tabs.Content value="uptime">
            <LeaderTable
              items={topByUptime.map((item, i) => ({
                place: i + 1,
                userId: item.userId,
                userName: item.userName,
                value: formatSeedingTime(item.totalUptimeMs),
              }))}
              currentUserId={currentUserId}
              valueLabel="Аптайм"
            />
          </Tabs.Content>

          {/* Топ по публикациям */}
          <Tabs.Content value="published">
            <LeaderTable
              items={topByPublished.map((item, i) => ({
                place: i + 1,
                userId: item.userId,
                userName: item.userName,
                value: String(item.count),
              }))}
              currentUserId={currentUserId}
              valueLabel="Опубликовано"
            />
          </Tabs.Content>

          {/* Топ по библиотеке */}
          <Tabs.Content value="library">
            <LeaderTable
              items={topByLibrary.map((item, i) => ({
                place: i + 1,
                userId: item.userId,
                userName: item.userName,
                value: String(item.count),
              }))}
              currentUserId={currentUserId}
              valueLabel="В библиотеке"
            />
          </Tabs.Content>

          {/* Топ по эпизодам */}
          <Tabs.Content value="episodes">
            <LeaderTable
              items={topByEpisodes.map((item, i) => ({
                place: i + 1,
                userId: item.userId,
                userName: item.userName,
                value: String(item.count),
              }))}
              currentUserId={currentUserId}
              valueLabel="Эпизодов"
            />
          </Tabs.Content>
        </Tabs.Root>
      </Container>
    </Box>
  )
}

/** Универсальная таблица лидерборда */
interface LeaderTableItem {
  place: number
  userId: string
  userName: string
  value: string
  extra?: string
}

function LeaderTable({
  items,
  currentUserId,
  valueLabel,
}: {
  items: LeaderTableItem[]
  currentUserId: string
  valueLabel: string
}) {
  if (items.length === 0) {
    return (
      <Box textAlign="center" py={16} bg="bg.panel" borderRadius="xl" borderWidth="1px">
        <Icon as={LuTrophy} boxSize={10} color="fg.muted" mb={4} />
        <Text color="fg.muted" fontSize="lg">
          Пока нет данных
        </Text>
        <Text color="fg.subtle" fontSize="sm" mt={1}>
          Начните смотреть аниме, чтобы попасть в рейтинг
        </Text>
      </Box>
    )
  }

  return (
    <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" overflow="hidden">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader w="60px">#</Table.ColumnHeader>
            <Table.ColumnHeader>Пользователь</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">{valueLabel}</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map((item) => (
            <Table.Row key={item.userId} bg={isMe(item.userId, currentUserId) ? 'brand.50/10' : undefined}>
              <Table.Cell>
                <Medal place={item.place} />
              </Table.Cell>
              <Table.Cell>
                <HStack gap={2}>
                  <NextLink href={`/profile/${item.userId}`}>
                    <Text
                      fontWeight={isMe(item.userId, currentUserId) ? 'bold' : 'medium'}
                      _hover={{ color: 'brand.500', textDecoration: 'underline' }}
                    >
                      {item.userName}
                    </Text>
                  </NextLink>
                  {isMe(item.userId, currentUserId) && (
                    <Badge colorPalette="brand" size="sm">
                      Вы
                    </Badge>
                  )}
                </HStack>
                {item.extra && (
                  <Text fontSize="xs" color="fg.muted">
                    {item.extra}
                  </Text>
                )}
              </Table.Cell>
              <Table.Cell textAlign="right">
                <Text fontWeight="semibold" fontSize="lg">
                  {item.value}
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
