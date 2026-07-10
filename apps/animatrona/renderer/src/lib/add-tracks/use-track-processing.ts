'use client'

/**
 * Хук для обработки/транскодирования дорожек
 */

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'

import {
  useCreateAudioTrack,
  useCreateSubtitleFont,
  useCreateSubtitleTrack,
  useDeleteAudioTrack,
  useDeleteSubtitleTrack,
  useFindUniqueSettings,
} from '@/lib/hooks'

import { createImportError } from '@/app/_actions/import-error.action'

import { uploadToIpfs } from '../ipfs-upload'
import type { AudioTask, FileProgress, FontTask, SubtitleTask } from './types'
import type { UseAddTracksStateReturn } from './use-add-tracks-state'
import { formatChannels, needsAudioTranscode, runWithConcurrency } from './utils'

interface UseTrackProcessingOptions {
  /** Управление состоянием */
  stateManager: UseAddTracksStateReturn
}

/**
 * Хук для обработки/транскодирования дорожек
 */
export function useTrackProcessing(options: UseTrackProcessingOptions) {
  const { stateManager } = options
  const {
    state,
    setState,
    isCancelledRef,
    setStage,
    setError,
    updateFileProgress,
    incrementAddedTracks,
    addRecord,
    getAndClearRecords,
    setCancelled,
  } = stateManager

  const queryClient = useQueryClient()

  // Настройки из БД (audioBitrate для транскодирования)
  const { data: appSettings } = useFindUniqueSettings({ where: { id: 'default' } })

  // Mutations
  const createAudioTrack = useCreateAudioTrack()
  const createSubtitleTrack = useCreateSubtitleTrack()
  const createSubtitleFont = useCreateSubtitleFont()
  const deleteAudioTrack = useDeleteAudioTrack()
  const deleteSubtitleTrack = useDeleteSubtitleTrack()

  // Ref для очистки ffmpeg:progress listener — предотвращает утечку
  const progressUnsubRef = useRef<(() => void) | null>(null)
  // Guard от повторного вызова startProcessing
  const isStartedRef = useRef(false)

  /**
   * Запустить обработку (добавление дорожек)
   */
  const startProcessing = useCallback(
    async (fontTasksOverride?: FontTask[]) => {
      // Guard: не запускать повторно
      if (isStartedRef.current) {
        return
      }
      isStartedRef.current = true

      const api = window.electronAPI
      if (!api) {
        setError('Electron API недоступен')
        isStartedRef.current = false
        return
      }

      const hasFontTasks = (fontTasksOverride ?? state.fontTasks ?? []).length > 0
      if (state.selectedTracks.length === 0 && !hasFontTasks) {
        setError('Не выбрано ни одной дорожки')
        isStartedRef.current = false
        return
      }

      setCancelled(false)

      setState((s) => ({
        ...s,
        stage: 'processing',
        // Очищаем probeResults — они больше не нужны, освобождаем память
        probeResults: new Map(),
        progress: {
          currentFile: 0,
          totalFiles: state.selectedTracks.length,
          currentFileName: null,
          phase: 'transcode',
          parallelProgress: null,
          addedAudioTracks: 0,
          addedSubtitleTracks: 0,
          fileProgress: [],
          concurrency: s.concurrency,
        },
        error: null,
      }))

      // Очищаем предыдущий listener (если был)
      progressUnsubRef.current?.()
      progressUnsubRef.current = null

      try {
        // === ФАЗА 1: Собрать ВСЕ задачи из ВСЕХ доноров ===
        const allAudioTasks: AudioTask[] = []
        const allSubtitleTasks: SubtitleTask[] = []

        // Используем данные напрямую из SelectedTrack (episodeId и episodeDir уже есть)
        for (const t of state.selectedTracks) {
          if (!t.episodeDir) {
            console.warn(`[AddTracks] No episode dir for track ${t.track.id}`)
            continue
          }

          if (t.type === 'audio') {
            allAudioTasks.push({
              id: t.track.id,
              type: t.track.isExternal ? 'external' : 'embedded',
              donorPath: t.matchId,
              episodeId: t.episodeId,
              episodeDir: t.episodeDir,
              trackInfo: t.track,
            })
          } else if (t.type === 'subtitle') {
            allSubtitleTasks.push({
              id: t.track.id,
              type: t.track.isExternal ? 'external' : 'embedded',
              donorPath: t.matchId,
              episodeId: t.episodeId,
              episodeDir: t.episodeDir,
              trackInfo: t.track,
            })
          }
        }

        // DEBUG: Проверяем что собрали
        console.warn('[AddTracks] Tasks collected:', {
          audio: allAudioTasks.length,
          subtitles: allSubtitleTasks.length,
          selectedTracks: state.selectedTracks.map((t) => ({ id: t.track.id, type: t.type, episodeDir: t.episodeDir })),
        })

        // === Инициализируем fileProgress для ВСЕХ задач сразу ===
        const allProgress: FileProgress[] = [
          ...allAudioTasks.map((t) => ({
            id: t.id,
            fileName:
              t.type === 'embedded'
                ? `[MKV] ${t.trackInfo.title || t.trackInfo.language || 'audio'}`
                : t.trackInfo.title || t.trackInfo.filePath?.split(/[/\\]/).pop() || 'audio',
            phase: 'waiting' as const,
            percent: 0,
          })),
          ...allSubtitleTasks.map((t) => ({
            id: t.id,
            fileName:
              t.type === 'embedded'
                ? `[SUB] ${t.trackInfo.title || t.trackInfo.language || 'subtitle'}`
                : t.trackInfo.title || t.trackInfo.filePath?.split(/[/\\]/).pop() || 'subtitle',
            phase: 'waiting' as const,
            percent: 0,
          })),
        ]

        setState((s) => ({
          ...s,
          progress: { ...s.progress, fileProgress: allProgress },
        }))

        // === Глобальный listener для прогресса FFmpeg ===
        // Обновляем только ПЕРВУЮ задачу в фазе transcode (текущую активную).
        // При параллельных задачах прогресс-события перемешиваются — лучше
        // показать прогресс одной задачи, чем неточный прогресс всех.
        progressUnsubRef.current = api.ffmpeg.onProgress((data) => {
          if (data.type === 'audio' && typeof data.percent === 'number') {
            const mappedPercent = 10 + data.percent * 0.7
            setState((s) => {
              let updated = false
              return {
                ...s,
                progress: {
                  ...s.progress,
                  fileProgress: s.progress.fileProgress.map((fp) => {
                    // Обновляем только первую задачу в transcode (не все)
                    if (!updated && fp.phase === 'transcode') {
                      updated = true
                      return { ...fp, percent: Math.max(fp.percent, mappedPercent) }
                    }
                    return fp
                  }),
                },
              }
            })
          }
        })

        // === ФАЗА 2: Параллельная обработка ВСЕХ аудио ===
        const audioBitrate = appSettings?.audioBitrate ?? 192
        const processAudioTask = async (task: AudioTask, index: number) => {
          // api проверен выше в начале функции
          await processAudio(
            task,
            index,
            api as NonNullable<typeof api>,
            state.syncOffset,
            isCancelledRef,
            updateFileProgress,
            incrementAddedTracks,
            addRecord,
            createAudioTrack,
            audioBitrate
          )
        }

        await runWithConcurrency(allAudioTasks, processAudioTask, stateManager.concurrencyRef, isCancelledRef)

        // === ФАЗА 3: Параллельная обработка ВСЕХ субтитров ===
        const processSubtitleTask = async (task: SubtitleTask, index: number) => {
          // api проверен выше в начале функции
          await processSubtitle(
            task,
            index,
            api as NonNullable<typeof api>,
            state.syncOffset,
            isCancelledRef,
            updateFileProgress,
            incrementAddedTracks,
            addRecord,
            createSubtitleTrack,
            createSubtitleFont
          )
        }

        await runWithConcurrency(allSubtitleTasks, processSubtitleTask, stateManager.concurrencyRef, isCancelledRef)

        // === ФАЗА 4: Восстановление шрифтов из MKV attachments ===
        const fontTasks = fontTasksOverride ?? state.fontTasks ?? []
        if (fontTasks.length > 0 && !isCancelledRef.current) {
          await processFontTasks(fontTasks, api as NonNullable<typeof api>, isCancelledRef, createSubtitleFont)
        }

        // Отписываемся от прогресса FFmpeg
        progressUnsubRef.current?.()
        progressUnsubRef.current = null
        isStartedRef.current = false

        // Инвалидируем кэш — используем predicate для поиска по первому элементу query key
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'episode',
        })
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'audioTracks',
        })
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'subtitleTracks',
        })

        setState((s) => ({
          ...s,
          stage: 'done',
          progress: {
            ...s.progress,
            phase: 'done',
          },
        }))
      } catch (error) {
        progressUnsubRef.current?.()
        progressUnsubRef.current = null
        isStartedRef.current = false
        if (isCancelledRef.current) {
          setStage('cancelled')
        } else {
          setError(`Ошибка обработки: ${error}`)
        }
      }
    },
    [
      state.selectedTracks,
      state.syncOffset,
      queryClient,
      createAudioTrack,
      createSubtitleTrack,
      createSubtitleFont,
      setState,
      setStage,
      setError,
      isCancelledRef,
      setCancelled,
      updateFileProgress,
      incrementAddedTracks,
      addRecord,
    ]
  )

  /**
   * Отменить процесс и откатить добавленные записи
   */
  const cancel = useCallback(async () => {
    setCancelled(true)
    setStage('cancelled')

    // Очищаем progress listener и guard
    progressUnsubRef.current?.()
    progressUnsubRef.current = null
    isStartedRef.current = false

    // Убиваем все активные FFmpeg процессы мгновенно
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (window.electronAPI?.ffmpeg as any)?.killAll?.()
    } catch {
      // Не критично
    }

    const api = window.electronAPI
    const records = getAndClearRecords()

    if (records.length === 0 || !api) {
      return
    }

    console.warn(`[AddTracks] Rollback: deleting ${records.length} records`)

    // Удаляем записи из БД и файлы с диска
    for (const record of records) {
      try {
        // Удаляем запись из БД
        if (record.type === 'audio') {
          await deleteAudioTrack.mutateAsync({ where: { id: record.id } })
        } else {
          await deleteSubtitleTrack.mutateAsync({ where: { id: record.id } })
        }

        // Удаляем файл с диска
        if (record.filePath) {
          await api.fs.delete(record.filePath, false)
        }

        console.warn(`[AddTracks] Deleted ${record.type} ${record.id}`)
      } catch (err) {
        console.warn(`[AddTracks] Failed to rollback ${record.type} ${record.id}:`, err)
      }
    }

    // Инвалидируем кэш
    queryClient.invalidateQueries({ queryKey: ['findManyAudioTrack'] })
    queryClient.invalidateQueries({ queryKey: ['findManySubtitleTrack'] })
  }, [deleteAudioTrack, deleteSubtitleTrack, queryClient, setCancelled, setStage, getAndClearRecords])

  return {
    startProcessing,
    cancel,
  }
}

