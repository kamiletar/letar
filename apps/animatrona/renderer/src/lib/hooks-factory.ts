'use client'

/**
 * Фабричные функции для создания TanStack Query хуков
 * Устраняет дублирование кода в hooks.ts
 */

import type { QueryKey, UseQueryOptions } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ============================================================
// Типы конфигураций
// ============================================================

/** Конфигурация для findMany хука */
export interface FindManyConfig<TArgs, TResult> {
  /** Ключ кэша для списка (например, 'animes') */
  queryKey: string
  /** Server Action для получения данных */
  queryFn: (args?: TArgs) => Promise<TResult>
}

/** Конфигурация для findUnique хука */
export interface FindUniqueConfig<TResult, TInclude = object> {
  /** Ключ кэша для единичного элемента (например, 'anime') */
  queryKey: string
  /** Server Action для получения данных по ID */
  queryFn: (id: string, include?: TInclude) => Promise<TResult | null>
}

/** Конфигурация для create мутации */
export interface CreateConfig<TData, TResult> {
  /** Ключ кэша списка для инвалидации */
  listKey: string
  /** Server Action для создания */
  mutationFn: (data: TData) => Promise<TResult>
  /** Дополнительные ключи для инвалидации */
  additionalInvalidation?: string[]
}

/** Конфигурация для update мутации */
export interface UpdateConfig<TData, TResult> {
  /** Ключ кэша списка для инвалидации */
  listKey: string
  /** Ключ кэша единичного элемента */
  singleKey: string
  /** Server Action для обновления */
  mutationFn: (id: string, data: TData) => Promise<TResult>
  /** Инвалидация по предикату (например, 'episode' для audioTrack) */
  predicateInvalidation?: string
  /** Дополнительные ключи для инвалидации */
  additionalInvalidation?: string[]
}

/** Конфигурация для delete мутации */
export interface DeleteConfig<TResult> {
  /** Ключ кэша списка для инвалидации */
  listKey: string
  /** Server Action для удаления */
  mutationFn: (id: string) => Promise<TResult>
  /** Инвалидация по предикату */
  predicateInvalidation?: string
  /** Дополнительные ключи для инвалидации */
  additionalInvalidation?: string[]
}

/** Полная CRUD конфигурация */
export interface CRUDConfig<
  TFindManyArgs,
  TFindManyResult,
  TFindUniqueResult,
  TInclude,
  TCreateData,
  TCreateResult,
  TUpdateData,
  TUpdateResult,
  TDeleteResult,
> {
  /** Ключи кэша */
  keys: {
    /** Ключ для списка (множественное число: 'animes') */
    list: string
    /** Ключ для единичного элемента (единственное число: 'anime') */
    single: string
  }
  /** Server Actions */
  actions: {
    findMany: (args?: TFindManyArgs) => Promise<TFindManyResult>
    findUnique: (id: string, include?: TInclude) => Promise<TFindUniqueResult | null>
    create: (data: TCreateData) => Promise<TCreateResult>
    update: (id: string, data: TUpdateData) => Promise<TUpdateResult>
    delete: (id: string) => Promise<TDeleteResult>
  }
  /** Опции инвалидации */
  invalidation?: {
    /** Инвалидация по предикату при update/delete */
    predicate?: string
    /** Дополнительные ключи */
    additional?: string[]
  }
}

// ============================================================
// Фабрики для Query хуков
// ============================================================

/**
 * Создаёт хук useFindMany для сущности
 *
 * @example
 * const useFindManyAnime = createFindManyHook({
 *   queryKey: 'animes',
 *   queryFn: findManyAnime,
 * })
 */
export function createFindManyHook<TArgs, TResult>(config: FindManyConfig<TArgs, TResult>) {
  return function useFindMany(args?: TArgs, options?: Omit<UseQueryOptions<TResult>, 'queryKey' | 'queryFn'>) {
    return useQuery({
      queryKey: [config.queryKey, args] as QueryKey,
      queryFn: () => config.queryFn(args),
      ...options,
    })
  }
}

/**
 * Создаёт хук useFindUnique для сущности
 *
 * @example
 * const useFindUniqueAnime = createFindUniqueHook({
 *   queryKey: 'anime',
 *   queryFn: findUniqueAnime,
 * })
 */
export function createFindUniqueHook<TResult, TInclude = object>(config: FindUniqueConfig<TResult, TInclude>) {
  return function useFindUnique(args: { where: { id: string }; include?: TInclude }, options?: { enabled?: boolean }) {
    return useQuery({
      queryKey: [config.queryKey, args.where.id, args.include] as QueryKey,
      queryFn: () => config.queryFn(args.where.id, args.include),
      enabled: options?.enabled,
    })
  }
}

// ============================================================
// Фабрики для Mutation хуков
// ============================================================

/**
 * Создаёт хук useCreate для сущности
 *
 * @example
 * const useCreateAnime = createCreateHook({
 *   listKey: 'animes',
 *   mutationFn: createAnime,
 * })
 */
