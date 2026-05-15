'use client'

/**
 * Хук для управления кастомными аудио-треками в OPFS.
 */

import {
  deleteFile,
  generateId,
  getAudioDirectory,
  getFileNameWithoutExtension,
  loadMetadata,
  MIME_TO_EXTENSION,
  readFile,
  saveFile,
  saveMetadata,
  validateAudioFile,
} from '@/lib/opfs-utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CustomAudioTrack } from '../_schemas/viewer-settings.schema'

// =============================================================================
// Типы
// =============================================================================

interface UseCustomAudioTracksResult {
  /** Список загруженных треков */
  tracks: CustomAudioTrack[]
  /** Идёт загрузка метаданных */
  isLoading: boolean
  /** Добавить новый трек */
  addTrack: (file: File) => Promise<CustomAudioTrack>
  /** Удалить трек */
  removeTrack: (id: string) => Promise<void>
  /** Получить blob URL для воспроизведения */
  getFileUrl: (id: string) => Promise<string | null>
  /** Ошибка */
  error: string | null
}

// =============================================================================
// Хук
// =============================================================================

/**
 * Хук для управления кастомными аудио-треками в OPFS.
 */
export function useCustomAudioTracks(): UseCustomAudioTracksResult {
  const [tracks, setTracks] = useState<CustomAudioTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Ref для актуального состояния треков (для использования в callbacks)
  const tracksRef = useRef<CustomAudioTrack[]>([])
  tracksRef.current = tracks

  // Кэш blob URL для воспроизведения
  const blobUrlCacheRef = useRef<Map<string, string>>(new Map())

  // Загрузка метаданных при монтировании
  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const dir = await getAudioDirectory()
        const loadedTracks = await loadMetadata(dir)
        if (mounted) {
          setTracks(loadedTracks)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError('Не удалось загрузить список треков')
          setIsLoading(false)
          console.warn('Ошибка загрузки треков из OPFS:', err)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  // Очистка blob URL при размонтировании
  useEffect(() => {
    const cache = blobUrlCacheRef.current
    return () => {
      cache.forEach((url) => {
        URL.revokeObjectURL(url)
      })
      cache.clear()
    }
  }, [])

  /**
   * Добавить новый трек
   */
  const addTrack = useCallback(async (file: File): Promise<CustomAudioTrack> => {
    setError(null)

    // Валидация
    const validation = await validateAudioFile(file)
    if (!validation.valid) {
      setError(validation.error ?? 'Ошибка валидации')
      throw new Error(validation.error)
    }

    const id = generateId()
    const extension = MIME_TO_EXTENSION[file.type] ?? 'mp3'
    const fileName = `${id}.${extension}`

    const track: CustomAudioTrack = {
      id,
      name: getFileNameWithoutExtension(file.name),
      category: 'custom',
      size: file.size,
      mimeType: file.type,
      duration: validation.duration ?? 0,
      extension,
      uploadedAt: Date.now(),
    }

    try {
      const dir = await getAudioDirectory()

      // Сохраняем аудиофайл
      await saveFile(dir, fileName, file)

      // Используем ref для актуального состояния (важно для множественной загрузки)
      const updatedTracks = [...tracksRef.current, track]
      await saveMetadata(dir, updatedTracks)

      setTracks(updatedTracks)
      return track
    } catch (err) {
      setError('Не удалось сохранить файл')
      console.error('Ошибка сохранения трека:', err)
      throw err
    }
  }, [])

  /**
   * Удалить трек
   */
  const removeTrack = useCallback(async (id: string): Promise<void> => {
    setError(null)

    const trackToRemove = tracksRef.current.find((t) => t.id === id)
    if (!trackToRemove) {
      return
    }

    try {
      const dir = await getAudioDirectory()

      // Удаляем аудиофайл
      const fileName = `${id}.${trackToRemove.extension}`
      await deleteFile(dir, fileName)

      // Очищаем blob URL из кэша
      const cachedUrl = blobUrlCacheRef.current.get(id)
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl)
        blobUrlCacheRef.current.delete(id)
      }

      // Обновляем метаданные
      const updatedTracks = tracksRef.current.filter((t) => t.id !== id)
      await saveMetadata(dir, updatedTracks)

      setTracks(updatedTracks)
    } catch (err) {
      setError('Не удалось удалить файл')
      console.error('Ошибка удаления трека:', err)
      throw err
    }
  }, [])

  /**
   * Получить blob URL для воспроизведения
   */
  const getFileUrl = useCallback(async (id: string): Promise<string | null> => {
    // Проверяем кэш
    const cached = blobUrlCacheRef.current.get(id)
    if (cached) {
      return cached
    }

    // Находим трек
    const track = tracksRef.current.find((t) => t.id === id)
    if (!track) {
      return null
    }

    try {
      const dir = await getAudioDirectory()
      const fileName = `${id}.${track.extension}`
      const file = await readFile(dir, fileName)

      if (!file) {
        return null
      }

      // Создаём blob URL и кэшируем
      const blobUrl = URL.createObjectURL(file)
      blobUrlCacheRef.current.set(id, blobUrl)

      return blobUrl
    } catch (err) {
      console.error('Ошибка чтения файла:', err)
      return null
    }
  }, [])

  return {
    tracks,
    isLoading,
    addTrack,
    removeTrack,
    getFileUrl,
    error,
  }
}
