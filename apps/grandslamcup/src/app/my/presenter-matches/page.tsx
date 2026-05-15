/**
 * Кабинет ведущего — список матчей, на которых текущий пользователь назначен ведущим.
 * Доступен через user-dropdown → «Кабинет ведущего» (виден только если есть назначения).
 */

import { prisma } from '@/lib/db'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MyMatchesList } from '../_components/my-matches-list'

export const metadata: Metadata = {
  title: 'Кабинет ведущего',
}

export default async function MyPresenterMatchesPage() {
  const { getSession } = await import('@/lib/auth')
  const session = await getSession()
  if (!session) {
    redirect('/sign-in?returnTo=/my/presenter-matches')
  }

  const matches = await prisma.match.findMany({
    where: { presenterUserId: session.user.id },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      homeScore: true,
      awayScore: true,
      scorerToken: true,
      presenterToken: true,
      homeTeam: { include: { team: { select: { name: true } } } },
      awayTeam: { include: { team: { select: { name: true } } } },
      venue: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  })

  return (
    <MyMatchesList
      title="Кабинет ведущего"
      emptyText="На вас пока не назначено ни одного матча. Попросите организатора города назначить вас ведущим."
      matches={matches}
      role="presenter"
    />
  )
}
