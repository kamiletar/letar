'use client'

/**
 * Хук для управления выбором дорожек
 */

import { useCallback } from 'react'

import { updateMatch } from './episode-matcher'
import type { LibraryEpisode, SelectedTrack, TrackInfo } from './types'
import type { UseAddTracksStateReturn } from './use-add-tracks-state'

interface UseTrackSelectionOptions {
  /** Эпизоды из библиотеки */
  episodes: LibraryEpisode[]
  /** Путь к папке аниме (запасной temp dir когда folderPath=null) */
  animeFolderPath: string
  /** Управление состоянием */
  stateManager: UseAddTracksStateReturn
}

/**
 * Хук для управления выбором дорожек
 */
export function useTrackSelection(options: UseTrackSelectionOptions) {
  const { episodes, animeFolderPath, stateManager } = options
  const { setState } = stateManager

  /**
   * Обновить сопоставление вручную
   */
  const updateMatchManually = useCallback(
    (donorFilePath: string, targetEpisode: { id: string; number: number } | null) => {
      setState((s) => ({
        ...s,
        matches: updateMatch(s.matches, donorFilePath, targetEpisode),
      }))
    },
    [setState],
  )

  /**
   * Переключить выбор дорожки
   */
  const toggleTrackSelection = useCallback(
    (matchId: string, episodeId: string, episodeDir: string, type: 'audio' | 'subtitle', track: TrackInfo) => {
      setState((s) => {
        const existing = s.selectedTracks.find((t) => t.track.id === track.id)

        if (existing) {
          // Убираем
          return {
            ...s,
            selectedTracks: s.selectedTracks.filter((t) => t.track.id !== track.id),
          }
        } else {
          // Добавляем
          return {
            ...s,
            selectedTracks: [...s.selectedTracks, { matchId, episodeId, episodeDir, type, track }],
          }
        }
      })
    },
    [setState],
  )

  /**
   * Выбрать все дорожки определённого типа
   */
  const selectAllTracksOfType = useCallback(
    (type: 'audio' | 'subtitle') => {
      setState((s) => {
        const matchedFiles = s.matches.filter((m) => m.targetEpisode !== null)
        const newSelected: SelectedTrack[] = [...s.selectedTracks]

        for (const match of matchedFiles) {
          const probeResult = s.probeResults.get(match.donorFile.path)
          const targetEp = match.targetEpisode
          if (!probeResult || !targetEp) {
            continue
          }

          const episode = episodes.find((ep) => ep.id === targetEp.id)
          // Используем folderPath эпизода; если null (IPFS-режим) — используем папку аниме как temp
          const episodeDir = episode?.folderPath || animeFolderPath

          // Собираем все дорожки указанного типа (встроенные + внешние)
          const tracks = type === 'audio'
            ? [...probeResult.audioTracks, ...Array.from(probeResult.externalAudioByGroup.values()).flat()]
            : [...probeResult.subtitleTracks, ...probeResult.externalSubtitles]

          for (const track of tracks) {
            if (!newSelected.find((t) => t.track.id === track.id)) {
              newSelected.push({
                matchId: match.donorFile.path,
                episodeId: targetEp.id,
                episodeDir,
                type,
                track,
              })
            }
          }
        }

        return { ...s, selectedTracks: newSelected }
      })
    },
    [episodes, setState],
  )

  /**
   * Выбрать все дорожки с указанными языками
   */
  const selectByLanguage = useCallback(
    (languages: string[]) => {
      setState((s) => {
        const matchedFiles = s.matches.filter((m) => m.targetEpisode !== null)
        const newSelected: SelectedTrack[] = [...s.selectedTracks]

        for (const match of matchedFiles) {
          const probeResult = s.probeResults.get(match.donorFile.path)
          const targetEp = match.targetEpisode
          if (!probeResult || !targetEp) {
            continue
          }

          const episode = episodes.find((ep) => ep.id === targetEp.id)
          // Используем folderPath эпизода; если null (IPFS-режим) — используем папку аниме как temp
          const episodeDir = episode?.folderPath || animeFolderPath

          // Собираем все дорожки
          const allTracks = [
            ...probeResult.audioTracks.map((t) => ({ ...t, trackType: 'audio' as const })),
            ...probeResult.subtitleTracks.map((t) => ({ ...t, trackType: 'subtitle' as const })),
            ...probeResult.externalSubtitles.map((t) => ({ ...t, trackType: 'subtitle' as const })),
            ...Array.from(probeResult.externalAudioByGroup.values())
              .flat()
              .map((t) => ({ ...t, trackType: 'audio' as const })),
          ]

          for (const track of allTracks) {
            const lang = track.language.toLowerCase()
            const matches = languages.some((l) => lang.startsWith(l.toLowerCase()))
            const alreadySelected = newSelected.some((t) => t.track.id === track.id)

            if (matches && !alreadySelected) {
              newSelected.push({
                matchId: match.donorFile.path,
                episodeId: targetEp.id,
                episodeDir,
                type: track.trackType,
                track,
              })
            }
          }
        }

        return { ...s, selectedTracks: newSelected }
      })
    },
    [episodes, setState],
  )

  /**
   * Снять выбор со всех дорожек с указанными языками
   */
  const deselectByLanguage = useCallback(
    (languages: string[]) => {
      setState((s) => ({
        ...s,
        selectedTracks: s.selectedTracks.filter((t) => {
          const lang = t.track.language.toLowerCase()
          return !languages.some((l) => lang.startsWith(l.toLowerCase()))
        }),
      }))
    },
    [setState],
  )

  return {
    updateMatchManually,
    toggleTrackSelection,
    selectAllTracksOfType,
    selectByLanguage,
    deselectByLanguage,
  }
}

export type UseTrackSelectionReturn = ReturnType<typeof useTrackSelection>
