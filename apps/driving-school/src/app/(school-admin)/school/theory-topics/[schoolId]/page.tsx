import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth'

import { getTheoryTopicsAction } from '../_actions/theory-topic.action'
import { TheoryTopicsClientPage } from './_components/theory-topics-client-page'

interface Props {
  params: Promise<{ schoolId: string }>
}

export default async function SchoolTheoryTopicsPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { schoolId } = await params

  // Используем server action вместо ZenStack hooks (баг v3.2.1 с include)
  const result = await getTheoryTopicsAction(schoolId)

  if (!result.success) {
    return (
      <div>
        <h1>Ошибка</h1>
        <p>Не удалось загрузить темы: {result.error}</p>
      </div>
    )
  }

  return <TheoryTopicsClientPage topics={result.topics} schoolId={schoolId} />
}
