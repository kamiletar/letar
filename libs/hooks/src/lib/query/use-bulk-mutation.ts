'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Generic хук для bulk мутаций с автоматической инвалидацией кэша.
 * Упрощает создание хуков для массовых операций.
 *
 * @param mutationFn - Функция выполнения мутации (Server Action)
 * @param invalidateKeys - Массив ключей запросов для инвалидации
 *
 * @example
 * ```tsx
 * // Вместо дублирования логики в каждом хуке:
 * const mutation = useBulkMutation(
 *   (data) => setBulkExamResultsAction(data.results),
 *   ['ExamSession', 'ExamAttempt', 'ExamRegistration']
 * )
 *
 * // Использование:
 * mutation.mutate({ results: [...] })
 * ```
 */
export function useBulkMutation<TData, TResult = unknown>(
  mutationFn: (data: TData) => Promise<TResult>,
  invalidateKeys?: string[],
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: [key] })
        }
      }
    },
  })
}
