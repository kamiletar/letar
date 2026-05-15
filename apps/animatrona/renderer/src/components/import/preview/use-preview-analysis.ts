'use client'

/**
 * Хук для анализа файлов в PreviewStep
 */

import { useCallback, useEffect, useState } from 'react'

import type { ParsedFile } from '../FileScanStep'

import { normalizeLanguageCode } from '@/constants/dub-groups'
import { createAudioGroupId, createSubtitleGroupId } from './use-track-groups'

import type { AudioRecommendation, FileAnalysis, SubtitleRecommendation, TrackGroupEdit } from './types'
import { formatChannels, getAudioRecommendation } from './utils'

interface UsePreviewAnalysisOptions {
  /** Выбранные файлы */
  files: ParsedFile[]
  /** Путь к папке с файлами */
  folderPath: string
  /** Callback при завершении анализа */
  onAnalysisComplete: (analyses: FileAnalysis[]) => void
}

/**
 * Хук для анализа файлов
 */
export function usePreviewAnalysis(options: UsePreviewAnalysisOptions) {
  const { files, folderPath, onAnalysisComplete } = options

  const [analyses, setAnalyses] = useState<FileAnalysis[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)

  const selectedFiles = files.filter(
    (f): f is ParsedFile & { episodeNumber: number } => f.selected && f.episodeNumber !== null
  )

  /** Анализ одного файла через probe (без извлечения) */
  const analyzeFile = useCallback(async (file: ParsedFile): Promise<FileAnalysis> => {
    const api = window.electronAPI
    if (!api) {
      return {
        file,
        mediaInfo: null,
        isAnalyzing: false,
        error: 'Electron API недоступен',
        audioRecommendations: [],
        subtitleRecommendations: [],
      }
    }

    try {
      const probeResult = await api.ffmpeg.probe(file.path)

      if (!probeResult.success || !probeResult.data) {
        return {
          file,
          mediaInfo: null,
          isAnalyzing: false,
          error: probeResult.error || 'Ошибка анализа',
          audioRecommendations: [],
          subtitleRecommendations: [],
        }
      }

      const mediaInfo = probeResult.data

      // Формируем рекомендации для аудиодорожек
      // Используем индекс массива, а не stream index из контейнера
      const audioRecommendations: AudioRecommendation[] = mediaInfo.audioTracks.map((track, arrayIndex) => {
        const rec = getAudioRecommendation(track)
        const normalizedLang = normalizeLanguageCode(track.language)

        // Пытаемся извлечь группу озвучки из тегов или названия
        let dubGroup: string | undefined

        // 1. Из тегов (если есть)
        if (track.tags) {
          // Часто используется PERFORMER или SUMMARY в MKV
          const rawGroup =
            track.tags.PERFORMER ||
            track.tags.performer ||
            track.tags.SUMMARY ||
            track.tags.summary ||
            track.tags.comment
          if (rawGroup) {
            dubGroup = rawGroup.trim()
          }
        }

        // 2. Из названия дорожки (Title)
        if (!dubGroup && track.title) {
          // Паттерн "DUB/MVO GROUPNAME (доп. инфо)" — тип озвучки стоит перед именем группы
          // Например: "DUB Flarrow Films", "MVO Amber", "MVO AniLiberty (ex AniLibria)"
          const typeGroupMatch = track.title.match(/^(?:DUB|MVO|VO|SDH|ADV)\s+(.+?)(?:\s*\(.*\))?$/i)
          if (typeGroupMatch) {
            dubGroup = typeGroupMatch[1].trim()
          }

          // Паттерн "Something (GROUPNAME)" — группа в скобках в конце
          // Например: "Adult Swim (AMZN)"
          if (!dubGroup) {
            const parenMatch = track.title.match(/\(([^)]+)\)$/)
            if (parenMatch) {
              dubGroup = parenMatch[1]
            }
          }

          // Фоллбэк: используем title целиком как имя группы,
          // если это не бессмысленное/техническое название
          if (!dubGroup && !isGenericAudioTitle(track.title)) {
            dubGroup = track.title.trim()
          }
        }

        // Автоматически устанавливаем dubGroup "Оригинал" для японских дорожек, если не найдено иное
        if (!dubGroup && normalizedLang === 'ja') {
          dubGroup = 'Оригинал'
        }

        return {
          trackIndex: arrayIndex,
          action: rec.action,
          reason: rec.reason,
          enabled: true, // По умолчанию все включены
          language: track.language,
          dubGroup,
        }
      })

      // Формируем рекомендации для встроенных субтитров
      const subtitleRecommendations: SubtitleRecommendation[] = (mediaInfo.subtitleTracks || []).map((sub, idx) => {
        // Определяем тип субтитров
        let subtitleType: 'full' | 'signs' | 'songs' | undefined
        const titleLower = (sub.title || '').toLowerCase()

        if (titleLower.includes('sign') || titleLower.includes('надписи') || titleLower.includes('forced')) {
          subtitleType = 'signs'
        } else if (
          titleLower.includes('song') ||
          titleLower.includes('op/ed') ||
          titleLower.includes('lyrics') ||
          titleLower.includes('песни')
        ) {
          subtitleType = 'songs'
        } else {
          subtitleType = 'full'
        }

        // Пытаемся извлечь группу перевода из тегов или названия
        let dubGroup: string | undefined

        // 1. Из тегов
        if (sub.tags) {
          const rawGroup =
            sub.tags.PERFORMER || sub.tags.performer || sub.tags.SUMMARY || sub.tags.summary || sub.tags.comment
          if (rawGroup) {
            dubGroup = rawGroup.trim()
          }
        }

        // 2. Из названия (Title)
        if (!dubGroup && sub.title) {
          // Паттерн "ГРУППА (тип)" — группа перевода идёт ДО описания типа в скобках
          // Например: "Beatrice (надписи)" → группа "Beatrice", не "надписи"
          const groupTypeMatch = sub.title.match(/^(.+?)\s*\(([^)]*)\)\s*$/)
          if (groupTypeMatch) {
            const beforeParens = groupTypeMatch[1].trim()
            if (beforeParens && !isSubtitleTypeWord(beforeParens)) {
              dubGroup = beforeParens
            }
          }

          // Фоллбэк: используем title целиком как имя группы,
          // если это не описание типа субтитров
          if (!dubGroup && !isSubtitleTypeWord(sub.title)) {
            dubGroup = sub.title.trim()
          }
        }

        return {
          streamIndex: idx,
          language: sub.language,
          title: sub.title || 'Субтитры',
          format: 'embedded',
          isExternal: false,
          enabled: true, // По умолчанию все включены
          subtitleType,
          dubGroup,
        }
      })

      return {
        file,
        mediaInfo,
        isAnalyzing: false,
        error: null,
        audioRecommendations,
        subtitleRecommendations,
      }
    } catch (error) {
      return {
        file,
        mediaInfo: null,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : String(error),
        audioRecommendations: [],
        subtitleRecommendations: [],
      }
    }
  }, [])

  /** Запуск анализа всех файлов */
  const startAnalysis = useCallback(async () => {
    setIsAnalyzing(true)
    setOverallProgress(0)

    // Инициализируем состояние анализа
    const initialAnalyses: FileAnalysis[] = selectedFiles.map((file) => ({
      file,
      mediaInfo: null,
      isAnalyzing: true,
      error: null,
      audioRecommendations: [],
      subtitleRecommendations: [],
    }))
    setAnalyses(initialAnalyses)

    const results: FileAnalysis[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      const result = await analyzeFile(file)
      results.push(result)

      // Обновляем состояние
      setAnalyses((prev) => prev.map((a, idx) => (idx === i ? result : a)))
      setOverallProgress(((i + 1) / selectedFiles.length) * 100)
    }

    // Сканируем внешние субтитры и аудио
    const api = window.electronAPI
    if (api && folderPath) {
      try {
        const videoFiles = selectedFiles
          .filter((f): f is typeof f & { episodeNumber: number } => f.episodeNumber !== null)
          .map((f) => ({
            path: f.path,
            episodeNumber: f.episodeNumber,
          }))

        // Для набора folderPath = корень торрента, поэтому берём реальную папку видеофайлов
        const videoFolderPath = videoFiles.length > 0 ? videoFiles[0].path.replace(/[/\\][^/\\]+$/, '') : folderPath

        // Сканируем внешние субтитры
        // createHandler возвращает { success, data: { subtitles, ... } }
        const externalSubsResult = (await api.fs.scanExternalSubtitles(videoFolderPath, videoFiles)) as unknown as {
          success: boolean
          data?: {
            subtitles: Array<{
              episodeNumber: number | null
              filePath: string
              language: string
              title: string
              format: string
              matchedFonts: Array<{ name: string; path: string }>
              groupName?: string
              subtitleType?: 'full' | 'signs' | 'songs'
            }>
            unmatchedFiles: string[]
          }
        }
        const externalSubs = externalSubsResult.data || { subtitles: [], unmatchedFiles: [] }

        if (externalSubs.subtitles.length > 0) {
          // Группируем внешние субтитры по эпизодам
          const externalSubsMap = new Map<number, typeof externalSubs.subtitles>()
          for (const sub of externalSubs.subtitles) {
            if (sub.episodeNumber !== null) {
              const arr = externalSubsMap.get(sub.episodeNumber) || []
              arr.push(sub)
              externalSubsMap.set(sub.episodeNumber, arr)
            }
          }

          // Добавляем внешние субтитры к результатам анализа
          for (let i = 0; i < results.length; i++) {
            const episodeNumber = results[i].file.episodeNumber
            if (episodeNumber !== null) {
              const externalForEpisode = externalSubsMap.get(episodeNumber) || []
              const externalRecs: SubtitleRecommendation[] = externalForEpisode.map((sub) => ({
                streamIndex: -1, // Внешний файл — индекс не нужен
                language: sub.language,
                title: sub.title,
                format: sub.format,
                isExternal: true,
                externalPath: sub.filePath,
                matchedFonts: sub.matchedFonts,
                enabled: true,
                dubGroup: sub.groupName,
                subtitleType: sub.subtitleType || 'full',
              }))

              results[i] = {
                ...results[i],
                subtitleRecommendations: [...results[i].subtitleRecommendations, ...externalRecs],
              }
            }
          }

          // Обновляем состояние с внешними субтитрами
          setAnalyses([...results])

          // Выводим предупреждение о несматченных файлах
          if (externalSubs.unmatchedFiles.length > 0) {
            console.warn('[PreviewStep] Несматченные файлы субтитров:', externalSubs.unmatchedFiles)
          }
        }

        // Сканируем внешние аудио (Rus Sound/, Audio/ и т.д.)
        // createHandler возвращает { success, data: { audioTracks, ... } }
        const externalAudioResult = (await api.fs.scanExternalAudio(videoFolderPath, videoFiles)) as unknown as {
          success: boolean
          data?: {
            audioTracks: Array<{
              episodeNumber: number | null
              filePath: string
              codec: string
              channels: number
              groupName: string
              language: string
            }>
            audioDirs: string[]
            unmatchedFiles: string[]
          }
        }
        const externalAudio = externalAudioResult.data || { audioTracks: [], audioDirs: [], unmatchedFiles: [] }

        if (externalAudio.audioTracks.length > 0) {
          // Группируем внешние аудио по эпизодам
          const externalAudioMap = new Map<number, typeof externalAudio.audioTracks>()
          for (const audio of externalAudio.audioTracks) {
            if (audio.episodeNumber !== null) {
              const arr = externalAudioMap.get(audio.episodeNumber) || []
              arr.push(audio)
              externalAudioMap.set(audio.episodeNumber, arr)
            }
          }

          // Добавляем внешние аудио к результатам анализа
          for (let i = 0; i < results.length; i++) {
            const episodeNumber = results[i].file.episodeNumber
            if (episodeNumber !== null) {
              const externalForEpisode = externalAudioMap.get(episodeNumber) || []
              const externalRecs: AudioRecommendation[] = externalForEpisode.map((audio, idx) => ({
                trackIndex: -1000 - idx, // Отрицательный индекс для внешних файлов
                action: 'transcode' as const,
                reason: `${audio.codec.toUpperCase()} ${formatChannels(audio.channels)} → AAC 256 kbps`,
                enabled: true,
                isExternal: true,
                externalPath: audio.filePath,
                groupName: audio.groupName,
                language: audio.language,
              }))

              results[i] = {
                ...results[i],
                audioRecommendations: [...results[i].audioRecommendations, ...externalRecs],
              }
            }
          }

          // Обновляем состояние с внешними аудио
          setAnalyses([...results])

          // Выводим предупреждение о несматченных файлах
          if (externalAudio.unmatchedFiles.length > 0) {
            console.warn('[PreviewStep] Несматченные файлы аудио:', externalAudio.unmatchedFiles)
          }

          console.warn(
            '[PreviewStep] Найдено внешних аудио:',
            externalAudio.audioTracks.length,
            'из папок:',
            externalAudio.audioDirs
          )
        }
      } catch (error) {
        console.error('[PreviewStep] Ошибка сканирования внешних субтитров/аудио:', error)
      }
    }

    setIsAnalyzing(false)
    onAnalysisComplete(results)
  }, [selectedFiles, analyzeFile, onAnalysisComplete, folderPath])

  /** Переключение аудиодорожки */
  const handleToggleTrack = useCallback((episodeNumber: number, trackIndex: number, enabled: boolean) => {
    setAnalyses((prev) =>
      prev.map((analysis) => {
        if (analysis.file.episodeNumber !== episodeNumber) {
          return analysis
        }

        return {
          ...analysis,
          audioRecommendations: analysis.audioRecommendations.map((rec) =>
            rec.trackIndex === trackIndex ? { ...rec, enabled } : rec
          ),
        }
      })
    )
  }, [])

  /** Переключение субтитров */
  const handleToggleSubtitle = useCallback((episodeNumber: number, subtitleIndex: number, enabled: boolean) => {
    setAnalyses((prev) =>
      prev.map((analysis) => {
        if (analysis.file.episodeNumber !== episodeNumber) {
          return analysis
        }

        return {
          ...analysis,
          subtitleRecommendations: analysis.subtitleRecommendations.map((rec, idx) =>
            idx === subtitleIndex ? { ...rec, enabled } : rec
          ),
        }
      })
    )
  }, [])

  /**
   * Редактирование группы дорожек (язык/dubGroup)
   * Применяется только к ТЕКУЩЕМУ эпизоду
   */
  const handleTrackGroupEdit = useCallback(
    (episodeNumber: number, type: 'audio' | 'subtitle', groupId: string, edit: TrackGroupEdit) => {
      setAnalyses((prev) =>
        prev.map((analysis) => {
          // Применяем только к текущему эпизоду
          if (analysis.file.episodeNumber !== episodeNumber) {
            return analysis
          }

          if (type === 'audio') {
            return {
              ...analysis,
              audioRecommendations: analysis.audioRecommendations.map((rec) => {
                const recGroupId = rec.groupId || createAudioGroupId(rec)
                if (recGroupId !== groupId) {
                  return rec
                }

                return {
                  ...rec,
                  language: edit.language ?? rec.language,
                  dubGroup: edit.dubGroup !== undefined ? (edit.dubGroup ?? undefined) : rec.dubGroup,
                  enabled: edit.enabled !== undefined ? edit.enabled : rec.enabled,
                  groupId: recGroupId,
                }
              }),
            }
          } else {
            return {
              ...analysis,
              subtitleRecommendations: analysis.subtitleRecommendations.map((rec) => {
                const recGroupId = rec.groupId || createSubtitleGroupId(rec)
                if (recGroupId !== groupId) {
                  return rec
                }

                return {
                  ...rec,
                  language: edit.language ?? rec.language,
                  dubGroup: edit.dubGroup !== undefined ? (edit.dubGroup ?? undefined) : rec.dubGroup,
                  subtitleType: edit.subtitleType ?? rec.subtitleType,
                  enabled: edit.enabled !== undefined ? edit.enabled : rec.enabled,
                  groupId: recGroupId,
                }
              }),
            }
          }
        })
      )
    },
    []
  )

  /**
   * Применить настройки группы ко ВСЕМ эпизодам
   */
  const applyTrackGroupToAll = useCallback((type: 'audio' | 'subtitle', groupId: string, edit: TrackGroupEdit) => {
    setAnalyses((prev) => {
      // Для внешних субтитров ищем кросс-эпизодный ключ (папка + dubGroup),
      // т.к. у каждого файла уникальный groupId, но все эпизоды одной группы — в той же папке
      let subtitleCrossKey: { dir: string; dubGroup: string | undefined } | null = null
      if (type === 'subtitle' && groupId.startsWith('external:')) {
        for (const analysis of prev) {
          const sourceRec = analysis.subtitleRecommendations.find(
            (rec) => (rec.groupId || createSubtitleGroupId(rec)) === groupId
          )
          if (sourceRec?.externalPath) {
            subtitleCrossKey = {
              // Нормализуем разделители путей для корректного сравнения на Windows
              dir: sourceRec.externalPath.replace(/\\/g, '/').replace(/\/[^/]+$/, ''),
              dubGroup: sourceRec.dubGroup,
            }
            console.log('[applyTrackGroupToAll] subtitleCrossKey:', subtitleCrossKey, 'for groupId:', groupId)
            break
          }
        }
        if (!subtitleCrossKey) {
          console.warn(
            '[applyTrackGroupToAll] sourceRec not found for groupId:',
            groupId,
            'in',
            prev.length,
            'analyses'
          )
        }
      }

      return prev.map((analysis) => {
        if (type === 'audio') {
          return {
            ...analysis,
            audioRecommendations: analysis.audioRecommendations.map((rec) => {
              const recGroupId = rec.groupId || createAudioGroupId(rec)
              if (recGroupId !== groupId) {
                return rec
              }

              return {
                ...rec,
                language: edit.language ?? rec.language,
                dubGroup: edit.dubGroup !== undefined ? (edit.dubGroup ?? undefined) : rec.dubGroup,
                enabled: edit.enabled !== undefined ? edit.enabled : rec.enabled,
                groupId: recGroupId,
              }
            }),
          }
        } else {
          return {
            ...analysis,
            subtitleRecommendations: analysis.subtitleRecommendations.map((rec) => {
              const recGroupId = rec.groupId || createSubtitleGroupId(rec)

              // Точное совпадение (тот же эпизод) или кросс-эпизодное по папке + dubGroup
              const exactMatch = recGroupId === groupId
              let crossMatch = false
              if (!exactMatch && subtitleCrossKey !== null && rec.isExternal && rec.externalPath !== undefined) {
                // Нормализуем разделители путей перед сравнением (Windows: \ vs /)
                const recDir = rec.externalPath.replace(/\\/g, '/').replace(/\/[^/]+$/, '')
                const dirMatch = recDir === subtitleCrossKey.dir
                const dubMatch = rec.dubGroup === subtitleCrossKey.dubGroup
                crossMatch = dirMatch && dubMatch
                if (!crossMatch && analysis.file.episodeNumber !== null) {
                  console.log(`[applyTrackGroupToAll] ep${analysis.file.episodeNumber} crossMatch FAIL:`, {
                    recDir,
                    targetDir: subtitleCrossKey.dir,
                    dirMatch,
                    recDubGroup: rec.dubGroup,
                    targetDubGroup: subtitleCrossKey.dubGroup,
                    dubMatch,
                  })
                }
              }

              if (!exactMatch && !crossMatch) {
                return rec
              }

              return {
                ...rec,
                language: edit.language ?? rec.language,
                dubGroup: edit.dubGroup !== undefined ? (edit.dubGroup ?? undefined) : rec.dubGroup,
                subtitleType: edit.subtitleType ?? rec.subtitleType,
                enabled: edit.enabled !== undefined ? edit.enabled : rec.enabled,
                groupId: recGroupId,
              }
            }),
          }
        }
      })
    })
  }, [])

  // Запускаем анализ при монтировании
  useEffect(() => {
    if (selectedFiles.length > 0 && analyses.length === 0) {
      startAnalysis()
    }
  }, [selectedFiles.length, analyses.length, startAnalysis])

  // Уведомляем родителя об изменениях
  useEffect(() => {
    if (analyses.length > 0 && !isAnalyzing) {
      onAnalysisComplete(analyses)
    }
  }, [analyses, isAnalyzing, onAnalysisComplete])

  const analyzedCount = analyses.filter((a) => !a.isAnalyzing && !a.error).length
  const errorCount = analyses.filter((a) => a.error).length

  return {
    // Состояние
    analyses,
    isAnalyzing,
    overallProgress,
    selectedFiles,
    analyzedCount,
    errorCount,

    // Обработчики
    startAnalysis,
    handleToggleTrack,
    handleToggleSubtitle,
    handleTrackGroupEdit,
    applyTrackGroupToAll,
  }
}

