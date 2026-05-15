'use client'

/**
 * Хук для управления публикацией библиотеки
 */

import { useCallback, useEffect, useState } from 'react'

import type { PublisherConfig, PublishResult } from '../../../../../../shared/types/ipfs'

import type { PublisherState } from './types'

export interface UsePublisherReturn {
  publisher: PublisherState
  updatePublisherConfig: (updates: Partial<PublisherConfig>) => Promise<void>
  publishLibrary: () => Promise<PublishResult | null>
  refreshPublisher: () => Promise<void>
}

/**
 * Хук для управления публикацией
 */
export function usePublisher(): UsePublisherReturn {
  const [publisher, setPublisher] = useState<PublisherState>({
    config: null,
    published: null,
    progress: null,
    isPublishing: false,
    isLoading: true,
    error: null,
    animeCount: 0,
    episodeCount: 0,
  })

  // Загрузка начального состояния
  useEffect(() => {
    const loadInitialState = async () => {
      const api = window.electronAPI?.ipfs
      if (!api) {
        setPublisher((prev) => ({ ...prev, isLoading: false }))
        return
      }

      try {
        const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
          Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])

        const [configResult, publishedResult, animeCountResult] = await Promise.all([
          withTimeout(api.publisherGetConfig(), 5000),
          withTimeout(api.publisherGetPublished(), 5000),
          withTimeout(api.publisherGetAnimeCount(), 5000),
        ])
        setPublisher((prev) => ({
          ...prev,
          config: configResult.success ? configResult.data || null : null,
          published: publishedResult.success ? publishedResult.data || null : null,
          animeCount: animeCountResult.success ? animeCountResult.data?.animeCount || 0 : 0,
          episodeCount: animeCountResult.success ? animeCountResult.data?.episodeCount || 0 : 0,
          isLoading: false,
        }))
      } catch (error) {
        setPublisher((prev) => ({ ...prev, isLoading: false, error: String(error) }))
      }
    }

    void loadInitialState()
  }, [])

  // Подписка на события
  useEffect(() => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    // Publisher прогресс
    const unsubProgress = api.onPublisherProgress((progress) => {
      setPublisher((prev) => ({ ...prev, progress }))
    })

    // Publisher завершение
    const unsubPublished = api.onPublisherPublished((_result) => {
      setPublisher((prev) => ({ ...prev, isPublishing: false, progress: null }))
      // Перезагрузить опубликованную библиотеку
      void api.publisherGetPublished().then((res) => {
        if (res.success) {
          setPublisher((prev) => ({ ...prev, published: res.data || null }))
        }
      })
    })

    // Publisher config обновление
    const unsubConfig = api.onPublisherConfigUpdated((config) => {
      setPublisher((prev) => ({ ...prev, config }))
    })

    return () => {
      unsubProgress()
      unsubPublished()
      unsubConfig()
    }
  }, [])

  const updatePublisherConfig = useCallback(async (updates: Partial<PublisherConfig>) => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    try {
      const result = await api.publisherUpdateConfig(updates)
      if (result.success && result.data) {
        setPublisher((prev) => ({ ...prev, config: result.data! }))
      }
    } catch (error) {
      setPublisher((prev) => ({ ...prev, error: String(error) }))
    }
  }, [])

  const publishLibrary = useCallback(async (): Promise<PublishResult | null> => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return null
    }

    setPublisher((prev) => ({ ...prev, isPublishing: true, progress: null, error: null }))
    try {
      const result = await api.publisherPublish()
      if (result.success && result.data) {
        setPublisher((prev) => ({ ...prev, isPublishing: false }))
        return result.data
      } else {
        setPublisher((prev) => ({
          ...prev,
          isPublishing: false,
          error: result.error || 'Ошибка публикации',
        }))
        return null
      }
    } catch (error) {
      setPublisher((prev) => ({ ...prev, isPublishing: false, error: String(error) }))
      return null
    }
  }, [])

  const refreshPublisher = useCallback(async () => {
    const api = window.electronAPI?.ipfs
    if (!api) return
    try {
      const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
        Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
      const [configResult, publishedResult, animeCountResult] = await Promise.all([
        withTimeout(api.publisherGetConfig(), 5000),
        withTimeout(api.publisherGetPublished(), 5000),
        withTimeout(api.publisherGetAnimeCount(), 5000),
      ])
      setPublisher((prev) => ({
        ...prev,
        config: configResult.success ? configResult.data || null : prev.config,
        published: publishedResult.success ? publishedResult.data || null : prev.published,
        animeCount: animeCountResult.success ? animeCountResult.data?.animeCount ?? prev.animeCount : prev.animeCount,
        episodeCount: animeCountResult.success
          ? animeCountResult.data?.episodeCount ?? prev.episodeCount
          : prev.episodeCount,
      }))
    } catch {
      // не критично
    }
  }, [])

  return { publisher, updatePublisherConfig, publishLibrary, refreshPublisher }
}
