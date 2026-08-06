'use client'

/**
 * Адаптеры ZenStack v3 хуков для совместимости с @letar/forms
 *
 * В v3 хуки вызываются через client.model.useMethod(), а form-components
 * ожидает хуки в формате v2: useFindUniqueRecipe(), useCreateRecipe() и т.д.
 *
 * Этот модуль создаёт обёртки, которые возвращают функции нужной сигнатуры.
 */

import { schema } from '@/generated/schema'
import { useClientQueries } from '@zenstackhq/tanstack-query/react'

// ============================================================================
// Recipe хуки
// ============================================================================

/** Query хук для useFindUnique совместимый с FormApiConfig */
export function useFindUniqueRecipe(
  args: { where: { id: string }; include?: object },
  options?: { enabled?: boolean },
) {
  const client = useClientQueries(schema)
  return client.recipe.useFindUnique(args, options)
}

/** Query хук для useFindMany */
export function useFindManyRecipe(args?: { include?: object; orderBy?: object; where?: object }) {
  const client = useClientQueries(schema)
  return client.recipe.useFindMany(args)
}

/** Mutation хук для создания рецепта */
export function useCreateRecipe() {
  const client = useClientQueries(schema)
  return client.recipe.useCreate()
}

/** Mutation хук для обновления рецепта */
export function useUpdateRecipe() {
  const client = useClientQueries(schema)
  return client.recipe.useUpdate()
}

/** Mutation хук для удаления рецепта */
export function useDeleteRecipe() {
  const client = useClientQueries(schema)
  return client.recipe.useDelete()
}

// ============================================================================
// RecipeComponent хуки
// ============================================================================

/** Mutation хук для массового создания компонентов рецепта */
export function useCreateManyRecipeComponent() {
  const client = useClientQueries(schema)
  return client.recipeComponent.useCreateMany()
}

/** Mutation хук для массового удаления компонентов рецепта */
export function useDeleteManyRecipeComponent() {
  const client = useClientQueries(schema)
  return client.recipeComponent.useDeleteMany()
}

// ============================================================================
// Category хуки
// ============================================================================

/** Query хук для useFindMany категорий */
export function useFindManyCategory(args?: { include?: object; orderBy?: object }) {
  const client = useClientQueries(schema)
  return client.category.useFindMany(args)
}

/** Mutation хук для создания категории */
export function useCreateCategory() {
  const client = useClientQueries(schema)
  return client.category.useCreate()
}
