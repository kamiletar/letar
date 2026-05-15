'use client'

import { useCallback, useMemo } from 'react'
import type { FormApiConfig, FormApiResult } from './types'

/**
 * Hook for integrating ZenStack hooks with Form component
 *
 * Handles:
 * - Data fetching via query hook (only in edit mode)
 * - Create/update mutations
 * - Loading and pending states
 *
 * @example
 * ```tsx
 * const formApi = useFormApi({
 *   id: 'abc123',
 *   query: { hook: useFindUniqueRecipe, include: { components: true } },
 *   mutations: { create: useCreateRecipe, update: useUpdateRecipe },
 * })
 *
 * // formApi.isEditMode - true if id provided
 * // formApi.data - loaded data
 * // formApi.submit(values) - calls create or update mutation
 * ```
 */
export function useFormApi<TData extends object>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: FormApiConfig<TData, any>
): FormApiResult<TData> {
  const isEditMode = !!config.id

  // Call query hook (always, but disabled in create mode)
  const queryResult = config.query.hook(
    {
      where: { id: config.id ?? '' },
      include: config.query.include,
    },
    { enabled: isEditMode }
  )

  // Call mutation hooks (always, hooks rules)
  const createMutation = config.mutations.create()
  const updateMutation = config.mutations.update()

  // Submit handler
  const submit = useCallback(
    async (values: TData) => {
      const mode = isEditMode ? 'update' : 'create'

      // Transform data if transformer provided, otherwise use raw values
      const data = config.transformData ? config.transformData(values, mode) : values

      if (isEditMode && config.id) {
        await updateMutation.mutateAsync({
          where: { id: config.id },
          data,
        })
      } else {
        await createMutation.mutateAsync({
          data,
        })
      }
    },
    [isEditMode, config.id, config.transformData, createMutation, updateMutation]
  )

  // Get mutation error (whichever one was used)
  const mutationError = isEditMode ? updateMutation.error : createMutation.error

  // ZenStack hooks may return data directly or wrapped in { data, meta }
  // Check if data is wrapped
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawData = queryResult.data as any
  const actualData = rawData?.data !== undefined ? rawData.data : rawData

  return useMemo(
    () => ({
      isEditMode,
      isLoading: isEditMode ? queryResult.isLoading : false,
      isMutating: createMutation.isPending || updateMutation.isPending,
      data: actualData,
      error: queryResult.error,
      mutationError,
      submit,
    }),
    [
      isEditMode,
      queryResult.isLoading,
      actualData,
      queryResult.error,
      createMutation.isPending,
      updateMutation.isPending,
      mutationError,
      submit,
    ]
  )
}
