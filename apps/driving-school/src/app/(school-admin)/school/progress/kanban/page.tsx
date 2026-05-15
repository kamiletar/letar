import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getKanbanDataAction, getKanbanInstructorsAction } from './_actions/kanban.action'
import { KanbanPageClient } from './_components/kanban-page-client'

export const metadata: Metadata = {
  title: 'Kanban-доска учеников | Автошкола',
  description: 'Визуализация учеников по этапам обучения',
}

interface KanbanPageProps {
  searchParams: Promise<{
    schoolId?: string
    search?: string
    category?: string
    instructorId?: string
  }>
}

/**
 * Страница Kanban-доски учеников
 * Визуализирует всех учеников по этапам обучения с поддержкой drag & drop
 */
export default async function KanbanPage({ searchParams }: KanbanPageProps) {
  const { schoolId, search, category, instructorId } = await searchParams

  // Проверяем наличие schoolId
  if (!schoolId) {
    redirect('/school')
  }

  // Получаем данные параллельно
  const [dataResult, instructorsResult] = await Promise.all([
    getKanbanDataAction(schoolId, {
      search: search || undefined,
      category: category as 'M' | 'A' | 'A1' | 'B' | 'B1' | 'C' | 'C1' | 'D' | 'D1' | undefined,
      instructorId: instructorId || undefined,
    }),
    getKanbanInstructorsAction(schoolId),
  ])

  // Проверяем доступ
  if (!dataResult.success) {
    if (dataResult.error === 'UNAUTHORIZED') {
      redirect('/sign-in')
    }
    if (dataResult.error === 'NOT_SCHOOL_MEMBER') {
      redirect('/school')
    }
    throw new Error(`Ошибка загрузки данных: ${dataResult.error}`)
  }

  const instructors = instructorsResult.success ? instructorsResult.instructors : []

  return <KanbanPageClient schoolId={schoolId} initialData={dataResult.data} initialInstructors={instructors} />
}
