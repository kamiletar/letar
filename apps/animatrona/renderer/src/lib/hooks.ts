'use client'

/**
 * React Query хуки для CRUD операций
 * Все операции используют Server Actions + TanStack Query
 *
 * @remarks
 * Хуки созданы с использованием фабрик из hooks-factory.ts
 * для устранения дублирования кода
 */

import {
  createAnimeRelation,
  createManyAnimeRelations,
  deleteAnimeRelation,
  deleteManyAnimeRelations,
  findManyAnimeRelations,
  updateAnimeRelation,
} from '@/app/_actions/anime-relation.action'
import {
  type AnimeIpfsSizes,
  createAnime,
  deleteAnime,
  findManyAnime,
  findUniqueAnime,
  getAnimeIpfsSizes,
  updateAnime,
  upsertAnimeByShikimoriId,
} from '@/app/_actions/anime.action'
import { createAudioTrack, deleteAudioTrack, updateAudioTrack } from '@/app/_actions/audio-track.action'
import {
  createEncodingProfile,
  deleteEncodingProfile,
  duplicateEncodingProfile,
  findFirstEncodingProfile,
  findManyEncodingProfiles,
  findUniqueEncodingProfile,
  setDefaultEncodingProfile,
  updateEncodingProfile,
} from '@/app/_actions/encoding-profile.action'
import {
  createEpisode,
  deleteEpisode,
  findManyEpisodes,
  findUniqueEpisode,
  updateEpisode,
  upsertEpisode,
} from '@/app/_actions/episode.action'
// v0.28.0: Studio/Fandubber модели удалены, данные теперь в AnimeManifest
import { createFile, findManyFiles, upsertFile } from '@/app/_actions/file.action'
import {
  type AvailableItem,
  type FilterCounts,
  getAvailableGenres,
  getFilterCounts,
  getLocalDubGroups,
} from '@/app/_actions/filter-counts.action'
import {
  createFranchise,
  deleteFranchise,
  findManyFranchises,
  findUniqueFranchise,
  updateFranchise,
  upsertFranchiseByRootShikimoriId,
} from '@/app/_actions/franchise.action'
// v0.28.0: createGenre/findManyGenres удалены, жанры сохраняются через saveGenresAndThemes
import { createSeason, findManySeasons, upsertSeason } from '@/app/_actions/season.action'
import {
  getSettings,
  getSettingsWithProfile,
  setDefaultProfile,
  updateSettings,
  upsertSettings,
} from '@/app/_actions/settings.action'
import { createSubtitleFont } from '@/app/_actions/subtitle-font.action'
import { createSubtitleTrack, deleteSubtitleTrack, updateSubtitleTrack } from '@/app/_actions/subtitle-track.action'
import { findUniqueWatchProgress, upsertWatchProgress } from '@/app/_actions/watch-progress.action'
import type { Prisma } from '@/generated/prisma'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCreateHook,
  createCRUDHooks,
  createDeleteHook,
  createFindManyHook,
  createUpdateHook,
} from './hooks-factory'

// ============================================================
// Anime — полный CRUD через фабрику
// ============================================================

const animeHooks = createCRUDHooks({
  keys: { list: 'animes', single: 'anime' },
  actions: {
    findMany: findManyAnime,
    findUnique: findUniqueAnime,
    create: createAnime,
    update: updateAnime,
    delete: deleteAnime,
  },
  // Инвалидация episode при обновлении anime, чтобы свежие данные
  // (например, lastSelectedAudioDubGroup) были доступны при смене эпизода
  invalidation: {
    additional: ['episode', 'filterCounts'],
  },
})

export const useFindManyAnime = animeHooks.useFindMany
export const useFindUniqueAnime = animeHooks.useFindUnique
export const useCreateAnime = animeHooks.useCreate
export const useUpdateAnime = animeHooks.useUpdate
export const useDeleteAnime = animeHooks.useDelete

