import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { StudentLessonsListInfinite } from './_components/student-lessons-list-infinite'

export const metadata = {
  title: 'Мои занятия',
  description: 'Список ваших занятий',
}

export default async function StudentLessonsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/my-lessons')
  }

  // Проверяем наличие профиля ученика
  if (!session.user.hasStudentProfile) {
    redirect('/dashboard')
  }

  return <StudentLessonsListInfinite initialStudentId={session.user.id} />
}