// === Вспомогательные функции обработки ===

/**
 * Обработка одной аудио-задачи
 */
async function processAudio(
  task: AudioTask,
  index: number,
  api: NonNullable<typeof window.electronAPI>,
  syncOffset: number,
  isCancelledRef: React.RefObject<boolean>,
  updateFileProgress: (id: string, update: Partial<FileProgress>) => void,
  incrementAddedTracks: (type: 'audio' | 'subtitle') => void,
  addRecord: (record: { type: 'audio' | 'subtitle'; id: string; filePath: string }) => void,
  createAudioTrack: ReturnType<typeof useCreateAudioTrack>,
  audioBitrate: number
): Promise<void> {
  const { id, type, donorPath, episodeId, episodeDir, trackInfo } = task

  console.warn('[AddTracks] Processing audio:', { id, type, episodeId, episodeDir })

  if (isCancelledRef.current) {
    updateFileProgress(id, { phase: 'error', error: 'Отменено' })
    return
  }

  const sourcePath = type === 'embedded' ? donorPath : trackInfo.filePath
  if (!sourcePath) {
    updateFileProgress(id, { phase: 'error', error: 'No source path' })
    return
  }

  const nextIndex = (Date.now() + index) % 100000
  const lang = trackInfo.language || 'und'
  const destPath = `${episodeDir}/audio_${type === 'embedded' ? 'donor' : 'ext'}_${nextIndex}_${lang}.m4a`

  const sourceExt = sourcePath.split('.').pop()?.toLowerCase() || ''
  const shouldTranscode = type === 'embedded' || needsAudioTranscode(sourceExt, null) || syncOffset !== 0

  updateFileProgress(id, { phase: shouldTranscode ? 'transcode' : 'copy', percent: 10 })

  try {
    if (shouldTranscode) {
      const transcodeResult = await api.ffmpeg.transcodeAudio(sourcePath, destPath, {
        bitrate: audioBitrate,
        sampleRate: 48000,
        channels: 2,
        syncOffset: syncOffset,
        streamIndex: type === 'embedded' ? trackInfo.streamIndex : undefined,
      })

      if (!transcodeResult.success) {
        const errorMsg = transcodeResult.error || 'Transcode failed'
        updateFileProgress(id, { phase: 'error', error: errorMsg })
        void createImportError({
          episodeId,
          trackType: 'audio',
          streamIndex: trackInfo.streamIndex,
          language: trackInfo.language || undefined,
          title: trackInfo.title || trackInfo.dubGroup || undefined,
          error: errorMsg,
          stage: 'transcode',
          sourcePath,
        }) // eslint-disable-next-line @typescript-eslint/no-empty-function
          .catch(() => {})
        return
      }
    } else {
      const copyResult = await api.fs.copyFile(sourcePath, destPath)
      if (!copyResult.success) {
        const errorMsg = copyResult.error || 'Copy failed'
        updateFileProgress(id, { phase: 'error', error: errorMsg })
        void createImportError({
          episodeId,
          trackType: 'audio',
          streamIndex: trackInfo.streamIndex,
          language: trackInfo.language || undefined,
          title: trackInfo.title || trackInfo.dubGroup || undefined,
          error: errorMsg,
          stage: 'transcode',
          sourcePath,
        }) // eslint-disable-next-line @typescript-eslint/no-empty-function
          .catch(() => {})
        return
      }
    }

    updateFileProgress(id, { percent: 70 })

    // Загружаем аудио в IPFS
    updateFileProgress(id, { percent: 80 })
    const audioUploadResult = await uploadToIpfs(destPath)

    if (!audioUploadResult?.cid) {
      updateFileProgress(id, { phase: 'error', error: 'IPFS upload failed' })
      return
    }

    // Удаляем temp файл — данные теперь в IPFS
    try {
      await api.fs.delete(destPath, false)
    } catch {
      /* не критично */
    }

    const audioRecord = await createAudioTrack.mutateAsync({
      data: {
        episodeId,
        streamIndex: nextIndex,
        language: lang,
        title: trackInfo.title || trackInfo.dubGroup || undefined,
        codec: 'aac',
        channels: type === 'embedded' ? formatChannels(trackInfo.channels) : '2.0',
        bitrate: audioBitrate * 1000,
        isDefault: false,
        transcodedCid: audioUploadResult?.cid ?? undefined,
        ipfsSize: audioUploadResult?.size ?? undefined,
        dubGroup: trackInfo.dubGroup || undefined,
      },
    })

    console.warn('[AddTracks] Audio record created:', { audioRecordId: audioRecord.id, episodeId })
    // filePath пустой — temp файл уже удалён после загрузки в IPFS
    addRecord({ type: 'audio', id: audioRecord.id, filePath: '' })
    updateFileProgress(id, { phase: 'done', percent: 100 })

    incrementAddedTracks('audio')
  } catch (err) {
    console.error('[AddTracks] Error processing audio:', id, err)
    updateFileProgress(id, { phase: 'error', error: String(err) })

    // Записываем ошибку в БД для последующего восстановления
    void createImportError({
      episodeId,
      trackType: 'audio',
      streamIndex: trackInfo.streamIndex,
      language: trackInfo.language || undefined,
      title: trackInfo.title || trackInfo.dubGroup || undefined,
      error: err instanceof Error ? err.message : String(err),
      stage: 'transcode',
      sourcePath: type === 'embedded' ? donorPath : trackInfo.filePath,
    }).catch((e) => console.warn('[AddTracks] Failed to record import error:', e))
  }
}