/** Query хук для суммарных размеров IPFS-контента всех аниме (агрегация одним SQL) */
export function useAnimeIpfsSizes() {
  return useQuery({
    queryKey: ['animeIpfsSizes'],
    queryFn: () => getAnimeIpfsSizes(),
    staleTime: 5 * 60 * 1000,
  })
}

export type { AnimeIpfsSizes }

/** Mutation хук для upsert Anime по shikimoriId */
export function useUpsertAnime() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ data }: { data: Prisma.AnimeUncheckedCreateInput }) => upsertAnimeByShikimoriId(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animes'] })
    },
  })
}

// ============================================================
// Episode — полный CRUD через фабрику
// ============================================================

const episodeHooks = createCRUDHooks({
  keys: { list: 'episodes', single: 'episode' },
  actions: {
    findMany: findManyEpisodes,
    findUnique: findUniqueEpisode,
    create: createEpisode,
    update: updateEpisode,
    delete: deleteEpisode,
  },
})

export const useFindManyEpisode = episodeHooks.useFindMany
export const useFindUniqueEpisode = episodeHooks.useFindUnique
export const useCreateEpisode = episodeHooks.useCreate
export const useUpdateEpisode = episodeHooks.useUpdate
export const useDeleteEpisode = episodeHooks.useDelete

/** Mutation хук для upsert Episode по animeId + number */
export function useUpsertEpisode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ data }: { data: Prisma.EpisodeUncheckedCreateInput }) => upsertEpisode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
    },
  })
}

// ============================================================
// Franchise — полный CRUD через фабрику
// ============================================================

const franchiseHooks = createCRUDHooks({
  keys: { list: 'franchises', single: 'franchise' },
  actions: {
    findMany: findManyFranchises,
    findUnique: findUniqueFranchise,
    create: createFranchise,
    update: updateFranchise,
    delete: deleteFranchise,
  },
})

export const useFindManyFranchise = franchiseHooks.useFindMany
export const useFindUniqueFranchise = franchiseHooks.useFindUnique
export const useCreateFranchise = franchiseHooks.useCreate
export const useUpdateFranchise = franchiseHooks.useUpdate
export const useDeleteFranchise = franchiseHooks.useDelete

/** Mutation хук для upsert Franchise по rootShikimoriId */
export function useUpsertFranchise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ rootShikimoriId, name }: { rootShikimoriId: number; name: string }) =>
      upsertFranchiseByRootShikimoriId(rootShikimoriId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchises'] })
    },
  })
}

// ============================================================
// EncodingProfile — CRUD + специальные операции
// ============================================================

const encodingProfileHooks = createCRUDHooks({
  keys: { list: 'encodingProfiles', single: 'encodingProfile' },
  actions: {
    findMany: findManyEncodingProfiles,
    findUnique: findUniqueEncodingProfile,
    create: createEncodingProfile,
    update: updateEncodingProfile,
    delete: deleteEncodingProfile,
  },
})

export const useFindManyEncodingProfile = encodingProfileHooks.useFindMany
export const useFindUniqueEncodingProfile = encodingProfileHooks.useFindUnique
export const useCreateEncodingProfile = encodingProfileHooks.useCreate
export const useUpdateEncodingProfile = encodingProfileHooks.useUpdate
export const useDeleteEncodingProfile = encodingProfileHooks.useDelete

/** Query хук для useFindFirst EncodingProfile (поиск по умолчанию) */
export function useFindFirstEncodingProfile(
  args?: Prisma.EncodingProfileFindFirstArgs,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['encodingProfileFirst', args],
    queryFn: () => findFirstEncodingProfile(args),
    enabled: options?.enabled,
  })
}

/** Mutation хук для дублирования EncodingProfile */
export function useDuplicateEncodingProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName?: string }) => duplicateEncodingProfile(id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encodingProfiles'] })
    },
  })
}

/** Mutation хук для установки профиля по умолчанию */
export function useSetDefaultEncodingProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => setDefaultEncodingProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encodingProfiles'] })
      queryClient.invalidateQueries({ queryKey: ['encodingProfileFirst'] })
    },
  })
}