export function createCreateHook<TData, TResult>(config: CreateConfig<TData, TResult>) {
  return function useCreate() {
    const queryClient = useQueryClient()

    return useMutation({
      mutationFn: ({ data }: { data: TData }) => config.mutationFn(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [config.listKey] })
        config.additionalInvalidation?.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] })
        })
      },
    })
  }
}

/**
 * Создаёт хук useUpdate для сущности
 *
 * @example
 * const useUpdateAnime = createUpdateHook({
 *   listKey: 'animes',
 *   singleKey: 'anime',
 *   mutationFn: updateAnime,
 * })
 */
export function createUpdateHook<TData, TResult>(config: UpdateConfig<TData, TResult>) {
  return function useUpdate() {
    const queryClient = useQueryClient()

    return useMutation({
      mutationFn: ({ where, data }: { where: { id: string }; data: TData }) => config.mutationFn(where.id, data),
      onSuccess: (_result, variables) => {
        queryClient.invalidateQueries({ queryKey: [config.listKey] })
        queryClient.invalidateQueries({ queryKey: [config.singleKey, variables.where.id] })
        if (config.predicateInvalidation) {
          queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === config.predicateInvalidation })
        }
        config.additionalInvalidation?.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] })
        })
      },
    })
  }
}

/**
 * Создаёт хук useDelete для сущности
 *
 * @example
 * const useDeleteAnime = createDeleteHook({
 *   listKey: 'animes',
 *   mutationFn: deleteAnime,
 * })
 */
export function createDeleteHook<TResult>(config: DeleteConfig<TResult>) {
  return function useDelete() {
    const queryClient = useQueryClient()

    return useMutation({
      mutationFn: ({ where }: { where: { id: string } }) => config.mutationFn(where.id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [config.listKey] })
        if (config.predicateInvalidation) {
          queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === config.predicateInvalidation })
        }
        config.additionalInvalidation?.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] })
        })
      },
    })
  }
}

// ============================================================
// Композитная фабрика (полный CRUD)
// ============================================================

/**
 * Создаёт полный набор CRUD хуков для сущности
 *
 * @example
 * const {
 *   useFindMany: useFindManyAnime,
 *   useFindUnique: useFindUniqueAnime,
 *   useCreate: useCreateAnime,
 *   useUpdate: useUpdateAnime,
 *   useDelete: useDeleteAnime,
 * } = createCRUDHooks({
 *   keys: { list: 'animes', single: 'anime' },
 *   actions: {
 *     findMany: findManyAnime,
 *     findUnique: findUniqueAnime,
 *     create: createAnime,
 *     update: updateAnime,
 *     delete: deleteAnime,
 *   },
 * })
 */
export function createCRUDHooks<
  TFindManyArgs,
  TFindManyResult,
  TFindUniqueResult,
  TInclude,
  TCreateData,
  TCreateResult,
  TUpdateData,
  TUpdateResult,
  TDeleteResult,
>(
  config: CRUDConfig<
    TFindManyArgs,
    TFindManyResult,
    TFindUniqueResult,
    TInclude,
    TCreateData,
    TCreateResult,
    TUpdateData,
    TUpdateResult,
    TDeleteResult
  >
) {
  const { keys, actions, invalidation } = config

  return {
    useFindMany: createFindManyHook<TFindManyArgs, TFindManyResult>({
      queryKey: keys.list,
      queryFn: actions.findMany,
    }),

    useFindUnique: createFindUniqueHook<TFindUniqueResult, TInclude>({
      queryKey: keys.single,
      queryFn: actions.findUnique,
    }),

    useCreate: createCreateHook<TCreateData, TCreateResult>({
      listKey: keys.list,
      mutationFn: actions.create,
      additionalInvalidation: invalidation?.additional,
    }),

    useUpdate: createUpdateHook<TUpdateData, TUpdateResult>({
      listKey: keys.list,
      singleKey: keys.single,
      mutationFn: actions.update,
      predicateInvalidation: invalidation?.predicate,
      additionalInvalidation: invalidation?.additional,
    }),

    useDelete: createDeleteHook<TDeleteResult>({
      listKey: keys.list,
      mutationFn: actions.delete,
      predicateInvalidation: invalidation?.predicate,
      additionalInvalidation: invalidation?.additional,
    }),
  }
}

// ============================================================
// Специализированные фабрики
// ============================================================

/**
 * Создаёт хук для создания с инвалидацией родительской сущности
 * Используется для вложенных сущностей (AudioTrack -> Episode)
 */
export function createNestedCreateHook<TData extends { episodeId: string }, TResult>(config: {
  listKey: string
  parentKey: string
  mutationFn: (data: TData) => Promise<TResult>
}) {
  return function useNestedCreate() {
    const queryClient = useQueryClient()

    return useMutation({
      mutationFn: ({ data }: { data: TData }) => config.mutationFn(data),
      onSuccess: (_result, variables) => {
        queryClient.invalidateQueries({ queryKey: [config.listKey] })
        queryClient.invalidateQueries({ queryKey: [config.listKey, variables.data.episodeId] })
        queryClient.invalidateQueries({ queryKey: [config.parentKey] })
      },
    })
  }
}
