'use client'

/**
 * Адаптеры хуков для ZenStack v3
 * Обёртки над useClientQueries(schema) для совместимости с v2 API
 */

import { schema } from '@/generated/schema'
import { useClientQueries } from '@zenstackhq/tanstack-query/react'

// ============================================================================
// Client Hooks
// ============================================================================

type ClientFindManyArgs = Parameters<ReturnType<typeof useClientQueries<typeof schema>>['client']['useFindMany']>[0]

export function useFindManyClient(args?: ClientFindManyArgs) {
  const client = useClientQueries(schema)
  return client.client.useFindMany(args)
}

// ============================================================================
// TherapySession Hooks
// Примечание: Экспорт useFindManySession для обратной совместимости
// ============================================================================

type TherapySessionFindManyArgs = Parameters<
  ReturnType<typeof useClientQueries<typeof schema>>['therapySession']['useFindMany']
>[0]

export function useFindManyTherapySession(args?: TherapySessionFindManyArgs) {
  const client = useClientQueries(schema)
  return client.therapySession.useFindMany(args)
}

// Алиас для обратной совместимости (combobox-session.tsx использует это имя)
export const useFindManySession = useFindManyTherapySession

// ============================================================================
// TransformationPlan Hooks
// ============================================================================

type TransformationPlanFindManyArgs = Parameters<
  ReturnType<typeof useClientQueries<typeof schema>>['transformationPlan']['useFindMany']
>[0]

export function useFindManyTransformationPlan(args?: TransformationPlanFindManyArgs) {
  const client = useClientQueries(schema)
  return client.transformationPlan.useFindMany(args)
}

// ============================================================================
// User Hooks
// ============================================================================

type UserFindManyArgs = Parameters<ReturnType<typeof useClientQueries<typeof schema>>['user']['useFindMany']>[0]

export function useFindManyUser(args?: UserFindManyArgs) {
  const client = useClientQueries(schema)
  return client.user.useFindMany(args)
}

type UserFindUniqueArgs = Parameters<ReturnType<typeof useClientQueries<typeof schema>>['user']['useFindUnique']>[0]

export function useFindUniqueUser(args: UserFindUniqueArgs) {
  const client = useClientQueries(schema)
  return client.user.useFindUnique(args)
}

// ============================================================================
// Practice Hooks
// ============================================================================

type PracticeFindManyArgs = Parameters<ReturnType<typeof useClientQueries<typeof schema>>['practice']['useFindMany']>[0]

export function useFindManyPractice(args?: PracticeFindManyArgs) {
  const client = useClientQueries(schema)
  return client.practice.useFindMany(args)
}
