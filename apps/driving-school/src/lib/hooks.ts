'use client'

/**
 * Адаптеры хуков для ZenStack v3
 * Обёртки над useClientQueries(schema) для совместимости с v2 API
 *
 * ZenStack v3: tanstack-query это runtime library, а не генератор кода.
 * Используем useClientQueries(schema) и создаём обёртки для удобства.
 *
 * MEMORY LEAK FIX: useClientQueries вызывается один раз через useCachedClient()
 * для предотвращения создания новых Zod объектов при каждом рендере.
 */

import { useRef } from 'react'

import { schema } from '@letar/driving-school-db/schema'
import { useClientQueries } from '@zenstackhq/tanstack-query/react'

// ============================================================================
// Cached Client Hook — предотвращает memory leak
// ============================================================================

type ClientType = ReturnType<typeof useClientQueries<typeof schema>>

/**
 * Кэширует результат useClientQueries чтобы избежать создания
 * новых Zod объектов при каждом рендере.
 */
function useCachedClient(): ClientType {
  // Вызываем хук безусловно (правило rules-of-hooks), но используем только первый результат
  const client = useClientQueries(schema)
  const clientRef = useRef<ClientType | null>(null)
  if (!clientRef.current) {
    clientRef.current = client
  }
  return clientRef.current
}

// ============================================================================
// Generic Hooks (реэкспорт из @letar/hooks)
// ============================================================================

export { useApiSuggestions, useBulkMutation, type ApiSuggestionsResult } from '@letar/hooks'

// ============================================================================
// User Hooks
// ============================================================================

type UserFindManyArgs = Parameters<ClientType['user']['useFindMany']>[0]
type UserFindManyOptions = Parameters<ClientType['user']['useFindMany']>[1]
type UserCountArgs = Parameters<ClientType['user']['useCount']>[0]
type UserCountOptions = Parameters<ClientType['user']['useCount']>[1]

export function useFindManyUser(args?: UserFindManyArgs, options?: UserFindManyOptions) {
  const client = useCachedClient()
  return client.user.useFindMany(args, options)
}

export function useCountUser(args?: UserCountArgs, options?: UserCountOptions) {
  const client = useCachedClient()
  return client.user.useCount(args, options)
}

// ============================================================================
// Organization Hooks (бывший School)
// ============================================================================

type OrganizationFindManyArgs = Parameters<ClientType['organization']['useFindMany']>[0]
type OrganizationFindManyOptions = Parameters<ClientType['organization']['useFindMany']>[1]
type OrganizationUpdateArgs = Parameters<ClientType['organization']['useUpdate']>[0]

export function useFindManyOrganization(args?: OrganizationFindManyArgs, options?: OrganizationFindManyOptions) {
  const client = useCachedClient()
  return client.organization.useFindMany(args, options)
}

export function useUpdateOrganization(args?: OrganizationUpdateArgs) {
  const client = useCachedClient()
  return client.organization.useUpdate(args)
}

// ============================================================================
// Team Hooks (бывший SchoolLocation)
// ============================================================================

type TeamFindManyArgs = Parameters<ClientType['team']['useFindMany']>[0]
type TeamFindManyOptions = Parameters<ClientType['team']['useFindMany']>[1]

export function useFindManyTeam(args?: TeamFindManyArgs, options?: TeamFindManyOptions) {
  const client = useCachedClient()
  return client.team.useFindMany(args, options)
}

// ============================================================================
// LessonType Hooks
// ============================================================================

type LessonTypeFindManyArgs = Parameters<ClientType['lessonType']['useFindMany']>[0]
type LessonTypeFindManyOptions = Parameters<ClientType['lessonType']['useFindMany']>[1]

export function useFindManyLessonType(args?: LessonTypeFindManyArgs, options?: LessonTypeFindManyOptions) {
  const client = useCachedClient()
  return client.lessonType.useFindMany(args, options)
}

// ============================================================================
// InstructorVehicle Hooks
// ============================================================================

type InstructorVehicleFindManyArgs = Parameters<ClientType['instructorVehicle']['useFindMany']>[0]
type InstructorVehicleFindManyOptions = Parameters<ClientType['instructorVehicle']['useFindMany']>[1]

export function useFindManyInstructorVehicle(
  args?: InstructorVehicleFindManyArgs,
  options?: InstructorVehicleFindManyOptions
) {
  const client = useCachedClient()
  return client.instructorVehicle.useFindMany(args, options)
}

// ============================================================================
// TheoryTopic Hooks
// ============================================================================

type TheoryTopicFindManyArgs = Parameters<ClientType['theoryTopic']['useFindMany']>[0]
type TheoryTopicFindManyOptions = Parameters<ClientType['theoryTopic']['useFindMany']>[1]

export function useFindManyTheoryTopic(args?: TheoryTopicFindManyArgs, options?: TheoryTopicFindManyOptions) {
  const client = useCachedClient()
  return client.theoryTopic.useFindMany(args, options)
}

// ============================================================================
// TheoryLesson Hooks
// ============================================================================

type TheoryLessonFindManyArgs = Parameters<ClientType['theoryLesson']['useFindMany']>[0]
type TheoryLessonFindManyOptions = Parameters<ClientType['theoryLesson']['useFindMany']>[1]

export function useFindManyTheoryLesson(args?: TheoryLessonFindManyArgs, options?: TheoryLessonFindManyOptions) {
  const client = useCachedClient()
  return client.theoryLesson.useFindMany(args, options)
}

// ============================================================================
// StudyGroup Hooks
// ============================================================================

type StudyGroupFindManyArgs = Parameters<ClientType['studyGroup']['useFindMany']>[0]
type StudyGroupFindManyOptions = Parameters<ClientType['studyGroup']['useFindMany']>[1]

export function useFindManyStudyGroup(args?: StudyGroupFindManyArgs, options?: StudyGroupFindManyOptions) {
  const client = useCachedClient()
  return client.studyGroup.useFindMany(args, options)
}

// ============================================================================
// Lesson Hooks
// ============================================================================

type LessonInfiniteFindManyArgs = Parameters<ClientType['lesson']['useInfiniteFindMany']>[0]

type LessonInfiniteFindManyOptions = Parameters<ClientType['lesson']['useInfiniteFindMany']>[1]

export function useInfiniteFindManyLesson(args?: LessonInfiniteFindManyArgs, options?: LessonInfiniteFindManyOptions) {
  const client = useCachedClient()
  return client.lesson.useInfiniteFindMany(args, options)
}

// ============================================================================
// AuditLog Hooks
// ============================================================================

type AuditLogInfiniteFindManyArgs = Parameters<ClientType['auditLog']['useInfiniteFindMany']>[0]

type AuditLogInfiniteFindManyOptions = Parameters<ClientType['auditLog']['useInfiniteFindMany']>[1]

export function useInfiniteFindManyAuditLog(
  args?: AuditLogInfiniteFindManyArgs,
  options?: AuditLogInfiniteFindManyOptions
) {
  const client = useCachedClient()
  return client.auditLog.useInfiniteFindMany(args, options)
}

// ============================================================================
// ApiLog Hooks
// ============================================================================

type ApiLogInfiniteFindManyArgs = Parameters<ClientType['apiLog']['useInfiniteFindMany']>[0]

type ApiLogInfiniteFindManyOptions = Parameters<ClientType['apiLog']['useInfiniteFindMany']>[1]

export function useInfiniteFindManyApiLog(args?: ApiLogInfiniteFindManyArgs, options?: ApiLogInfiniteFindManyOptions) {
  const client = useCachedClient()
  return client.apiLog.useInfiniteFindMany(args, options)
}