/**
 * Обработка одной субтитр-задачи
 */
async function processSubtitle(
  task: SubtitleTask,
  index: number,
  api: NonNullable<typeof window.electronAPI>,
  syncOffset: number,
  isCancelledRef: React.RefObject<boolean>,
  updateFileProgress: (id: string, update: Partial<FileProgress>) => void,
  incrementAddedTracks: (type: 'audio' | 'subtitle') => void,
  addRecord: (record: { type: 'audio' | 'subtitle'; id: string; filePath: string }) => void,
  createSubtitleTrack: ReturnType<typeof useCreateSubtitleTrack>,
  createSubtitleFont: ReturnType<typeof useCreateSubtitleFont>
): Promise<void> {
  const { id, type, donorPath, episodeId, episodeDir, trackInfo } = task

  console.warn('[AddTracks] Processing subtitle:', { id, type, episodeId, episodeDir })

  if (isCancelledRef.current) {
    updateFileProgress(id, { phase: 'error', error: 'Отменено' })
    return
  }

  const nextIndex = (Date.now() + index) % 100000
  const lang = trackInfo.language || 'und'
  const format = trackInfo.format || 'ass'

  // Графические субтитры (PGS Blu-ray, DVD) не поддерживаются libass-плеером
  if (format === 'pgs' || format === 'hdmv_pgs_subtitle' || format === 'dvd_subtitle' || format === 'dvdsub') {
    updateFileProgress(id, {
      phase: 'error',
      error: 'Графические субтитры (PGS/DVD) не поддерживаются — только текстовые (ASS, SRT)',
    })
    return
  }

  const destPath = `${episodeDir}/subs_${type === 'embedded' ? 'donor' : 'ext'}_${nextIndex}_${lang}.${format}`

  updateFileProgress(id, { phase: 'copy', percent: 10 })

  try {
    if (type === 'external' && trackInfo.filePath) {
      // Внешний субтитр
      if (syncOffset !== 0) {
        // Инвертируем знак: для субтитров "донор опережает" = сдвиг назад
        const shiftResult = await api.subtitle.shift({
          inputPath: trackInfo.filePath,
          outputPath: destPath,
          offsetMs: -syncOffset,
        })
        if (!shiftResult.success) {
          updateFileProgress(id, { phase: 'error', error: shiftResult.error || 'Shift failed' })
          return
        }
      } else {
        const copyResult = await api.fs.copyFile(trackInfo.filePath, destPath)
        if (!copyResult.success) {
          updateFileProgress(id, { phase: 'error', error: copyResult.error || 'Copy failed' })
          return
        }
      }

      updateFileProgress(id, { percent: 60 })

      // Загружаем субтитры в IPFS
      updateFileProgress(id, { percent: 70 })
      const subUploadResult = await uploadToIpfs(destPath)

      if (!subUploadResult?.cid) {
        updateFileProgress(id, { phase: 'error', error: 'IPFS upload failed' })
        return
      }

      // Удаляем temp файл — данные теперь в IPFS
      try {
        await api.fs.delete(destPath, false)
      } catch {
        /* не критично */
      }

      const subtitleRecord = await createSubtitleTrack.mutateAsync({
        data: {
          episodeId,
          streamIndex: -1,
          language: lang,
          title: trackInfo.title || undefined,
          format,
          fileCid: subUploadResult?.cid ?? undefined,
          ipfsSize: subUploadResult?.size ?? undefined,
          isDefault: false,
          dubGroup: trackInfo.dubGroup || undefined,
        },
      })

      console.warn('[AddTracks] Subtitle record created (external):', {
        subtitleRecordId: subtitleRecord.id,
        episodeId,
      })
      // filePath пустой — temp файл уже удалён после загрузки в IPFS
      addRecord({ type: 'subtitle', id: subtitleRecord.id, filePath: '' })

      // Копируем и загружаем шрифты для ASS
      if (trackInfo.matchedFonts && trackInfo.matchedFonts.length > 0) {
        const fontsDir = `${episodeDir}/fonts`
        for (const font of trackInfo.matchedFonts) {
          try {
            const fontFileName = font.path.split(/[/\\]/).pop() || `${font.name}.ttf`
            const fileExt = fontFileName.split('.').pop()?.toLowerCase() || 'ttf'
            const destFontPath = `${fontsDir}/${fontFileName}`
            await api.fs.copyFile(font.path, destFontPath)

            // Загружаем шрифт в IPFS
            const fontUploadResult = await uploadToIpfs(destFontPath)

            // Удаляем temp шрифт — данные в IPFS
            try {
              await api.fs.delete(destFontPath, false)
            } catch {
              /* не критично */
            }

            await createSubtitleFont.mutateAsync({
              data: {
                subtitleTrackId: subtitleRecord.id,
                fontName: font.name,
                fileExt,
                fileCid: fontUploadResult?.cid ?? undefined,
                ipfsSize: fontUploadResult?.size ?? undefined,
              },
            })
          } catch (fontError) {
            console.warn(`[AddTracks] Failed to copy font ${font.name}:`, fontError)
          }
        }
      }
    } else {
      // Встроенный субтитр — извлекаем ОДИН поток напрямую (без полного demux)
      // Это в разы быстрее, особенно при параллельном чтении с USB/HDD

      console.warn('[AddTracks] Extracting embedded subtitle stream:', {
        donorPath,
        streamIndex: trackInfo.streamIndex,
        destPath,
      })

      updateFileProgress(id, { percent: 20 })

      const extractResult = await api.ffmpeg.extractStream(donorPath, destPath, `0:s:${trackInfo.streamIndex}`)
      if (!extractResult?.success) {
        updateFileProgress(id, { phase: 'error', error: 'Extract failed' })
        return
      }

      updateFileProgress(id, { percent: 50 })

      if (syncOffset !== 0) {
        // Сдвиг субтитров по времени
        const shiftedPath = `${destPath}.shifted.${format}`
        const shiftResult = await api.subtitle.shift({
          inputPath: destPath,
          outputPath: shiftedPath,
          offsetMs: -syncOffset,
        })
        if (!shiftResult.success) {
          updateFileProgress(id, { phase: 'error', error: shiftResult.error || 'Shift failed' })
          try {
            await api.fs.delete(destPath, false)
          } catch {
            /* */
          }
          return
        }
        // Заменяем оригинал сдвинутым
        try {
          await api.fs.delete(destPath, false)
        } catch {
          /* */
        }
        try {
          await api.fs.copyFile(shiftedPath, destPath)
        } catch {
          /* */
        }
        try {
          await api.fs.delete(shiftedPath, false)
        } catch {
          /* */
        }
      }

      updateFileProgress(id, { percent: 70 })

      // Загружаем в IPFS
      updateFileProgress(id, { percent: 80 })
      const embeddedUploadResult = await uploadToIpfs(destPath)

      if (!embeddedUploadResult?.cid) {
        updateFileProgress(id, { phase: 'error', error: 'IPFS upload failed' })
        try {
          await api.fs.delete(destPath, false)
        } catch {
          /* */
        }
        return
      }

      // Удаляем temp файл — данные теперь в IPFS
      try {
        await api.fs.delete(destPath, false)
      } catch {
        /* не критично */
      }

      const embeddedSubRecord = await createSubtitleTrack.mutateAsync({
        data: {
          episodeId,
          streamIndex: nextIndex,
          language: lang,
          title: trackInfo.title || undefined,
          format,
          fileCid: embeddedUploadResult?.cid ?? undefined,
          ipfsSize: embeddedUploadResult?.size ?? undefined,
          isDefault: false,
          dubGroup: trackInfo.dubGroup || undefined,
        },
      })

      console.warn('[AddTracks] Subtitle record created (embedded):', {
        subtitleRecordId: embeddedSubRecord.id,
        episodeId,
      })
      addRecord({ type: 'subtitle', id: embeddedSubRecord.id, filePath: '' })
    }

    updateFileProgress(id, { phase: 'done', percent: 100 })

    incrementAddedTracks('subtitle')
  } catch (err) {
    console.error(`[AddTracks] Error processing subtitle ${id}:`, err)
    updateFileProgress(id, { phase: 'error', error: String(err) })

    // Записываем ошибку в БД
    void createImportError({
      episodeId,
      trackType: 'subtitle',
      streamIndex: trackInfo.streamIndex,
      language: trackInfo.language || undefined,
      title: trackInfo.title || undefined,
      error: err instanceof Error ? err.message : String(err),
      stage: 'transcode',
      sourcePath: type === 'embedded' ? donorPath : trackInfo.filePath,
    }).catch((e) => console.warn('[AddTracks] Failed to record import error:', e))
  }
}

