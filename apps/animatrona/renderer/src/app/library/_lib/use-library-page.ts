'use client'

/**
 * Хук со всей логикой страницы библиотеки
 * Управляет state, фильтрами, запросами и handlers
 *
 * v0.28.9: Переход на клиентский поиск Fuse.js через useSearchIds
 */

import { useLocalStorage } from '@letar/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useSearchIds } from '@/app/_hooks/use-search'
import { useDebounce, useFilterParams } from '@/components/library'
import { toaster } from '@/components/ui/toaster'
import type { Prisma, WatchStatus } from '@/generated/prisma'
import {
  useAnimeIpfsSizes,
  useAvailableGenres,
  useCountAnime,
  useFilterCounts,
  useFindManyAnime,
  useInfiniteFindManyAnime,
  useLocalDubGroups,
  useUpdateAnime,
} from '@/lib/hooks'

import { groupAnimeByFranchise } from './group-anime-by-franchise'
import type { AnimeWithFranchise, ViewMode } from './types'
import { VIEW_MODE_STORAGE_KEY } from './types'

/**
 * Основной хук страницы библиотеки
 */
export function useLibraryPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const updateAnimeMutation = useUpdateAnime()

  // ===== Диалоги =====
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isBatchPublishOpen, setIsBatchPublishOpen] = useState(false)
  const [isBatchReencodeOpen, setIsBatchReencodeOpen] = useState(false)
  const [selectedAnimeId, setSelectedAnimeId] = useState<string | null>(null)

  // Режим множественного выбора — объявлен здесь (а не рядом с остальным batch selection state
  // ниже), потому что от него зависит needsFullData при построении запросов аниме
  const [selectionMode, setSelectionMode] = useState(false)

  // Drag & Drop импорт
  const [droppedFolderPath, setDroppedFolderPath] = useState<string | null>(null)

  // Открытие ImportWizard по query параметру (из WelcomeDialog)
  // Используем window.location вместо useSearchParams() — убираем дублирующий хук,
  // который уже вызывается внутри useFilterParams(). Снижает вероятность React error #310.
  const checkedOpenImport = useRef(false)
  useEffect(() => {
    if (checkedOpenImport.current) {
      return
    }
    checkedOpenImport.current = true
    const params = new URLSearchParams(window.location.search)
    if (params.get('openImport') === 'true') {
      setIsImportOpen(true)
      router.replace('/library', { scroll: false })
    }
  }, [router])

  /** Обработчик drop папки */
  const handleFolderDrop = useCallback((folderPath: string) => {
    setDroppedFolderPath(folderPath)
    setIsImportOpen(true)
  }, [])

  /** Обработчик закрытия диалога импорта */
  const handleImportOpenChange = useCallback((open: boolean) => {
    setIsImportOpen(open)
    // Сбрасываем droppedFolderPath при закрытии
    if (!open) {
      setDroppedFolderPath(null)
    }
  }, [])

  // ===== Режим отображения =====
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>(VIEW_MODE_STORAGE_KEY, 'individual')

  const handleViewModeChange = useCallback(
    (details: { value: string | null }) => {
      const mode = (details.value || 'individual') as ViewMode
      setViewMode(mode)
    },
    [setViewMode],
  )

  // ===== URL sync для фильтров =====
  const { params: urlParams, setParam, setParams, resetParams } = useFilterParams()

  // Локальный state для поиска (с debounce)
  const [searchInput, setSearchInput] = useState(urlParams.search)
  const debouncedSearch = useDebounce(searchInput, 250) // 250ms debounce для поиска

  // Клиентский поиск через Fuse.js — возвращает ID аниме для WHERE IN
  const searchIds = useSearchIds(debouncedSearch, 0) // 0ms — debounce уже применён выше

  // Синхронизация debouncedSearch с URL
  useEffect(() => {
    if (debouncedSearch !== urlParams.search) {
      setParam('search', debouncedSearch)
    }
  }, [debouncedSearch, urlParams.search, setParam])

  // Синхронизация URL → локальный state при навигации
  // Намеренно исключаем searchInput и debouncedSearch из deps — иначе бесконечный цикл
  useEffect(() => {
    if (urlParams.search !== searchInput && urlParams.search !== debouncedSearch) {
      setSearchInput(urlParams.search)
    }
  }, [urlParams.search])

  // ===== Данные для фильтров =====
  const { data: genresData } = useAvailableGenres()
  // v0.28.0: useAvailableStudios удалён — студии теперь в AnimeManifest (IPFS)
  const { data: dubGroupsData } = useLocalDubGroups()
  // v0.28.0: useAvailableDirectors удалён — режиссёры теперь в AnimeManifest (IPFS)

  // Faceted counts для фильтров
  const { data: filterCounts, isLoading: isLoadingCounts } = useFilterCounts()

  // ===== Загрузка аниме с фильтрами =====
  const {
    status,
    yearMin,
    yearMax,
    genre,
    studio,
    fandubber,
    director,
    episodesMin,
    episodesMax,
    resolution,
    bitDepth,
    sortBy,
    watchStatus: watchStatusFilter,
    pinnedStatus: pinnedStatusFilter,
    reuploadStatus: reuploadStatusFilter,
    ageRatingFilter,
  } = urlParams

  // WHERE — общий для пагинированного запроса, полного запроса и count
  const whereClause: Prisma.AnimeWhereInput = useMemo(
    () => ({
      // FTS5 поиск через searchAnimeIds
      ...(searchIds !== null && {
        id: { in: searchIds },
      }),
      ...(status && { status: status as 'ONGOING' | 'COMPLETED' | 'ANNOUNCED' }),
      // Год — диапазон от-до
      ...((yearMin || yearMax) && {
        year: {
          ...(yearMin && { gte: parseInt(yearMin) }),
          ...(yearMax && { lte: parseInt(yearMax) }),
        },
      }),
      ...(genre && {
        genres: {
          some: { genreId: genre },
        },
      }),
      // Расширенные фильтры
      ...(studio && {
        studios: {
          some: { studioId: studio },
        },
      }),
      // Озвучка — ищем через локальные аудиодорожки (AudioTrack.dubGroup)
      ...(fandubber && {
        episodes: {
          some: {
            audioTracks: {
              some: { dubGroup: fandubber },
            },
          },
        },
      }),
      // Режиссёр
      ...(director && {
        persons: {
          some: {
            personId: director,
            role: 'DIRECTOR',
          },
        },
      }),
      ...((episodesMin || episodesMax) && {
        episodeCount: {
          ...(episodesMin && { gte: parseInt(episodesMin) }),
          ...(episodesMax && { lte: parseInt(episodesMax) }),
        },
      }),
      // Фильтры качества
      ...(resolution === '4k' && {
        episodes: { some: { videoHeight: { gte: 2160 } } },
      }),
      ...(resolution === '1080p' && {
        episodes: { some: { AND: [{ videoHeight: { gte: 1080 } }, { videoHeight: { lt: 2160 } }] } },
      }),
      ...(resolution === '720p' && {
        episodes: { some: { videoHeight: { lt: 1080 } } },
      }),
      ...(bitDepth === '10' && {
        episodes: { some: { videoBitDepth: { gte: 10 } } },
      }),
      ...(bitDepth === '8' && {
        episodes: { some: { videoBitDepth: 8 } },
      }),
      // Статус просмотра
      ...(watchStatusFilter && {
        watchStatus: watchStatusFilter as WatchStatus,
      }),
      // Хранение
      ...(pinnedStatusFilter === 'local' && { pinnedLocally: true }),
      ...(pinnedStatusFilter === 'remote' && { pinnedLocally: false }),
      // Требует перезаливки (утраченный pinner-сервер)
      ...(reuploadStatusFilter === 'needs' && { needsReupload: true }),
      ...(reuploadStatusFilter === 'done' && { needsReupload: false }),
      // Возрастной рейтинг
      ...(ageRatingFilter === 'kids' && { ageRating: { in: ['g', 'pg', 'pg_13'] } }),
      ...(ageRatingFilter === 'teen' && { ageRating: { in: ['r'] } }),
      ...(ageRatingFilter === 'adult' && { ageRating: { in: ['r_plus', 'rx'] } }),
    }),
    [
      searchIds,
      status,
      yearMin,
      yearMax,
      genre,
      studio,
      fandubber,
      director,
      episodesMin,
      episodesMax,
      resolution,
      bitDepth,
      watchStatusFilter,
      pinnedStatusFilter,
      reuploadStatusFilter,
      ageRatingFilter,
    ],
  )

  // SELECT — общий для пагинированного и полного запроса (не зависит от фильтров)
  const selectClause = useMemo(
    () =>
      ({
        id: true,
        name: true,
        originalName: true,
        year: true,
        status: true,
        rating: true,
        watchStatus: true,
        directoryCid: true,
        trackerPublishedAt: true,
        trackerPublishedCid: true,
        folderPath: true,
        shikimoriId: true,
        pinnedLocally: true,
        needsReupload: true,
        ageRating: true,
        poster: { select: { cid: true } },
        genres: {
          include: {
            genre: true,
          },
        },
        franchise: true,
        // Все связи (нужны для графа группировки по connected components)
        sourceRelations: {
          select: {
            id: true,
            targetShikimoriId: true,
            targetAnimeId: true,
            relationKind: true,
          },
        },
        _count: {
          select: { episodes: true },
        },
      }) satisfies Prisma.AnimeSelect,
    [],
  )

  // ORDER BY
  const orderByClause = useMemo(() => {
    switch (sortBy) {
      case 'title':
        return { name: 'asc' as const }
      case '-title':
        return { name: 'desc' as const }
      case '-updatedAt':
        return { updatedAt: 'desc' as const }
      case '-createdAt':
        return { createdAt: 'desc' as const }
      case 'year':
        return { year: 'asc' as const }
      case '-year':
        return { year: 'desc' as const }
      case '-rating':
        return { rating: 'desc' as const }
      case '-episodeCount':
        return { episodeCount: 'desc' as const }
      case '-watchedAt':
        return { watchedAt: { sort: 'desc' as const, nulls: 'last' as const } }
      default:
        return { updatedAt: 'desc' as const }
    }
  }, [sortBy])

  // Полный набор нужен когда: франшизный режим (группировка по connected components требует
  // ВСЕХ тайтлов сразу, включая за пределами текущей "страницы" — см. groupAnimeByFranchise ниже),
  // режим множественного выбора (чтобы «Выбрать всё» реально выбирало всё, а не только
  // подгруженное), или открыт диалог пакетной публикации (публикует на трекер весь
  // отфильтрованный набор, а не только видимую часть)
  const needsFullData = viewMode === 'franchise' || selectionMode || isBatchPublishOpen

  // Пагинированный запрос (режим «По отдельности», обычный просмотр без выбора) —
  // не тянет весь список одним findMany, только видимые+overscan страницы
  const {
    data: infiniteAnimesData,
    isLoading: isLoadingInfinite,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteFindManyAnime(
    { where: whereClause, select: selectClause, orderBy: orderByClause },
    { enabled: !needsFullData },
  )

  // Полный запрос — только когда действительно нужен весь набор (см. needsFullData выше)
  const { data: fullAnimesData, isLoading: isLoadingFull } = useFindManyAnime(
    { where: whereClause, select: selectClause, orderBy: orderByClause },
    { enabled: needsFullData },
  )

  const animesData = needsFullData ? fullAnimesData : infiniteAnimesData?.pages.flat()
  const isLoading = needsFullData ? isLoadingFull : isLoadingInfinite

  // Общее количество тайтлов под текущим фильтром — для шапки и мобильного счётчика фильтров,
  // не зависит от того, сколько страниц уже подгружено
  const { data: totalCount } = useCountAnime(whereClause)

  // Обновить данные (после дедупликации/удаления/публикации) — инвалидирует все варианты
  // запроса аниме разом (полный, постраничный, count имеют общий префикс ключа 'animes')
  const refetch = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['animes'] }),
    [queryClient],
  )

  // Запрос для ВСЕХ shikimoriId (без фильтров) — нужен для корректной группировки по франшизам
  const { data: allAnimeShikimoriIds } = useFindManyAnime({
    select: { shikimoriId: true },
  })

  // Размеры IPFS-контента — отдельной агрегацией, не через выгрузку эпизодов с дорожками
  const { data: ipfsSizes } = useAnimeIpfsSizes()

  // Множество всех загруженных shikimoriId для передачи в groupAnimeByFranchise
  const allLoadedShikimoriIds = useMemo(
    () => new Set((allAnimeShikimoriIds || []).map((a) => a.shikimoriId).filter((id): id is number => id != null)),
    [allAnimeShikimoriIds],
  )

  // Преобразуем _count.episodes в episodeCount и подмешиваем размеры из агрегации.
  // genreNames считается здесь, а не в разметке сетки: новый массив на каждом рендере
  // обнулял бы React.memo у AnimeCard, а виртуализатор перерисовывает сетку на каждый тик скролла.
  const animes: AnimeWithFranchise[] = useMemo(
    () =>
      (animesData || []).map((anime) => {
        const sizes = ipfsSizes?.[anime.id]
        const genreNames = (anime as unknown as { genres?: Array<{ genre: { name: string } }> }).genres?.map(
          (g) => g.genre.name,
        )
        return {
          ...anime,
          episodeCount: (anime as unknown as { _count?: { episodes: number } })._count?.episodes ?? 0,
          genreNames,
          ipfsSizeBreakdown: sizes,
          totalIpfsSize: sizes ? sizes.video + sizes.audio + sizes.subtitles + sizes.fonts : 0,
        }
      }),
    [animesData, ipfsSizes],
  )

  const genres = genresData || []

  // Группировка аниме по франшизам
  const { franchiseGroups, standAloneAnimes } = useMemo(
    () => groupAnimeByFranchise(animes, allLoadedShikimoriIds),
    [animes, allLoadedShikimoriIds],
  )

  // ===== Handlers =====
  const handleReset = useCallback(() => {
    setSearchInput('')
    resetParams()
  }, [resetParams])

  const handleCardPlay = useCallback(
    (id: string) => {
      router.push(`/library/${id}`)
    },
    [router],
  )

  const handleCardExport = useCallback(
    (id: string) => {
      router.push(`/library/${id}?openExport=true`)
    },
    [router],
  )

  const handleCardRefreshMetadata = useCallback(
    (id: string) => {
      router.push(`/library/${id}`)
      toaster.info({ title: 'Откройте меню аниме и нажмите "Обновить метаданные"' })
    },
    [router],
  )

  const handleCardDelete = useCallback((id: string) => {
    setSelectedAnimeId(id)
    setIsDeleteDialogOpen(true)
  }, [])

  /**
   * Изменить статус просмотра аниме
   */
  const handleWatchStatusChange = useCallback(
    async (id: string, newStatus: WatchStatus) => {
      try {
        await updateAnimeMutation.mutateAsync({
          where: { id },
          data: { watchStatus: newStatus },
        })

        // Инвалидируем все связанные кэши
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['animes'] }),
          queryClient.invalidateQueries({ queryKey: ['filterCounts'] }),
          queryClient.invalidateQueries({ queryKey: ['searchable-anime'] }),
        ])

        toaster.success({ title: 'Статус обновлён' })
        // Немедленный push на трекер (не ждём 5-минутный полный sync)
        window.electronAPI?.tracker?.pushLibraryItem?.(id)
      } catch (error) {
        toaster.error({
          title: 'Ошибка',
          description: error instanceof Error ? error.message : 'Не удалось обновить статус',
        })
      }
    },
    [updateAnimeMutation, queryClient],
  )

  // ===== Batch selection =====
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBatchUpdating, setIsBatchUpdating] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; animeName: string } | null>(null)

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback((allIds: string[]) => {
    setSelectedIds((prev) => (prev.size === allIds.length ? new Set() : new Set(allIds)))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }, [])

  const handleBatchWatchStatus = useCallback(
    async (newStatus: WatchStatus) => {
      const ids = Array.from(selectedIds)
      if (!ids.length) {
        return
      }
      setIsBatchUpdating(true)
      try {
        await window.electronAPI?.tracker.batchUpdateWatchStatus({ animeIds: ids, watchStatus: newStatus })
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['animes'] }),
          queryClient.invalidateQueries({ queryKey: ['filterCounts'] }),
          queryClient.invalidateQueries({ queryKey: ['searchable-anime'] }),
        ])
        toaster.success({ title: `Статус обновлён для ${ids.length} аниме` })
        clearSelection()
      } catch (error) {
        toaster.error({
          title: 'Ошибка',
          description: error instanceof Error ? error.message : 'Не удалось обновить статус',
        })
      } finally {
        setIsBatchUpdating(false)
      }
    },
    [selectedIds, queryClient, clearSelection],
  )

  const handleBatchUnpin = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) {
      return
    }
    setIsBatchUpdating(true)
    setBatchProgress({ current: 0, total: ids.length, animeName: '' })
    const unsub = window.electronAPI?.tracker.onBatchUnpinProgress((p) => setBatchProgress(p))
    try {
      const result = await window.electronAPI?.tracker.batchUnpinAnime(ids)
      await queryClient.invalidateQueries({ queryKey: ['animes'] })
      toaster.success({
        title: `Откреплено ${result?.count ?? 0} аниме${
          (result?.failed ?? 0) > 0 ? `, ошибок: ${result!.failed}` : ''
        }`,
      })
      clearSelection()
    } catch (error) {
      toaster.error({ title: 'Ошибка', description: error instanceof Error ? error.message : 'Не удалось открепить' })
    } finally {
      unsub?.()
      setBatchProgress(null)
      setIsBatchUpdating(false)
    }
  }, [selectedIds, queryClient, clearSelection])

  // Получаем выбранное аниме для диалога удаления
  const selectedAnime = selectedAnimeId ? animes.find((a) => a.id === selectedAnimeId) : null

  // Проверка: пустая библиотека без фильтров?
  // totalCount, а не animes.length — при пагинации animes может быть пустым локально,
  // пока ещё не пришла первая страница, хотя тайтлы в библиотеке есть
  const isEmptyWithoutFilters = !isLoading
    && (totalCount ?? animes.length) === 0
    && !searchInput
    && !status
    && !yearMin
    && !yearMax
    && !genre
    && !studio
    && !fandubber
    && !director
    && !watchStatusFilter

  return {
    // State
    isImportOpen,
    setIsImportOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isBatchPublishOpen,
    setIsBatchPublishOpen,
    isBatchReencodeOpen,
    setIsBatchReencodeOpen,
    selectedAnimeId,
    setSelectedAnimeId,
    droppedFolderPath,
    viewMode,

    // Данные
    animes,
    totalCount: totalCount ?? animes.length,
    genres,
    franchiseGroups,
    standAloneAnimes,
    isLoading,
    isEmptyWithoutFilters,
    selectedAnime,

    // Infinite scroll (режим «По отдельности» без полной загрузки — см. needsFullData)
    hasNextPage: needsFullData ? false : (hasNextPage ?? false),
    fetchNextPage,
    isFetchingNextPage: needsFullData ? false : isFetchingNextPage,

    // Фильтры
    searchInput,
    setSearchInput,
    urlParams,
    setParam,
    setParams,
    filterCounts,
    isLoadingCounts,
    // v0.28.0: studiosData и directorsData удалены — данные теперь в AnimeManifest (IPFS)
    dubGroupsData: dubGroupsData || [],

    // Handlers
    handleFolderDrop,
    handleImportOpenChange,
    handleViewModeChange,
    handleReset,
    handleCardPlay,
    handleCardExport,
    handleCardRefreshMetadata,
    handleCardDelete,
    handleWatchStatusChange,
    refetch,

    // Batch selection
    selectionMode,
    setSelectionMode,
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    isBatchUpdating,
    batchProgress,
    handleBatchWatchStatus,
    handleBatchUnpin,
  }
}
