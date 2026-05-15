import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/roles'
import { notFound } from 'next/navigation'
import { UserDetailClient } from './_components/user-detail-client'

type Params = Promise<{ id: string }>

export default async function UserDetailPage({ params }: { params: Params }) {
  await requireAdmin()
  const { id } = await params

  const [user, cities] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        roles: true,
        createdAt: true,
        organizedCities: {
          include: { city: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        player: { select: { id: true, name: true } },
      },
    }),
    prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  if (!user) {
    notFound()
  }

  // Сериализация Date → string для клиентского компонента
  const serialized = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    organizedCities: user.organizedCities.map((oc) => ({
      ...oc,
      createdAt: oc.createdAt.toISOString(),
    })),
  }

  return <UserDetailClient user={serialized} allCities={cities} />
}
