import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth'

import { getStudyGroupsAction } from '../_actions/study-group.action'
import { StudyGroupsClientPage } from './_components/study-groups-client-page'

interface Props {
  params: Promise<{ schoolId: string }>
}

export default async function SchoolStudyGroupsPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { schoolId } = await params

  // Используем server action вместо ZenStack hooks (баг v3.2.1 с include)
  const result = await getStudyGroupsAction(schoolId)

  if (!result.success) {
    return (
      <div>
        <h1>Ошибка</h1>
        <p>Не удалось загрузить группы: {result.error}</p>
      </div>
    )
  }

  return <StudyGroupsClientPage groups={result.groups} schoolId={schoolId} />
}