// ============================================================
// AnimeRelation — CRUD + bulk операции
// ============================================================

export const useFindManyAnimeRelation = createFindManyHook({
  queryKey: 'animeRelations',
  queryFn: findManyAnimeRelations,
})

export const useCreateAnimeRelation = createCreateHook({
  listKey: 'animeRelations',
  mutationFn: createAnimeRelation,
})

export const useUpdateAnimeRelation = createUpdateHook({
  listKey: 'animeRelations',
  singleKey: 'animeRelation',
  mutationFn: updateAnimeRelation,
})

export const useDeleteAnimeRelation = createDeleteHook({
  listKey: 'animeRelations',
  mutationFn: deleteAnimeRelation,
})

/** Mutation хук для создания множества AnimeRelation */
export function useCreateManyAnimeRelation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ data }: { data: Prisma.AnimeRelationCreateManyInput[] }) => createManyAnimeRelations(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animeRelations'] })
    },
  })
}

/** Mutation хук для удаления множества AnimeRelation */
export function useDeleteManyAnimeRelation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ where }: { where: Prisma.AnimeRelationWhereInput }) => deleteManyAnimeRelations(where),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animeRelations'] })
    },
  })
}

// v0.28.0: Genre хуки удалены, жанры сохраняются через saveGenresAndThemes
// Для списка жанров используй useAvailableGenres()

// ============================================================
// Season — findMany + create
// ============================================================

export const useFindManySeason = createFindManyHook({
  queryKey: 'seasons',
  queryFn: findManySeasons,
})

export const useCreateSeason = createCreateHook({
  listKey: 'seasons',
  mutationFn: createSeason,
})

export const useUpsertSeason = createCreateHook({
  listKey: 'seasons',
  mutationFn: upsertSeason,
})

// ============================================================
// v0.28.0: Studio/Fandubber модели удалены, данные теперь в AnimeManifest
// useFindManyStudio и useFindManyFandubber были удалены

// ============================================================
// File — create, upsert, findMany
// ============================================================

export const useFindManyFile = createFindManyHook({
  queryKey: 'files',
  queryFn: findManyFiles,
})

export const useCreateFile = createCreateHook({
  listKey: 'files',
  mutationFn: createFile,
})

/** Mutation хук для upsert File (создание или обновление по CID) */
export function useUpsertFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ data }: { data: Prisma.FileCreateInput }) => upsertFile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

// ============================================================
// AudioTrack — с predicate инвалидацией episode
// ============================================================

export const useCreateAudioTrack = createCreateHook({
  listKey: 'audioTracks',
  mutationFn: createAudioTrack,
})

export const useUpdateAudioTrack = createUpdateHook({
  listKey: 'audioTracks',
  singleKey: 'audioTrack',
  mutationFn: updateAudioTrack,
  predicateInvalidation: 'episode',
})

export const useDeleteAudioTrack = createDeleteHook({
  listKey: 'audioTracks',
  mutationFn: deleteAudioTrack,
  predicateInvalidation: 'episode',
})

// ============================================================
// SubtitleTrack — с predicate инвалидацией episode
// ============================================================

export const useCreateSubtitleTrack = createCreateHook({
  listKey: 'subtitleTracks',
  mutationFn: createSubtitleTrack,
})

export const useUpdateSubtitleTrack = createUpdateHook({
  listKey: 'subtitleTracks',
  singleKey: 'subtitleTrack',
  mutationFn: updateSubtitleTrack,
  predicateInvalidation: 'episode',
})

export const useDeleteSubtitleTrack = createDeleteHook({
  listKey: 'subtitleTracks',
  mutationFn: deleteSubtitleTrack,
  predicateInvalidation: 'episode',
})

// ============================================================
// SubtitleFont — create only с дополнительной инвалидацией
// ============================================================

export const useCreateSubtitleFont = createCreateHook({
  listKey: 'subtitleFonts',
  mutationFn: createSubtitleFont,
  additionalInvalidation: ['subtitleTracks'],
})

