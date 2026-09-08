import { DownloadsSection } from '@/app/_components/downloads-section'
import {
  findWindowsAssets,
  FOLDER_PLAYER_SOURCE,
  getAllReleases,
  getDisplayVersion,
  getLatestRelease,
  parseRelease,
} from '@/lib/github'
import {
  Badge,
  Box,
  Container,
  Heading,
  HStack,
  Icon,
  Link,
  List,
  SimpleGrid,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { Metadata } from 'next'
import { LuCheck, LuExternalLink, LuX } from 'react-icons/lu'

export const metadata: Metadata = {
  title: 'Animatrona Player — плеер для аниме из папки',
  description:
    'Бесплатный плеер для аниме из локальной папки: внешние аудиодорожки и ASS-субтитры, шрифты, без установки библиотеки и без транскодирования. Ничего не скачивает и не ищет — только проигрывает то, что уже есть на диске.',
  keywords: [
    'плеер для аниме',
    'плеер аниме из папки',
    'внешние субтитры ass',
    'внешние аудиодорожки',
    'anime player',
    'mkv плеер',
  ],
  alternates: {
    canonical: 'https://animatrona.letar.best/player',
  },
  openGraph: {
    title: 'Animatrona Player — плеер для аниме из папки',
    description: 'Внешние аудиодорожки и ASS-субтитры, без установки библиотеки, без транскодирования',
    url: 'https://animatrona.letar.best/player',
    siteName: 'Animatrona',
    locale: 'ru_RU',
    type: 'website',
  },
}

const COMPARISON_ROWS: { feature: string; player: boolean | string; full: boolean | string }[] = [
  { feature: 'Просмотр из локальной папки', player: true, full: true },
  { feature: 'Внешние аудиодорожки и ASS/SRT-субтитры', player: true, full: true },
  { feature: 'Библиотека: каталог, метаданные с Shikimori', player: false, full: true },
  { feature: 'GPU-транскодирование AV1/HEVC на лету', player: false, full: true },
  { feature: 'Импорт из внешних источников', player: false, full: true },
  { feature: 'Вес установщика', player: '≤130 МБ', full: 'значительно больше (ffmpeg, движок кодирования)' },
]

const SUPPORTED_FORMATS: { title: string; items: string[]; ok: boolean }[] = [
  {
    title: 'Контейнеры',
    items: ['MKV', 'MP4', 'AVI', 'WEBM', 'MOV', 'WMV', 'FLV', 'M4V', 'TS', 'M2TS'],
    ok: true,
  },
  {
    title: 'Встроенные субтитры и шрифты',
    items: ['ASS/SSA и SRT из MKV — без ffmpeg (потоковый разбор)', 'Шрифты из MKV подключаются автоматически'],
    ok: true,
  },
  {
    title: 'Внешние файлы рядом с видео',
    items: [
      'Внешние .ass/.srt — сопоставляются с эпизодом по имени файла',
      'Папки Fonts/Шрифты, RUS Sub/Субтитры — определяются автоматически',
      'Внешние аудиодорожки — сопоставляются с эпизодом и языком',
    ],
    ok: true,
  },
  {
    title: 'Чего нет из коробки',
    items: [
      'Видеокодеки, которые не декодирует Chromium: Hi10P (10-bit H.264), некоторые старые сборки',
      'Аудиокодеки AC3/E-AC3/DTS/TrueHD — Chromium их не проигрывает',
    ],
    ok: false,
  },
]

/**
 * Страница плеера — второй продукт семейства Animatrona: standalone-просмотр аниме из
 * локальной папки без импорта, IPFS и транскодирования. Server Component — грузит релизы
 * плеера с GitHub и отдаёт свои SEO-метаданные (не наследует их с главной).
 */
export default async function PlayerPage() {
  const [latestReleaseData, allReleasesData] = await Promise.all([
    getLatestRelease(FOLDER_PLAYER_SOURCE),
    getAllReleases(FOLDER_PLAYER_SOURCE),
  ])

  const latestRelease = latestReleaseData ? parseRelease(latestReleaseData) : null
  const windowsPortable = latestReleaseData ? findWindowsAssets(latestReleaseData).portable : null
  const hasReleases = allReleasesData.length > 0

  return (
    <Box>
      <Box asChild pt={{ base: 32, md: 40 }} pb={{ base: 16, md: 20 }}>
        <section>
          <Container maxW="container.lg">
            <VStack gap={6} textAlign="center">
              <Badge colorPalette="purple" px={3} py={1} borderRadius="full">
                {hasReleases ? `v${getDisplayVersion(latestReleaseData, '')}` : 'скоро'}
              </Badge>
              <Heading asChild size={{ base: '3xl', md: '4xl' }}>
                <h1>Плеер для аниме из папки</h1>
              </Heading>
              <Text color="gray.400" fontSize={{ base: 'md', md: 'lg' }} maxW="2xl">
                Открываете папку с уже скачанными сериями — плеер сам находит внешние аудиодорожки и ASS/SRT-субтитры,
                подставляет нужные шрифты и запоминает, на чём вы остановились. Никакой библиотеки, никакого
                транскодирования — только воспроизведение.
              </Text>
              <Box
                borderWidth="1px"
                borderColor="brand.500/40"
                bg="brand.500/10"
                borderRadius="lg"
                px={5}
                py={4}
                maxW="xl"
              >
                <Text fontSize="sm" color="gray.300">
                  Приложение{' '}
                  <Text asChild fontWeight="bold" color="white">
                    <span>ничего не скачивает и не ищет контент</span>
                  </Text>{' '}
                  — ни торрентов, ни IPFS, ни каталога. Это просто плеер файлов, которые уже лежат на вашем диске.
                </Text>
              </Box>
            </VStack>
          </Container>
        </section>
      </Box>

      <Box asChild py={{ base: 16, md: 20 }} bg="gray.900/50">
        <section>
          <Container maxW="container.lg">
            <VStack gap={8}>
              <Heading asChild size={{ base: 'xl', md: '2xl' }}>
                <h2>Чем отличается от полной Animatrona</h2>
              </Heading>
              <Box w="full" overflowX="auto">
                <Table.Root variant="outline" size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Возможность</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center">Animatrona Player</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center">Animatrona</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {COMPARISON_ROWS.map((row) => (
                      <Table.Row key={row.feature}>
                        <Table.Cell>{row.feature}</Table.Cell>
                        <Table.Cell textAlign="center">
                          {typeof row.player === 'boolean'
                            ? (
                              <Icon color={row.player ? 'green.400' : 'gray.600'}>
                                {row.player ? <LuCheck /> : <LuX />}
                              </Icon>
                            )
                            : <Text fontSize="sm" color="gray.400">{row.player}</Text>}
                        </Table.Cell>
                        <Table.Cell textAlign="center">
                          {typeof row.full === 'boolean'
                            ? (
                              <Icon color={row.full ? 'green.400' : 'gray.600'}>
                                {row.full ? <LuCheck /> : <LuX />}
                              </Icon>
                            )
                            : <Text fontSize="sm" color="gray.400">{row.full}</Text>}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
              <Link
                href="/"
                fontSize="sm"
                color="brand.400"
                _hover={{ color: 'brand.300' }}
              >
                Нужна библиотека и GPU-транскодирование? Смотрите полную Animatrona{' '}
                <LuExternalLink style={{ display: 'inline' }} />
              </Link>
            </VStack>
          </Container>
        </section>
      </Box>

      <Box asChild py={{ base: 16, md: 20 }}>
        <section>
          <Container maxW="container.lg">
            <VStack gap={8}>
              <Heading asChild size={{ base: 'xl', md: '2xl' }}>
                <h2>Что играет из коробки</h2>
              </Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} w="full">
                {SUPPORTED_FORMATS.map((group) => (
                  <Box
                    key={group.title}
                    className="glass"
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor={group.ok ? 'gray.800' : 'orange.900'}
                    p={5}
                  >
                    <HStack mb={3} gap={2}>
                      <Icon color={group.ok ? 'green.400' : 'orange.400'}>
                        {group.ok ? <LuCheck /> : <LuX />}
                      </Icon>
                      <Heading asChild size="sm">
                        <h3>{group.title}</h3>
                      </Heading>
                    </HStack>
                    <List.Root gap={1} ps={4}>
                      {group.items.map((item) => (
                        <List.Item key={item} fontSize="sm" color="gray.400">
                          {item}
                        </List.Item>
                      ))}
                    </List.Root>
                  </Box>
                ))}
              </SimpleGrid>
              <Text fontSize="sm" color="gray.500" textAlign="center" maxW="2xl">
                Если файл использует кодек, который не декодирует Chromium, плеер честно об этом сообщит и предложит
                кнопку «Открыть в системном плеере» — вместо чёрного экрана.
              </Text>
            </VStack>
          </Container>
        </section>
      </Box>

      <DownloadsSection
        release={latestRelease}
        windowsPortableAsset={windowsPortable}
        requirementsNote={{
          primary: 'Транскодирования нет — воспроизведение идёт декодером браузерного движка (Chromium)',
          secondary: 'NVIDIA GPU не требуется: аппаратное декодирование включается автоматически, если доступно',
        }}
      />
    </Box>
  )
}
