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

  const cities = await prisma.city.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { venues: true, teams: true, seasons: true } },
    },
  })

  return NextResponse.json(cities)
}
