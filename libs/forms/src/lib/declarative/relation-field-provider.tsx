'use client'

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { deepEqual } from '../utils/deep-equal'

/**
 * Option for selection field
 */
export interface RelationOption {
  /** Value (usually ID) */
  value: string
  /** Display text */
  label: string
  /** Description (optional) */
  description?: string
}

/**
 * Loading state relation
 */
export interface RelationState {
  /** Options for selection */
  options: RelationOption[]
  /** Loading in progress */
  isLoading: boolean
  /** Error loading */
  error: Error | null
}

/**
 * Data loading hook result
 */
export interface QueryHookResult<TData = unknown> {
  data?: TData[] | null
  isLoading: boolean
  error?: Error | null
}

/**
 * Relation loading configuration
 */
export interface RelationConfig<TData = unknown, TArgs = unknown> {
  /** Model name (must match model in relationMeta) */
  model: string
  /**
   * React hook for loading data (must return { data, isLoading, error })
   * @example useFindManyCategory
   */
  useQuery: (args?: TArgs) => QueryHookResult<TData>
  /** Field to display as label */
  labelField: string
  /** Field for value (by default 'id') */
  valueField?: string
  /** Field for description (optional) */
  descriptionField?: string
  /** Arguments for useQuery (filters, sorting) */
  queryArgs?: TArgs
}

/**
 * RelationFieldProvider context value
 */
export interface RelationFieldContextValue {
  /** Get options for model */
  getOptions: (model: string) => RelationOption[]
  /** Get state loading for model */
  getState: (model: string) => RelationState
  /** All loaded relations */
  relations: Record<string, RelationState>
}

const RelationFieldContext = createContext<RelationFieldContextValue | null>(null)

/**
 * Hook for getting RelationFieldProvider context
 */
export function useRelationFieldContext(): RelationFieldContextValue | null {
  return useContext(RelationFieldContext)
}

/**
 * Hook for getting options of a specific model
 * @param model - model name
 * @returns options and loading state
 */
export function useRelationOptions(model: string): RelationState {
  const context = useRelationFieldContext()

  if (!context) {
    return {
      options: [],
      isLoading: false,
      error: null,
    }
  }

  return context.getState(model)
}

/**
 * Loader component for a single relation
 * Called inside the provider, follows hooks rules
 */
function RelationLoader<TData>({
  config,
  onLoaded,
}: {
  config: RelationConfig<TData>
  onLoaded: (model: string, state: RelationState) => void
}) {
  const { model, useQuery, labelField, valueField = 'id', descriptionField, queryArgs } = config

  // Call the data loading hook
  const { data, isLoading, error } = useQuery(queryArgs)

  // Transform data into options on change
  useEffect(() => {
    if (isLoading) {
      onLoaded(model, { options: [], isLoading: true, error: null })
      return
    }

    if (error) {
      onLoaded(model, { options: [], isLoading: false, error: error as Error })
      return
    }

    const options: RelationOption[] = (data ?? []).map((item) => {
      const record = item as Record<string, unknown>
      return {
        value: String(record[valueField] ?? ''),
        label: String(record[labelField] ?? ''),
        description: descriptionField ? String(record[descriptionField] ?? '') : undefined,
      }
    })

    onLoaded(model, { options, isLoading: false, error: null })
  }, [data, isLoading, error, model, labelField, valueField, descriptionField, onLoaded])

  // Component renders nothing
  return null
}

/**
 * Provider for auto-loading relation field options
 *
 * Allows automatically loading options for fields with `relationMeta()`,
 * integrating with ZenStack hooks.
 *
 * @example Basic usage
 * ```tsx
 * import { useFindManyCategory, useFindManyTag } from '@/generated/hooks'
 *
 * <RelationFieldProvider
 *   relations={[
 *     { model: 'Category', useQuery: useFindManyCategory, labelField: 'name' },
 *     { model: 'Tag', useQuery: useFindManyTag, labelField: 'title' },
 *   ]}
 * >
 *   <Form schema={ProductFormSchema} ...>
 *     <Form.AutoFields />
 *   </Form>
 * </RelationFieldProvider>
 * ```
 *
 * @example With filtering and sorting
 * ```tsx
 * <RelationFieldProvider
 *   relations={[
 *     {
 *       model: 'Category',
 *       useQuery: useFindManyCategory,
 *       labelField: 'name',
 *       queryArgs: {
 *         where: { isActive: true },
 *         orderBy: { name: 'asc' },
 *       },
 *     },
 *   ]}
 * >
 * ```
 *
 * @example With description for RadioCard/CheckboxCard
 * ```tsx
 * <RelationFieldProvider
 *   relations={[
 *     {
 *       model: 'Plan',
 *       useQuery: useFindManyPlan,
 *       labelField: 'name',
 *       descriptionField: 'features',
 *     },
 *   ]}
 * >
 * ```
 */
export function RelationFieldProvider({
  relations,
  children,
}: {
  /** Relation loading configurations */
  relations: RelationConfig[]
  children: ReactNode
}) {
  // State of all loaded relations
  const [relationsState, setRelationsState] = useState<Record<string, RelationState>>({})

  // Callback for updating relation state
  const handleLoaded = useMemo(
    () => (model: string, state: RelationState) => {
      setRelationsState((prev) => {
        // Check if data has changed
        const prevState = prev[model]
        if (
          prevState &&
          prevState.isLoading === state.isLoading &&
          prevState.error === state.error &&
          deepEqual(prevState.options, state.options)
        ) {
          return prev // No changes
        }
        return { ...prev, [model]: state }
      })
    },
    []
  )

  // Context value
  const contextValue = useMemo<RelationFieldContextValue>(
    () => ({
      getOptions: (model: string) => relationsState[model]?.options ?? [],
      getState: (model: string) =>
        relationsState[model] ?? {
          options: [],
          isLoading: false,
          error: null,
        },
      relations: relationsState,
    }),
    [relationsState]
  )

  return (
    <RelationFieldContext.Provider value={contextValue}>
      {/* Render loaders for each relation */}
      {relations.map((config) => (
        <RelationLoader key={config.model} config={config} onLoaded={handleLoaded} />
      ))}
      {children}
    </RelationFieldContext.Provider>
  )
}

/**
 * HOC for wrapping a component with RelationFieldProvider
 *
 * @example
 * ```tsx
 * const ProductFormWithRelations = withRelations(ProductForm, [
 *   { model: 'Category', useQuery: useFindManyCategory, labelField: 'name' },
 * ])
 * ```
 */
export function withRelations<P extends object>(
  Component: React.ComponentType<P>,
  relations: RelationConfig[]
): React.FC<P> {
  const WrappedComponent = (props: P) => (
    <RelationFieldProvider relations={relations}>
      <Component {...props} />
    </RelationFieldProvider>
  )

  WrappedComponent.displayName = `withRelations(${Component.displayName ?? Component.name ?? 'Component'})`

  return WrappedComponent
}
