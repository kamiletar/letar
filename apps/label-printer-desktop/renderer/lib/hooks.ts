'use client'

/**
 * Адаптеры хуков ZenStack v3 для совместимости с существующим кодом
 * v3 использует useClientQueries(schema) который возвращает query + mutation хуки
 */

import { useClientQueries } from '@zenstackhq/tanstack-query/react'
import { schema } from '../../schema'

// === Product хуки ===

/** Query хук для useFindMany Product */
export function useFindManyProduct(args?: {
  where?: object
  include?: object
  select?: object
  orderBy?: object
  take?: number
  skip?: number
}) {
  const client = useClientQueries(schema)
  return client.product.useFindMany(args)
}

/** Mutation хук для создания Product */
export function useCreateProduct() {
  const client = useClientQueries(schema)
  return client.product.useCreate()
}

/** Mutation хук для обновления Product */
export function useUpdateProduct() {
  const client = useClientQueries(schema)
  return client.product.useUpdate()
}

/** Mutation хук для удаления Product */
export function useDeleteProduct() {
  const client = useClientQueries(schema)
  return client.product.useDelete()
}

// === PrintJob хуки ===

/** Query хук для useFindMany PrintJob */
export function useFindManyPrintJob(args?: {
  where?: object
  include?: object
  select?: object
  orderBy?: object
  take?: number
  skip?: number
}) {
  const client = useClientQueries(schema)
  return client.printJob.useFindMany(args)
}

/** Mutation хук для создания PrintJob */
export function useCreatePrintJob() {
  const client = useClientQueries(schema)
  return client.printJob.useCreate()
}

/** Mutation хук для обновления PrintJob */
export function useUpdatePrintJob() {
  const client = useClientQueries(schema)
  return client.printJob.useUpdate()
}

/** Mutation хук для удаления PrintJob */
export function useDeletePrintJob() {
  const client = useClientQueries(schema)
  return client.printJob.useDelete()
}

// === Settings хуки ===

/** Query хук для useFindUnique Settings */
export function useFindUniqueSettings(
  args: { where: { id: string }; include?: object },
  options?: { enabled?: boolean },
) {
  const client = useClientQueries(schema)
  return client.settings.useFindUnique(args, options)
}

/** Mutation хук для обновления Settings */
export function useUpdateSettings() {
  const client = useClientQueries(schema)
  return client.settings.useUpdate()
}

/** Mutation хук для upsert Settings */
export function useUpsertSettings() {
  const client = useClientQueries(schema)
  return client.settings.useUpsert()
}

// === Template хуки ===

/** Query хук для useFindMany Template */
export function useFindManyTemplate(args?: { where?: object; include?: object; select?: object; orderBy?: object }) {
  const client = useClientQueries(schema)
  return client.template.useFindMany(args)
}

/** Mutation хук для создания Template */
export function useCreateTemplate() {
  const client = useClientQueries(schema)
  return client.template.useCreate()
}

/** Mutation хук для обновления Template */
export function useUpdateTemplate() {
  const client = useClientQueries(schema)
  return client.template.useUpdate()
}

/** Mutation хук для удаления Template */
export function useDeleteTemplate() {
  const client = useClientQueries(schema)
  return client.template.useDelete()
}
