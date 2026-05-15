import { getDbUser, getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/roles'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await getDbUser(session)
  if (!isAdmin(user.roles)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const seasons = await prisma.season.findMany({
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    include: {
      city: { select: { id: true, name: true } },
      _count: { select: { leagues: true, teamSeasons: true } },
    },
  })

  return NextResponse.json(seasons)
}
