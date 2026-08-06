/**
 * Создание аудио треков для эпизодов
 * Портировано из renderer — mutations заменены на import-db
 */

import type { DemuxedAudio, DemuxResult } from '../../../shared/types'
import { createModuleLogger } from '../../utils/logger'
import { formatChannels, needsAudioTranscode } from './helpers'
import * as db from './import-db'

const log = createModuleLogger('AudioTrackCreator')

/**
 * Данные аудио трека для транскодирования
 */
export interface AudioTrackToTranscode {
  id: string
  inputPath: string
  streamIndex: number
  title: string
  language: string
  useStreamMapping: boolean
  isDonor: boolean
  isExternal?: boolean
  dubGroup?: string
  passthrough?: boolean
  originalCodec?: string
}

/** Рекомендация из fileAnalysis */
interface AudioRecommendation {
  trackIndex: number
  action?: string
  enabled: boolean
  isExternal?: boolean
  externalPath?: string
  groupName?: string
  language?: string
  dubGroup?: string
}

/** Анализ файла (упрощённый тип без React зависимостей) */
interface FileAnalysisLike {
  episodeNumber: number
  audioRecommendations: AudioRecommendation[]
}

/**
 * Создаёт аудио треки из demux результата и внешних файлов
 */
export async function createAudioTracks(
  episodeId: string,
  demuxResult: DemuxResult,
  fileAnalyses: FileAnalysisLike[] | undefined,
  episodeNumber: number,
): Promise<AudioTrackToTranscode[]> {
  const audioTracksToTranscode: AudioTrackToTranscode[] = []

  const fileAnalysis = fileAnalyses?.find((a) => a.episodeNumber === episodeNumber)
  log.debug('createAudioTracks', {
    episodeId,
    episodeNumber,
    hasFileAnalysis: !!fileAnalysis,
    embeddedTracks: demuxResult.audioTracks?.length ?? 0,
    audioRecommendations: fileAnalysis?.audioRecommendations?.length ?? 0,
  })

  // Обработка встроенных аудиодорожек
  if (demuxResult.audioTracks && demuxResult.audioTracks.length > 0) {
    const audioTrackPromises = demuxResult.audioTracks.map(async (track: DemuxedAudio, arrayIndex: number) => {
      const shouldTranscode = needsAudioTranscode(track.codec, track.bitrate)

      const rec = fileAnalysis?.audioRecommendations.find((r) => r.trackIndex === arrayIndex && !r.isExternal)

      const audioTrackResult = await db.createAudioTrack({
        episodeId,
        streamIndex: track.index,
        language: rec?.language || track.language || 'und',
        title: track.title || undefined,
        codec: track.codec,
        channels: formatChannels(track.channels),
        bitrate: track.bitrate,
        isDefault: track.index === 0,
        dubGroup: rec?.dubGroup || rec?.groupName || undefined,
      })

      const inputPath = track.path || track.sourceFile

      if (inputPath) {
        return {
          id: audioTrackResult.id,
          inputPath,
          streamIndex: track.index,
          title: track.title || 'Аудио',
          language: rec?.language || track.language || 'und',
          useStreamMapping: track.path === null,
          isDonor: false,
          dubGroup: rec?.dubGroup || rec?.groupName || undefined,
          passthrough: !shouldTranscode,
          originalCodec: !shouldTranscode ? track.codec : undefined,
        }
      }

      return null
    })

    const results = await Promise.all(audioTrackPromises)
    audioTracksToTranscode.push(...results.filter((r): r is NonNullable<typeof r> => r !== null))
  }

  // Внешние аудиодорожки из fileAnalyses
  const selectedExternalAudio =
    fileAnalysis?.audioRecommendations.filter((r) => r.enabled && r.isExternal && r.externalPath) || []

  if (selectedExternalAudio.length > 0) {
    let externalStreamIndex = -1

    for (const rec of selectedExternalAudio) {
      const extPath = rec.externalPath
      if (!extPath) {
        continue
      }

      try {
        const currentStreamIndex = externalStreamIndex
        externalStreamIndex--

        const audioTrackResult = await db.createAudioTrack({
          episodeId,
          streamIndex: currentStreamIndex,
          language: rec.language || 'ru',
          title: rec.groupName || 'External',
          codec: 'external',
          channels: '2.0',
          bitrate: 0,
          isDefault: false,
          dubGroup: rec.dubGroup || rec.groupName || undefined,
        })

        audioTracksToTranscode.push({
          id: audioTrackResult.id,
          inputPath: extPath,
          streamIndex: currentStreamIndex,
          title: rec.groupName || 'External',
          language: rec.language || 'ru',
          useStreamMapping: false,
          isDonor: false,
          isExternal: true,
          dubGroup: rec.dubGroup || rec.groupName || undefined,
        })
      } catch (extAudioError) {
        console.warn(`[AudioTrackCreator] Failed to process external audio:`, extAudioError)
      }
    }
  }

  return audioTracksToTranscode
}
