'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { SortOption } from '../types'

/** Ключ для sessionStorage */
const FILTERS_STORAGE_KEY = 'animatrona:library:filters'

/**
 * Параметры фильтров из URL
 */
export interface FilterParams {
  search: string
  status: string
  yearMin: string
  yearMax: string
  genre: string
  studio: string
  fandubber: string
  director: string
  episodesMin: string
  episodesMax: string
  resolution: string
  bitDepth: string
  sortBy: SortOption
  watchStatus: string
  pinnedStatus: string
  ageRatingFilter: string
}

/** Маппинг названий параметров (внутренний → URL) */
const PARAM_MAP: Record<keyof FilterParams, string> = {
  search: 'q',
  status: 'status',
  yearMin: 'yearMin',
  yearMax: 'yearMax',
  genre: 'genre',
  studio: 'studio',
  fandubber: 'fandubber',
  director: 'director',
  episodesMin: 'epMin',
  episodesMax: 'epMax',
  resolution: 'res',
  bitDepth: 'bit',
  sortBy: 'sort',
  watchStatus: 'watch',
  pinnedStatus: 'pinned',
  ageRatingFilter: 'age',
}

/**
 * Хук для синхронизации фильтров с URL параметрами
 * Автоматически сохраняет фильтры в sessionStorage и восстанавливает при возврате
 *
 * @example
 * ```tsx
 * const { params, setParam, setParams, resetParams } = useFilterParams()
 *
 * // Читать значение
 * const status = params.status
 *
 * // Обновить один параметр
 * setParam('status', 'ONGOING')
 *
 * // Обновить несколько параметров
 * setParams({ status: 'ONGOING', year: '2024' })
 *
 * // Сбросить все
 * resetParams()
 * ```
 */
export function useFilterParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isInitialized = useRef(false)

  // Читаем текущие параметры из URL
  const params = useMemo<FilterParams>(
    () => ({
      search: searchParams.get('q') || '',
      status: searchParams.get('status') || '',
      yearMin: searchParams.get('yearMin') || '',
      yearMax: searchParams.get('yearMax') || '',
      genre: searchParams.get('genre') || '',
      studio: searchParams.get('studio') || '',
      fandubber: searchParams.get('fandubber') || '',
      director: searchParams.get('director') || '',
      episodesMin: searchParams.get('epMin') || '',
      episodesMax: searchParams.get('epMax') || '',
      resolution: searchParams.get('res') || '',
      bitDepth: searchParams.get('bit') || '',
      sortBy: (searchParams.get('sort') as SortOption) || '-updatedAt',
      watchStatus: searchParams.get('watch') || '',
      pinnedStatus: searchParams.get('pinned') || '',
      ageRatingFilter: searchParams.get('age') || '',
    }),
    [searchParams],
  )

  // Восстановление фильтров из sessionStorage при первом рендере (если URL пустой)
  useEffect(() => {
    if (isInitialized.current) {
      return
    }
    isInitialized.current = true

    // Если в URL уже есть параметры — не восстанавливаем
    if (searchParams.toString()) {
      return
    }

    try {
      const saved = sessionStorage.getItem(FILTERS_STORAGE_KEY)
      if (!saved) {
        return
      }

      const savedParams = JSON.parse(saved) as Partial<FilterParams>

      // Проверяем есть ли что восстанавливать (не пустые значения)
      const hasFilters = Object.entries(savedParams).some(([key, value]) => {
        if (key === 'sortBy') {
          return value && value !== '-updatedAt'
        }
        return !!value
      })

      if (!hasFilters) {
        return
      }

      // Восстанавливаем URL из сохранённых фильтров
      const urlParams = new URLSearchParams()
      for (const [key, value] of Object.entries(savedParams)) {
        if (!value) {
          continue
        }
        if (key === 'sortBy' && value === '-updatedAt') {
          continue
        } // Не добавляем дефолтную сортировку
        const urlKey = PARAM_MAP[key as keyof FilterParams]
        if (urlKey) {
          urlParams.set(urlKey, value)
        }
      }

      const query = urlParams.toString()
      if (query) {
        router.replace(`${pathname}?${query}`, { scroll: false })
      }
    } catch {
      // Игнорируем ошибки парсинга
    }
  }, [pathname, router, searchParams])

  // Сохранение фильтров в sessionStorage при изменении
  useEffect(() => {
    // Не сохраняем при первом рендере до инициализации
    if (!isInitialized.current) {
      return
    }

    try {
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(params))
    } catch {
      // Игнорируем ошибки записи
    }
  }, [params])

  // Обновить URL с новыми параметрами
  const updateUrl = useCallback(
    (newParams: Partial<FilterParams>) => {
      const current = new URLSearchParams(searchParams.toString())

      // Обновляем параметры
      for (const [key, value] of Object.entries(newParams)) {
        const urlKey = PARAM_MAP[key as keyof FilterParams]
        if (value && value !== '-updatedAt') {
          // Не добавляем дефолтную сортировку
          current.set(urlKey, value)
        } else {
          current.delete(urlKey)
        }
      }

      const query = current.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  // Обновить один параметр
  const setParam = useCallback(
    <K extends keyof FilterParams>(key: K, value: FilterParams[K]) => {
      updateUrl({ [key]: value })
    },
    [updateUrl],
  )

  // Обновить несколько параметров
  const setParams = useCallback(
    (newParams: Partial<FilterParams>) => {
      updateUrl(newParams)
    },
    [updateUrl],
  )

  // Сбросить все параметры (и очистить sessionStorage)
  const resetParams = useCallback(() => {
    try {
      sessionStorage.removeItem(FILTERS_STORAGE_KEY)
    } catch {
      // Игнорируем ошибки
    }
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  return {
    params,
    setParam,
    setParams,
    resetParams,
  }
}