// === Восстановление шрифтов из MKV attachments ===

/** Нормализация имени шрифта для сравнения */
function normalizeFontName(name: string): string {
  return name.toLowerCase().replace(/\.(ttf|otf|ttc|woff2?)$/i, '')
}

/**
 * Извлечь и загрузить недостающие шрифты из донорских MKV
 * IPFS upload и cleanup temp файлов происходят в main process (ffmpeg:extractFonts)
 */
async function processFontTasks(
  fontTasks: FontTask[],
  api: NonNullable<typeof window.electronAPI>,
  isCancelledRef: React.RefObject<boolean>,
  createSubtitleFont: ReturnType<typeof useCreateSubtitleFont>
): Promise<void> {
  for (const task of fontTasks) {
    if (isCancelledRef.current) break

    try {
      // 1. Извлекаем шрифты из донора (main process: extract → IPFS upload → cleanup)
      const result = await api.ffmpeg.extractFonts(task.donorPath)
      if (!result.fonts || result.fonts.length === 0) continue

      // 2. Фильтруем только недостающие (с CID)
      const missing = result.fonts.filter(
        (f) => f.cid && task.missingFonts.some((m) => normalizeFontName(m) === normalizeFontName(f.fileName))
      )

      // 3. Создаём SubtitleFont для каждой ASS дорожки эпизода
      for (const font of missing) {
        if (isCancelledRef.current) break

        for (const trackId of task.subtitleTrackIds) {
          await createSubtitleFont.mutateAsync({
            data: {
              subtitleTrackId: trackId,
              fontName: font.name,
              fileExt: font.ext,
              fileCid: font.cid!,
              ipfsSize: font.ipfsSize ?? undefined,
            },
          })
        }

        console.warn(`[RestoreFonts] Шрифт восстановлен: ${font.fileName} → ${task.subtitleTrackIds.length} дорожек`)
      }
    } catch (err) {
      console.error(`[RestoreFonts] Ошибка обработки шрифтов для ${task.donorPath}:`, err)
    }
  }
}

export type UseTrackProcessingReturn = ReturnType<typeof useTrackProcessing>
