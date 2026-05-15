import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth'

import { getTheoryLessonsForSchoolAction } from '../_actions/theory-lesson-queries.action'
import { TheoryLessonsClientPage } from './_components/theory-lessons-client-page'

interface Props {
  params: Promise<{ schoolId: string }>
}

export default async function SchoolTheoryLessonsPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { schoolId } = await params

  // Используем server action вместо ZenStack hooks (баг v3.2.1 с include)
  const result = await getTheoryLessonsForSchoolAction(schoolId)

  if (!result.success) {
    return (
      <div>
        <h1>Ошибка</h1>
        <p>Не удалось загрузить занятия: {result.error}</p>
      </div>
    )
  }

  return <TheoryLessonsClientPage lessons={result.lessons} schoolId={schoolId} />
}
