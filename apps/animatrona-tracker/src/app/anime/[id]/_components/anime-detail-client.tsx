'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { resolveImageUrl } from '@/lib/ipfs'
import {
  Badge,
  Box,
  Button,
  Container,
  Grid,
  Heading,
  HStack,
  Icon,
  Image,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import {
  LuArrowLeft,
  LuBookOpen,
  LuCalendar,
  LuCheck,
  LuClapperboard,
  LuCopy,
  LuExternalLink,
  LuFilm,
  LuMonitor,
  LuPin,
  LuPlay,
  LuQrCode,
  LuUser,
} from 'react-icons/lu'

/** Ленивая загрузка QR — показывается только по клику */
const QRCodeSVG = dynamic(() => import('qrcode.react').then((m) => ({ default: m.QRCodeSVG })), { ssr: false })

interface Episode {
  id: string
  number: number
  title: string | null
  duration: number | null
  videoCid: string
  createdAt: Date
}

interface AnimeDetail {
  id: string
  title: string
  titleOriginal: string | null
  description: string | null
  coverUrl: string | null
  directoryCid: string | null
  year: number | null
  studio: string | null
  genres: string[]
  status: string
  createdAt: Date
  updatedAt: Date
  episodes: Episode[]
  uploadedBy: {
    id: string
    name: string | null
    image: string | null
  }
}

interface AnimeDetailClientProps {
  anime: AnimeDetail
  isAuthenticated: boolean
  userId?: string
  userRole?: string
  /** Аниме уже в библиотеке пользователя */
  isInLibrary?: boolean
}

export function AnimeDetailClient({
  anime,
  isAuthenticated,
  userRole,
  isInLibrary: initialInLibrary,
}: AnimeDetailClientProps) {
  const router = useRouter()
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pinning, setPinning] = useState(false)
  const [addingToLibrary, setAddingToLibrary] = useState(false)
  const [inLibrary, setInLibrary] = useState(initialInLibrary ?? false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAdmin = userRole === 'ADMIN'

  const coverUrl = resolveImageUrl(anime.coverUrl)

  // URL для открытия в Animatrona (deep link)
  const animatronaUrl = `animatrona://open/${anime.directoryCid}`

  /** Запинить аниме на автовыбранный сервер */
  const handlePin = async () => {
    setPinning(true)
    try {
      const res = await fetch(`/api/admin/pin/${anime.id}`, { method: 'POST' })
      if (res.ok) {
        toaster.success({ title: 'Пиннинг запущен' })
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toaster.error({ title: data.error || 'Ошибка пиннинга' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setPinning(false)
    }
  }

  /** Добавить аниме в библиотеку */
  const handleAddToLibrary = async () => {
    setAddingToLibrary(true)
    try {
      const res = await fetch('/api/user/library/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animeId: anime.id }),
      })
      if (res.ok) {
        setInLibrary(true)
        toaster.success({ title: 'Добавлено в библиотеку' })
      } else {
        const data = await res.json().catch(() => ({}))
        toaster.error({ title: data.error || 'Ошибка' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setAddingToLibrary(false)
    }
  }

  const handleCopyManifestCid = async () => {
    await navigator.clipboard.writeText(anime.directoryCid ?? '')
    setCopied(true)
    // Очищаем предыдущий таймаут — предотвращаем утечку при быстрых кликах
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
    }
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }

  // Форматирование длительности эпизода
  const formatDuration = (seconds: number | null) => {
    if (!seconds) {
      return null
    }
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Box minH="100vh" bg="bg">
      {/* Header */}
      <Box bg="bg.panel" borderBottomWidth="1px" py={4}>
        <Container maxW="container.xl">
          <HStack gap={4}>
            <Button asChild variant="ghost" size="sm">
              <NextLink href="/anime">
                <Icon as={LuArrowLeft} mr={2} />
                Каталог
              </NextLink>
            </Button>
          </HStack>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        <Grid templateColumns={{ base: '1fr', md: '300px 1fr' }} gap={8}>
          {/* Левая колонка - Постер */}
          <VStack align="stretch" gap={4}>
            <Box borderRadius="xl" overflow="hidden" shadow="lg">
              <Image src={coverUrl} alt={anime.title} w="100%" aspectRatio="2/3" objectFit="cover" />
            </Box>

            {/* Кнопки действий */}
            <VStack align="stretch" gap={2}>
              {/* Открыть в Animatrona (deep link, не внутренняя навигация) */}
              <Button asChild colorPalette="brand" size="lg">
                <a href={animatronaUrl}>
                  <Icon as={LuPlay} mr={2} />
                  Открыть в Animatrona
                </a>
              </Button>

              {/* Кнопка «В библиотеку» */}
              {isAuthenticated && (
                <Button
                  colorPalette={inLibrary ? 'green' : 'blue'}
                  variant={inLibrary ? 'outline' : 'solid'}
                  onClick={handleAddToLibrary}
                  loading={addingToLibrary}
                  disabled={inLibrary}
                >
                  <Icon as={inLibrary ? LuCheck : LuBookOpen} mr={2} />
                  {inLibrary ? 'В библиотеке' : 'В библиотеку'}
                </Button>
              )}

              {/* Показать QR */}
              <Button variant="outline" onClick={() => setShowQR(!showQR)}>
                <Icon as={LuQrCode} mr={2} />
                {showQR ? 'Скрыть QR' : 'Показать QR для импорта'}
              </Button>

              {/* QR код */}
              {showQR && (
                <Box p={4} bg="white" borderRadius="lg" display="flex" justifyContent="center">
                  <QRCodeSVG value={anime.directoryCid ?? ''} size={200} level="M" />
                </Box>
              )}

              {/* Кнопка пиннинга (только для ADMIN) */}
              {isAdmin && anime.status === 'PUBLISHED' && (
                <Button colorPalette="blue" variant="outline" onClick={handlePin} loading={pinning}>
                  <Icon as={LuPin} mr={2} />
                  Запинить на сервер
                </Button>
              )}

              {/* Manifest CID */}
              <Box p={3} bg="bg.subtle" borderRadius="lg">
                <Text fontSize="xs" color="fg.muted" mb={1}>
                  Directory CID
                </Text>
                <HStack>
                  <Text fontSize="xs" fontFamily="mono" wordBreak="break-all" flex={1}>
                    {anime.directoryCid}
                  </Text>
                  <Button size="xs" variant="ghost" onClick={handleCopyManifestCid}>
                    <Icon as={LuCopy} />
                    {copied && (
                      <Text ml={1} fontSize="xs">
                        Скопировано
                      </Text>
                    )}
                  </Button>
                </HStack>
              </Box>
            </VStack>
          </VStack>

          {/* Правая колонка - Информация */}
          <VStack align="stretch" gap={6}>
            {/* Заголовок */}
            <Box>
              <Heading as="h1" size="2xl" mb={2}>
                {anime.title}
              </Heading>
              {anime.titleOriginal && (
                <Text fontSize="xl" color="fg.muted">
                  {anime.titleOriginal}
                </Text>
              )}
            </Box>

            {/* Метаданные */}
            <HStack gap={4} flexWrap="wrap">
              {anime.year && (
                <HStack color="fg.muted">
                  <Icon as={LuCalendar} />
                  <Text>{anime.year}</Text>
                </HStack>
              )}
              {anime.studio && (
                <HStack color="fg.muted">
                  <Icon as={LuClapperboard} />
                  <Text>{anime.studio}</Text>
                </HStack>
              )}
              <HStack color="fg.muted">
                <Icon as={LuFilm} />
                <Text>{anime.episodes.length} эпизодов</Text>
              </HStack>
              <HStack color="fg.muted">
                <Icon as={LuUser} />
                <Text>Загрузил: {anime.uploadedBy.name || 'Аноним'}</Text>
              </HStack>
            </HStack>

            {/* Жанры */}
            {anime.genres.length > 0 && (
              <HStack gap={2} flexWrap="wrap">
                {anime.genres.map((genre) => (
                  <Badge key={genre} colorPalette="brand" size="lg">
                    {genre}
                  </Badge>
                ))}
              </HStack>
            )}

            {/* Описание */}
            {anime.description && (
              <Box>
                <Heading as="h2" size="md" mb={3}>
                  Описание
                </Heading>
                <Text color="fg.muted" whiteSpace="pre-wrap">
                  {anime.description}
                </Text>
              </Box>
            )}

            {/* Список эпизодов */}
            {anime.episodes.length > 0 && (
              <Box>
                <Heading as="h2" size="md" mb={4}>
                  Эпизоды
                </Heading>
                <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader w="60px">#</Table.ColumnHeader>
                        <Table.ColumnHeader>Название</Table.ColumnHeader>
                        <Table.ColumnHeader w="100px">Длительность</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {anime.episodes.map((episode) => (
                        <Table.Row key={episode.id}>
                          <Table.Cell fontWeight="semibold">{episode.number}</Table.Cell>
                          <Table.Cell>{episode.title || `Эпизод ${episode.number}`}</Table.Cell>
                          <Table.Cell color="fg.muted">{formatDuration(episode.duration) || '—'}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </Box>
            )}

            {/* Инструкция по импорту */}
            <Box p={4} bg="bg.subtle" borderRadius="lg">
              <Heading as="h3" size="sm" mb={2}>
                <Icon as={LuMonitor} mr={2} />
                Как смотреть
              </Heading>
              <VStack align="stretch" gap={2} fontSize="sm" color="fg.muted">
                <Text>1. Установите приложение Animatrona</Text>
                <Text>2. Нажмите &quot;Открыть в Animatrona&quot; или отсканируйте QR-код</Text>
                <Text>3. Дождитесь загрузки контента через IPFS</Text>
              </VStack>
              <Button asChild variant="ghost" colorPalette="brand" mt={3} size="sm">
                <a href="https://animatrona.letar.best" target="_blank" rel="noopener noreferrer">
                  Скачать Animatrona
                  <Icon as={LuExternalLink} ml={1} />
                </a>
              </Button>
            </Box>
          </VStack>
        </Grid>
      </Container>
    </Box>
  )
}
