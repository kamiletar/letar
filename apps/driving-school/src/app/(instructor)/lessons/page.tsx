import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { redirect } from 'next/navigation'
import { LessonsListInfinite } from './_components/lessons-list-infinite'

export const metadata = {
  title: 'Мои занятия',
  description: 'Управление занятиями',
}

interface LessonsPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function LessonsPage({ searchParams }: LessonsPageProps) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/lessons')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const statusFilter = params.status

  return <LessonsListInfinite statusFilter={statusFilter} initialInstructorId={session.user.id} />
}