// ============================================================
// WatchProgress — composite key (animeId_episodeId)
// ============================================================

/** Query хук для useFindUnique WatchProgress */
export function useFindUniqueWatchProgress(
  args: { where: { animeId_episodeId: { animeId: string; episodeId: string } }; include?: Prisma.WatchProgressInclude },
  options?: { enabled?: boolean }
) {
  const { animeId, episodeId } = args.where.animeId_episodeId
  return useQuery({
    queryKey: ['watchProgress', animeId, episodeId],
    queryFn: () => findUniqueWatchProgress(animeId, episodeId, args.include),
    enabled: options?.enabled,
  })
}

/** Mutation хук для upsert WatchProgress */
export function useUpsertWatchProgress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      where,
      create,
      update,
    }: {
      where: { animeId_episodeId: { animeId: string; episodeId: string } }
      create: Prisma.WatchProgressUncheckedCreateInput
      update: Prisma.WatchProgressUncheckedUpdateInput
    }) => {
      const { animeId, episodeId } = where.animeId_episodeId
      return upsertWatchProgress(animeId, episodeId, { ...create, ...update })
    },
    onSuccess: (_result, variables) => {
      const { animeId, episodeId } = variables.where.animeId_episodeId
      // Инвалидируем кэш watchProgress
      queryClient.invalidateQueries({ queryKey: ['watchProgress', animeId, episodeId] })
      // Инвалидируем кэш anime чтобы обновить кнопку "Продолжить смотреть"
      queryClient.invalidateQueries({ queryKey: ['anime', animeId] })
    },
    onError: (error) => {
      console.error('[useUpsertWatchProgress] Error:', error)
    },
  })
}

// ============================================================
// Settings — singleton pattern
// ============================================================

/** Query хук для useFindUnique Settings */
export function useFindUniqueSettings(
  args: { where: { id: string }; include?: object },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['settings', args.where.id, args.include],
    queryFn: () => (args.include ? getSettingsWithProfile() : getSettings()),
    enabled: options?.enabled,
  })
}

/** Mutation хук для upsert Settings */
export function useUpsertSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      create: _create,
      update,
    }: {
      create: Prisma.SettingsCreateInput
      update: Prisma.SettingsUpdateInput
    }) => upsertSettings(update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

/** Mutation хук для обновления Settings */
export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ where: _where, data }: { where: { id: string }; data: Prisma.SettingsUpdateInput }) =>
      updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

/** Mutation хук для установки профиля по умолчанию в Settings */
export function useSetDefaultProfileInSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (profileId: string | null) => setDefaultProfile(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

// ============================================================
// FilterCounts — faceted search counts
// ============================================================

/** Query хук для получения счётчиков фильтров (faceted search) */
export function useFilterCounts() {
  return useQuery({
    queryKey: ['filterCounts'],
    queryFn: () => getFilterCounts(),
    staleTime: 30_000, // 30 секунд — данные меняются редко
    gcTime: 60_000, // 1 минута в кэше
  })
}

export type { FilterCounts }

// ============================================================
// AvailableFilters — только сущности, которые есть в библиотеке
// ============================================================

/** Query хук для получения жанров, которые есть в библиотеке */
export function useAvailableGenres() {
  return useQuery({
    queryKey: ['availableGenres'],
    queryFn: () => getAvailableGenres(),
    staleTime: 60_000, // 1 минута
    gcTime: 300_000, // 5 минут в кэше
  })
}

// v0.28.0: useAvailableStudios удалён — студии теперь в AnimeManifest (IPFS)

/** Query хук для получения локальных озвучек из AudioTrack.dubGroup */
export function useLocalDubGroups() {
  return useQuery({
    queryKey: ['localDubGroups'],
    queryFn: () => getLocalDubGroups(),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}

// v0.28.0: useAvailableDirectors удалён — режиссёры теперь в AnimeManifest (IPFS)

export type { AvailableItem }
