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

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      roles: true,
      createdAt: true,
      organizedCities: {
        include: { city: { select: { id: true, name: true } } },
      },
      player: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(users)
}
