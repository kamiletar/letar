'use client'

/**
 * Хуки для работы с франшизами через Electron API
 *
 * Загрузка связанных аниме из Shikimori и синхронизация с локальной БД
 */

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { syncAnimeRelations } from '@/app/_actions/anime-relation.action'
import { findExistingFranchiseByRelatedShikimoriIds } from '@/app/_actions/anime.action'
import { upsertFranchiseByRootShikimoriId } from '@/app/_actions/franchise.action'
import type { RelationKind } from '@/generated/prisma'

import type { RelatedAnimeData } from '../../types/electron'
import { useFindManyAnimeRelation, useUpdateAnime } from '../hooks'

/** Результат загрузки связей из Shikimori */
export interface FetchRelatedResult {
  sourceAnime: { shikimoriId: number; name: string }
  relatedAnimes: RelatedAnimeData[]
}

/**
 * Хук для загрузки связанных аниме из Shikimori API
 */
export function useFetchRelated() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRelated = useCallback(async (shikimoriId: number): Promise<FetchRelatedResult | null> => {
    if (!window.electronAPI?.franchise) {
      setError('Electron API не доступен')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.franchise.fetchRelated(shikimoriId)

      if (!result.success || !result.data) {
        setError(result.error || 'Не удалось загрузить связи')
        return null
      }

      return result.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { fetchRelated, isLoading, error }
}

/**
 * Хук для синхронизации связей аниме с БД
 */
export function useSyncRelations() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchRelated } = useFetchRelated()
  const updateAnime = useUpdateAnime()
  const queryClient = useQueryClient()

  /**
   * Синхронизировать связи для аниме
   * @param animeId - ID аниме в локальной БД
   * @param shikimoriId - ID аниме на Shikimori
   */
  const syncRelationsForAnime = useCallback(
    async (animeId: string, shikimoriId: number): Promise<boolean> => {
      setIsSyncing(true)
      setError(null)

      try {
        // 1. Загружаем связи из Shikimori
        const fetchResult = await fetchRelated(shikimoriId)
        if (!fetchResult) {
          return false
        }

        // 2. Синхронизируем связи (deleteMany + createMany в одной транзакции)
        const relations = fetchResult.relatedAnimes.map((related) => ({
          targetShikimoriId: related.shikimoriId,
          relationKind: related.relationKind as RelationKind,
        }))

        await syncAnimeRelations(animeId, relations)

        // 3. Определяем франшизу если есть связи
        if (fetchResult.relatedAnimes.length > 0) {
          // Собираем shikimoriId всех связанных аниме
          const relatedShikimoriIds = fetchResult.relatedAnimes.map((r) => r.shikimoriId)

          // Проверяем, есть ли уже франшиза у связанных аниме в библиотеке
          let franchiseId = await findExistingFranchiseByRelatedShikimoriIds(relatedShikimoriIds)

          if (!franchiseId) {
            // Франшизы нет — создаём новую
            // Используем минимальный shikimoriId из графа как стабильный ключ
            const rootShikimoriId = Math.min(shikimoriId, ...relatedShikimoriIds)
            const franchise = await upsertFranchiseByRootShikimoriId(rootShikimoriId, {
              name: fetchResult.sourceAnime.name,
            })
            franchiseId = franchise.id
          }

          // Привязываем аниме к франшизе и отмечаем время проверки связей
          await updateAnime.mutateAsync({
            where: { id: animeId },
            data: {
              franchiseId,
              relationsCheckedAt: new Date(),
            },
          })
        } else {
          // Связей нет, но мы проверили — отмечаем время проверки
          await updateAnime.mutateAsync({
            where: { id: animeId },
            data: {
              relationsCheckedAt: new Date(),
            },
          })
        }

        // 4. Инвалидируем кэш
        await queryClient.invalidateQueries({ queryKey: ['anime'] })
        await queryClient.invalidateQueries({ queryKey: ['animeRelation'] })
        await queryClient.invalidateQueries({ queryKey: ['franchise'] })

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ошибка синхронизации'
        setError(message)
        return false
      } finally {
        setIsSyncing(false)
      }
    },
    [fetchRelated, updateAnime, queryClient]
  )

  return { syncRelations: syncRelationsForAnime, isSyncing, error }
}

/**
 * Хук для получения связанных аниме из локальной БД
 */
export function useAnimeRelations(animeId: string | undefined) {
  return useFindManyAnimeRelation(
    animeId
      ? {
          where: { sourceAnimeId: animeId },
          orderBy: { createdAt: 'asc' },
          include: {
            targetAnime: {
              select: {
                id: true,
                name: true,
                year: true,
                posterCid: true,
                poster: { select: { cid: true } },
              },
            },
          },
        }
      : undefined
  )
}

/**
 * Проверить, загружено ли связанное аниме в библиотеку
 */
export function useCheckRelatedInLibrary(
  relations: Array<{ targetShikimoriId: number; targetAnimeId: string | null }>
) {
  // Подсчитываем загруженные
  const loadedCount = relations.filter((r) => r.targetAnimeId !== null).length
  const totalCount = relations.length

  return {
    loadedCount,
    totalCount,
    allLoaded: loadedCount === totalCount,
    progress: totalCount > 0 ? loadedCount / totalCount : 0,
  }
}
