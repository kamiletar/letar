import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { LibraryClient } from './_components/library-client'

/**
 * Страница библиотеки пользователя
 */
export default async function LibraryPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const db = getEnhancedPrisma(session.user)

  const items = await db.userLibraryItem.findMany({
    where: { userId: session.user.id },
    include: {
      anime: {
        select: {
          id: true,
          title: true,
          coverUrl: true,
          year: true,
          genres: true,
          _count: { select: { episodes: true } },
        },
      },
      watchProgress: {
        select: {
          episodeNumber: true,
          completed: true,
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  })

  return <LibraryClient items={JSON.parse(JSON.stringify(items))} />
}

export const metadata = {
  title: 'Моя библиотека',
}
