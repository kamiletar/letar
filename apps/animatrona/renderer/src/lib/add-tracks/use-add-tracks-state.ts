'use client'

/**
 * Хук для управления состоянием wizard добавления дорожек
 */

import { useCallback, useRef, useState } from 'react'

import type { AddedRecord, AddTracksProgress, AddTracksStage, AddTracksState, FileProgress } from './types'
import { getInitialConcurrency } from './utils'

/** Начальное состояние */
function createInitialState(concurrency: number): AddTracksState {
  return {
    stage: 'idle',
    donorPath: null,
    donorFiles: [],
    matches: [],
    probeResults: new Map(),
    selectedTracks: [],
    progress: {
      currentFile: 0,
      totalFiles: 0,
      currentFileName: null,
      phase: 'demux',
      parallelProgress: null,
      addedAudioTracks: 0,
      addedSubtitleTracks: 0,
      fileProgress: [],
      concurrency,
    },
    error: null,
    syncOffset: 0,
    concurrency,
  }
}

/**
 * Хук для управления состоянием wizard
 */
export function useAddTracksState() {
  const initialConcurrency = getInitialConcurrency()

  // Refs
  const isCancelledRef = useRef(false)
  /** Список добавленных записей для отката при отмене */
  const addedRecordsRef = useRef<AddedRecord[]>([])
  /** Ref для динамического изменения concurrency на лету (читается в runWithConcurrency) */
  const concurrencyRef = useRef(initialConcurrency)

  // Состояние
  const [state, setState] = useState<AddTracksState>(() => createInitialState(initialConcurrency))

  /**
   * Сбросить состояние
   */
  const reset = useCallback(() => {
    isCancelledRef.current = false
    addedRecordsRef.current = []
    concurrencyRef.current = initialConcurrency
    setState(createInitialState(initialConcurrency))
  }, [initialConcurrency])

  /**
   * Установить стадию
   */
  const setStage = useCallback((stage: AddTracksStage, error?: string | null) => {
    setState((s) => ({
      ...s,
      stage,
      error: error ?? (stage === 'error' ? s.error : null),
    }))
  }, [])

  /**
   * Установить ошибку
   */
  const setError = useCallback((error: string) => {
    setState((s) => ({ ...s, stage: 'error', error }))
  }, [])

  /**
   * Установить количество параллельных потоков
   */
  const setConcurrency = useCallback((value: number) => {
    const clamped = Math.max(1, Math.min(16, value))
    concurrencyRef.current = clamped
    setState((s) => ({
      ...s,
      concurrency: clamped,
      progress: { ...s.progress, concurrency: clamped },
    }))
  }, [])

  /**
   * Установить смещение синхронизации
   */
  const setSyncOffset = useCallback((offset: number) => {
    setState((s) => ({ ...s, syncOffset: offset }))
  }, [])

  /**
   * Обновить прогресс
   */
  const updateProgress = useCallback((update: Partial<AddTracksProgress>) => {
    setState((s) => ({
      ...s,
      progress: { ...s.progress, ...update },
    }))
  }, [])

  /**
   * Обновить прогресс отдельного файла
   */
  const updateFileProgress = useCallback((fileId: string, update: Partial<FileProgress>) => {
    setState((s) => ({
      ...s,
      progress: {
        ...s.progress,
        fileProgress: s.progress.fileProgress.map((fp) => (fp.id === fileId ? { ...fp, ...update } : fp)),
      },
    }))
  }, [])

  /**
   * Инкрементировать счётчик добавленных дорожек
   */
  const incrementAddedTracks = useCallback((type: 'audio' | 'subtitle') => {
    setState((s) => ({
      ...s,
      progress: {
        ...s.progress,
        addedAudioTracks: type === 'audio' ? s.progress.addedAudioTracks + 1 : s.progress.addedAudioTracks,
        addedSubtitleTracks: type === 'subtitle' ? s.progress.addedSubtitleTracks + 1 : s.progress.addedSubtitleTracks,
      },
    }))
  }, [])

  /**
   * Добавить запись для возможного отката
   */
  const addRecord = useCallback((record: AddedRecord) => {
    addedRecordsRef.current.push(record)
  }, [])

  /**
   * Получить все добавленные записи и очистить список
   */
  const getAndClearRecords = useCallback((): AddedRecord[] => {
    const records = [...addedRecordsRef.current]
    addedRecordsRef.current = []
    return records
  }, [])

  /**
   * Установить флаг отмены
   */
  const setCancelled = useCallback((value: boolean) => {
    isCancelledRef.current = value
  }, [])

  return {
    state,
    setState,
    isCancelledRef,
    addedRecordsRef,
    concurrencyRef,
    // Actions
    reset,
    setStage,
    setError,
    setConcurrency,
    setSyncOffset,
    updateProgress,
    updateFileProgress,
    incrementAddedTracks,
    addRecord,
    getAndClearRecords,
    setCancelled,
  }
}

export type UseAddTracksStateReturn = ReturnType<typeof useAddTracksState>
