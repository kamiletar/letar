/**
 * usePlayerEpisode — загрузка аниме/эпизода и выбор дефолтных дорожек для плеера
 */

import { useEffect, useState } from 'react'

import { getAnimeDetails } from '@/api/client'
import type { AnimeDetails, AudioTrack, Episode, SubtitleTrack } from '@letar/animatrona-shared'

interface UsePlayerEpisodeResult {
  anime: AnimeDetails | null
  episode: Episode | null
  isLoading: boolean
  error: string | null
  setError: (message: string | null) => void
  selectedAudio: AudioTrack | null
  setSelectedAudio: (track: AudioTrack | null) => void
  selectedSubtitle: SubtitleTrack | null
  setSelectedSubtitle: (track: SubtitleTrack | null) => void
}

/** Загружает данные аниме/эпизода и выставляет дефолтные аудио- и субтитр-дорожки */
export function usePlayerEpisode(animeId: string, episodeId: string): UsePlayerEpisodeResult {
  const [anime, setAnime] = useState<AnimeDetails | null>(null)
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedAudio, setSelectedAudio] = useState<AudioTrack | null>(null)
  const [selectedSubtitle, setSelectedSubtitle] = useState<SubtitleTrack | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const animeData = await getAnimeDetails(animeId)
        setAnime(animeData)

        const ep = animeData.episodes.find((e) => e.id === episodeId)
        if (!ep) {
          throw new Error('Эпизод не найден')
        }
        setEpisode(ep)

        // Выбираем дефолтную аудиодорожку
        const defaultAudio = ep.audioTracks.find((t) => t.isDefault) || ep.audioTracks[0]
        if (defaultAudio) {
          setSelectedAudio(defaultAudio)
        }

        // Выбираем дефолтные субтитры
        const defaultSub = ep.subtitleTracks.find((t) => t.isDefault)
        if (defaultSub) {
          setSelectedSubtitle(defaultSub)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [animeId, episodeId])

  return {
    anime,
    episode,
    isLoading,
    error,
    setError,
    selectedAudio,
    setSelectedAudio,
    selectedSubtitle,
    setSelectedSubtitle,
  }
}
