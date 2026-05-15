'use client'

import { useCallback, useEffect, useState } from 'react'

import type { MediaInfo, TranscodeProgress, VideoTranscodeOptions } from '../../../shared/types'

export interface FileItem {
  path: string
  name: string
  size: number
  mediaInfo?: MediaInfo
  status: 'pending' | 'analyzing' | 'ready' | 'transcoding' | 'completed' | 'error'
  progress?: number
  error?: string
}

export interface TranscodeState {
  step: 'select' | 'analyze' | 'settings' | 'transcode' | 'done'
  folderPath: string | null
  files: FileItem[]
  selectedFiles: string[]
  settings: VideoTranscodeOptions
  isProcessing: boolean
}

const defaultSettings: VideoTranscodeOptions = {
  codec: 'av1',
  preset: 'p5',
  cq: 24,
  useGpu: true,
}

/**
 * Хук для управления процессом транскодирования
 */
export function useTranscode() {
  const [state, setState] = useState<TranscodeState>({
    step: 'select',
    folderPath: null,
    files: [],
    selectedFiles: [],
    settings: defaultSettings,
    isProcessing: false,
  })

  // Выбор папки
  const selectFolder = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    const folder = await api.dialog.selectFolder()
    if (folder) {
      setState((prev) => ({
        ...prev,
        folderPath: folder,
        step: 'analyze',
        isProcessing: true,
      }))

      // Сканируем папку на видеофайлы
      await scanFolder(folder)
    }
  }, [])

  // Сканирование папки через IPC
  const scanFolder = async (folderPath: string) => {
    const api = window.electronAPI
    if (!api) {
      setState((prev) => ({ ...prev, isProcessing: false }))
      return
    }

    try {
      const result = await api.fs.scanFolder(folderPath, true)

      if (result.success && result.files.length > 0) {
        const files: FileItem[] = result.files.map((f) => ({
          path: f.path,
          name: f.name,
          size: f.size,
          status: 'pending' as const,
        }))

        setState((prev) => ({
          ...prev,
          files,
          selectedFiles: files.map((f) => f.path),
          isProcessing: false,
        }))
      } else {
        // Пустая папка или ошибка
        setState((prev) => ({
          ...prev,
          files: [],
          selectedFiles: [],
          isProcessing: false,
        }))
      }
    } catch (error) {
      console.error('[useTranscode] scanFolder error:', error)
      setState((prev) => ({ ...prev, isProcessing: false }))
    }
  }

  // Анализ файлов через FFprobe
  const analyzeFiles = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    setState((prev) => ({ ...prev, isProcessing: true }))

    const updatedFiles = [...state.files]

    for (let i = 0; i < updatedFiles.length; i++) {
      const file = updatedFiles[i]
      if (!state.selectedFiles.includes(file.path)) {
        continue
      }

      updatedFiles[i] = { ...file, status: 'analyzing' }
      setState((prev) => ({ ...prev, files: [...updatedFiles] }))

      try {
        const result = await api.ffmpeg.probe(file.path)
        if (result.success && result.data) {
          updatedFiles[i] = { ...file, status: 'ready', mediaInfo: result.data }
        } else {
          updatedFiles[i] = { ...file, status: 'error', error: result.error }
        }
      } catch (error) {
        updatedFiles[i] = { ...file, status: 'error', error: String(error) }
      }

      setState((prev) => ({ ...prev, files: [...updatedFiles] }))
    }

    setState((prev) => ({
      ...prev,
      isProcessing: false,
      step: 'settings',
    }))
  }, [state.files, state.selectedFiles])

  // Запуск транскодирования
  const startTranscode = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    setState((prev) => ({ ...prev, step: 'transcode', isProcessing: true }))

    const updatedFiles = [...state.files]

    for (let i = 0; i < updatedFiles.length; i++) {
      const file = updatedFiles[i]
      if (!state.selectedFiles.includes(file.path) || file.status !== 'ready') {
        continue
      }

      const outputPath = file.path.replace(/\.[^.]+$/, '.av1.mkv')

      updatedFiles[i] = { ...file, status: 'transcoding', progress: 0 }
      setState((prev) => ({ ...prev, files: [...updatedFiles] }))

      try {
        await api.ffmpeg.transcodeVideo(file.path, outputPath, state.settings)
        updatedFiles[i] = { ...file, status: 'completed', progress: 100 }
      } catch (error) {
        updatedFiles[i] = { ...file, status: 'error', error: String(error) }
      }

      setState((prev) => ({ ...prev, files: [...updatedFiles] }))
    }

    setState((prev) => ({ ...prev, isProcessing: false, step: 'done' }))
  }, [state.files, state.selectedFiles, state.settings])

  // Подписка на прогресс транскодирования
  useEffect(() => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    const unsubscribe = api.on.transcodeProgress((progress: TranscodeProgress & { type: string }) => {
      if (progress.type === 'video') {
        setState((prev) => ({
          ...prev,
          files: prev.files.map((f) => (f.status === 'transcoding' ? { ...f, progress: progress.percent } : f)),
        }))
      }
    })

    return unsubscribe
  }, [])

  // Переключение выбора файла
  const toggleFileSelection = useCallback((path: string) => {
    setState((prev) => ({
      ...prev,
      selectedFiles: prev.selectedFiles.includes(path)
        ? prev.selectedFiles.filter((p) => p !== path)
        : [...prev.selectedFiles, path],
    }))
  }, [])

  // Выбрать все файлы
  const selectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedFiles: prev.files.map((f) => f.path),
    }))
  }, [])

  // Снять выбор со всех файлов
  const deselectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedFiles: [],
    }))
  }, [])

  // Обновление настроек
  const updateSettings = useCallback((settings: Partial<VideoTranscodeOptions>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }))
  }, [])

  // Переход к следующему шагу
  const nextStep = useCallback(() => {
    setState((prev) => {
      const steps: TranscodeState['step'][] = ['select', 'analyze', 'settings', 'transcode', 'done']
      const currentIndex = steps.indexOf(prev.step)
      const nextIndex = Math.min(currentIndex + 1, steps.length - 1)
      return { ...prev, step: steps[nextIndex] }
    })
  }, [])

  // Сброс
  const reset = useCallback(() => {
    setState({
      step: 'select',
      folderPath: null,
      files: [],
      selectedFiles: [],
      settings: defaultSettings,
      isProcessing: false,
    })
  }, [])

  // Вычисляемые значения
  const totalSize = state.files.reduce((sum, f) => sum + f.size, 0)
  const selectedSize = state.files
    .filter((f) => state.selectedFiles.includes(f.path))
    .reduce((sum, f) => sum + f.size, 0)

  return {
    ...state,
    totalSize,
    selectedSize,
    selectFolder,
    analyzeFiles,
    startTranscode,
    toggleFileSelection,
    selectAll,
    deselectAll,
    updateSettings,
    nextStep,
    reset,
  }
}