/**
 * Список «технических» названий аудиодорожек, которые не являются именами команд.
 * Если title состоит только из такого слова — не используем как dubGroup.
 */
const GENERIC_AUDIO_TITLES = new Set([
  'audio',
  'stereo',
  'mono',
  'surround',
  'default',
  'commentary',
  'descriptive',
  'track',
  '2.0',
  '5.1',
  '7.1',
  '2ch',
  '6ch',
  '8ch',
])

/**
 * Проверить, является ли название аудиодорожки «техническим» (не имя команды)
 */
function isGenericAudioTitle(title: string): boolean {
  const lower = title.trim().toLowerCase()
  if (!lower) {
    return true
  }
  // «Track 1», «Track 2» и т.д.
  if (/^track\s*\d+$/i.test(lower)) {
    return true
  }
  return GENERIC_AUDIO_TITLES.has(lower)
}

/**
 * Слова-маркеры типов субтитров (не названия команд)
 */
const SUBTITLE_TYPE_WORDS = new Set([
  'full',
  'полные',
  'полный',
  'signs',
  'надписи',
  'forced',
  'songs',
  'lyrics',
  'song',
  'sign',
  'subtitles',
  'субтитры',
  'default',
  'cc',
  'sdh',
])

/**
 * Проверить, является ли строка описанием типа субтитров (а не именем команды)
 */
function isSubtitleTypeWord(text: string): boolean {
  return SUBTITLE_TYPE_WORDS.has(text.trim().toLowerCase())
}

export type UsePreviewAnalysisReturn = ReturnType<typeof usePreviewAnalysis>
