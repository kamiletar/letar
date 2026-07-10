/**
 * Страница плеера — серверный компонент
 *
 * Загружает аниме из БД по shikimoriId, манифест эпизода из IPFS,
 * прогресс просмотра из БД — и передаёт всё в TrackerVideoPlayer.
 *
 * URL: /watch/[animeId]/[episode]
 * animeId = shikimoriId (число) или CUID
 * episode = номер эпизода
 */

import { Center, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { loadEpisodeManifest } from '@/lib/episode-loader'

import { TrackerVideoPlayer } from './_components/tracker-video-player'

interface WatchPageProps {
  params: Promise<{ animeId: string; episode: string }>
}

/**
 * Найти аниме по slug (shikimoriId или CUID).
 * Кэширование через React.cache() для дедупликации page/generateMetadata.
 */
const findAnimeBySlug = cache(async (slug: string, user?: Parameters<typeof getEnhancedPrisma>[0]) => {
  const db = getEnhancedPrisma(user)

  const selectFields = {
    id: true,
    title: true,
    titleOriginal: true,
    shikimoriId: true,
    status: true,

    directoryCid: true,
    episodes: {
      orderBy: { number: 'asc' as const },
      select: { number: true, title: true },
    },
  }

  // Если slug — число, ищем по shikimoriId (только PUBLISHED)
  const shikimoriId = parseInt(slug, 10)
  if (!Number.isNaN(shikimoriId) && String(shikimoriId) === slug) {
    const anime = await db.anime.findFirst({
      where: { shikimoriId, status: 'PUBLISHED' },
      select: selectFields,
    })
    if (anime) {
      return anime
    }
  }

  // Поиск по directoryCid (начинается на Qm или bafy)
  if (slug.startsWith('Qm') || slug.startsWith('bafy')) {
    const anime = await db.anime.findFirst({
      where: { directoryCid: slug },
      select: selectFields,
    })
    if (anime) {
      return anime
    }
  }

  // Fallback — поиск по CUID (любой статус, доступ контролирует ZenStack)
  return db.anime.findUnique({
    where: { id: slug },
    select: selectFields,
  })
})

/**
 * Загрузить прогресс просмотра эпизода + trackMode per-anime из БД
 */
async function loadWatchProgress(
  user: Parameters<typeof getEnhancedPrisma>[0],
  animeId: string,
  episodeNumber: number
) {
  const db = getEnhancedPrisma(user)

  const userId = (user as { id: string }).id
  const libraryItem = await db.userLibraryItem.findUnique({
    where: { userId_animeId: { userId, animeId } },
    select: {
      trackMode: true,
      watchProgress: {
        where: { episodeNumber },
        select: {
          currentTime: true,
          duration: true,
          audioTrackIndex: true,
          subtitleTrackIndex: true,
          completed: true,
        },
      },
    },
  })

  return {
    progress: libraryItem?.watchProgress[0] ?? null,
    trackMode: libraryItem?.trackMode as string | null,
  }
}

/**
 * Загрузить preferredTrackMode из профиля пользователя
 */
async function loadUserPreferredTrackMode(user: Parameters<typeof getEnhancedPrisma>[0]) {
  const db = getEnhancedPrisma(user)
  const userId = (user as { id: string }).id
  const found = await db.user.findUnique({
    where: { id: userId },
    select: { preferredTrackMode: true },
  })
  return found?.preferredTrackMode as string | null
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { animeId: slug, episode: episodeParam } = await params
  const episodeNumber = parseInt(episodeParam, 10)

  if (Number.isNaN(episodeNumber) || episodeNumber < 1) {
    notFound()
  }

  const session = await getSession()
  const anime = await findAnimeBySlug(slug, session?.user)

  if (!anime) {
    notFound()
  }

  // Slug для навигации: PUBLISHED → shikimoriId, остальные → directoryCid
  const animeSlug =
    anime.status === 'PUBLISHED' && anime.shikimoriId ? String(anime.shikimoriId) : (anime.directoryCid ?? anime.id)

  // Неавторизованные пользователи могут смотреть только первый эпизод
  if (!session?.user && episodeNumber > 1) {
    return (
      <Center minH="100dvh" bg="black">
        <VStack gap={4}>
          <Text color="yellow.400" fontSize="lg">
            Для просмотра остальных эпизодов необходима авторизация
          </Text>
          <Text color="gray.500" fontSize="sm">
            Первый эпизод доступен без регистрации
          </Text>
          <Link href="/sign-in" style={{ textDecoration: 'none' }}>
            <Text color="brand.400" fontSize="sm" _hover={{ color: 'brand.300' }}>
              Войти →
            </Text>
          </Link>
          <Link href={`/anime/${animeSlug}`} style={{ textDecoration: 'none' }}>
            <Text color="gray.400" fontSize="sm" _hover={{ color: 'white' }}>
              &larr; Вернуться к аниме
            </Text>
          </Link>
        </VStack>
      </Center>
    )
  }

  // Проверяем что эпизод существует в БД
  const episodeInfo = anime.episodes.find((ep) => ep.number === episodeNumber)
  if (!episodeInfo) {
    return (
      <Center minH="100dvh" bg="black">
        <VStack gap={4}>
          <Text color="red.400" fontSize="lg">
            Эпизод {episodeNumber} не найден
          </Text>
          <Link href={`/anime/${animeSlug}`} style={{ textDecoration: 'none' }}>
            <Text color="gray.400" fontSize="sm" _hover={{ color: 'white' }}>
              &larr; Вернуться к аниме
            </Text>
          </Link>
        </VStack>
      </Center>
    )
  }

  // Параллельная загрузка: манифест эпизода из IPFS + прогресс из БД + preferredTrackMode
  const [episodeResult, watchData, userPreferredTrackMode] = await Promise.all([
    anime.directoryCid ? loadEpisodeManifest(anime.directoryCid, episodeNumber) : Promise.resolve(null),
    session?.user ? loadWatchProgress(session.user, anime.id, episodeNumber) : null,
    session?.user ? loadUserPreferredTrackMode(session.user) : null,
  ])
  const watchProgress = watchData?.progress ?? null

  if (!episodeResult) {
    return (
      <Center minH="100dvh" bg="black">
        <VStack gap={4}>
          <Text color="red.400" fontSize="lg">
            Не удалось загрузить манифест эпизода
          </Text>
          <Text color="gray.500" fontSize="sm">
            Проверьте доступность IPFS Gateway
          </Text>
          <Link href={`/anime/${animeSlug}`} style={{ textDecoration: 'none' }}>
            <Text color="gray.400" fontSize="sm" _hover={{ color: 'white' }}>
              &larr; Вернуться к аниме
            </Text>
          </Link>
        </VStack>
      </Center>
    )
  }

  // Валидация: видео должно быть доступно
  if (!episodeResult.manifest.video?.cid) {
    return (
      <Center minH="100dvh" bg="black">
        <VStack gap={4}>
          <Text color="red.400" fontSize="lg">
            Видео недоступно
          </Text>
          <Text color="gray.500" fontSize="sm">
            Нет CID видео в манифесте эпизода
          </Text>
          <Link href={`/anime/${animeSlug}`} style={{ textDecoration: 'none' }}>
            <Text color="gray.400" fontSize="sm" _hover={{ color: 'white' }}>
              &larr; Вернуться к аниме
            </Text>
          </Link>
        </VStack>
      </Center>
    )
  }

  // Определяем начальные дорожки: из прогресса БД или дефолтные из манифеста
  let initialAudioTrack = 0
  let initialSubtitleTrack = -1
  let startTime = 0

  if (watchProgress && !watchProgress.completed) {
    // Восстанавливаем из прогресса в БД
    const audioTracks = episodeResult.manifest.audioTracks ?? []
    const subtitleTracks = episodeResult.manifest.subtitleTracks ?? []

    // Валидация audioTrackIndex
    let validAudioIdx: number = watchProgress.audioTrackIndex
    if (validAudioIdx < 0 || validAudioIdx >= audioTracks.length || !audioTracks[validAudioIdx]?.cid) {
      const firstReady = audioTracks.findIndex((t: { cid?: string | null }) => t.cid)
      validAudioIdx = firstReady >= 0 ? firstReady : 0
    }

    // Валидация subtitleTrackIndex
    let validSubIdx: number = watchProgress.subtitleTrackIndex
    if (validSubIdx >= subtitleTracks.length) {
      validSubIdx = -1
    }

    initialAudioTrack = validAudioIdx
    initialSubtitleTrack = validSubIdx

    // Восстанавливаем позицию (не в начале и не в конце)
    if (watchProgress.currentTime > 5 && watchProgress.currentTime < (watchProgress.duration || Infinity) - 10) {
      startTime = watchProgress.currentTime
    }
  } else if (!watchProgress) {
    // Дефолтные дорожки из манифеста
    const audioTracks = episodeResult.manifest.audioTracks ?? []
    const subtitleTracks = episodeResult.manifest.subtitleTracks ?? []

    const defaultAudio = audioTracks.findIndex((t: { isDefault?: boolean }) => t.isDefault)
    if (defaultAudio >= 0) {
      initialAudioTrack = defaultAudio
    }

    const defaultSub = subtitleTracks.findIndex((t: { isDefault?: boolean }) => t.isDefault)
    if (defaultSub >= 0) {
      initialSubtitleTrack = defaultSub
    }
  }

  // Приоритет trackMode: per-anime override > глобальный из профиля > null (клиент решит)
  const initialTrackMode = (watchData?.trackMode ?? userPreferredTrackMode ?? null) as
    'RUSSIAN_DUB' | 'ORIGINAL_SUB' | null

  return (
    <TrackerVideoPlayer
      manifest={episodeResult.manifest}
      animeSlug={animeSlug}
      animeId={anime.id}
      episodeNum={episodeNumber}
      startTime={startTime}
      initialAudioTrack={initialAudioTrack}
      initialSubtitleTrack={initialSubtitleTrack}
      initialTrackMode={initialTrackMode}
    />
  )
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { animeId: slug, episode: episodeParam } = await params
  const episodeNumber = parseInt(episodeParam, 10)

  if (Number.isNaN(episodeNumber)) {
    return { title: 'Плеер' }
  }

  const anime = await findAnimeBySlug(slug)

  if (!anime) {
    return { title: 'Аниме не найдено' }
  }

  const episodeInfo = anime.episodes.find((ep) => ep.number === episodeNumber)
  const episodeTitle = episodeInfo?.title ? `Эп. ${episodeNumber} — ${episodeInfo.title}` : `Эпизод ${episodeNumber}`

  return {
    title: `${anime.title} — ${episodeTitle}`,
    description: `Смотреть ${anime.title}, ${episodeTitle}`,
  }
}
