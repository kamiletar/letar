/**
 * Экран для проектора — полноэкранный дисплей матча
 *
 * Доступ без авторизации: /match/{id}/live
 * Тёмный фон, крупный шрифт, авто-скрытие курсора.
 */

import { prisma } from '@/lib/db'
import { MATCH_TEAMS_NAME } from '@/lib/prisma-includes'
import { redirect } from 'next/navigation'

import { LiveDisplayClient } from './_components/live-display-client'

type Params = Promise<{ id: string }>

export default async function LiveMatchPage({ params }: { params: Params }) {
  const { id: matchId } = await params

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      ...MATCH_TEAMS_NAME,
      venue: { select: { name: true, cityId: true } },
      tour: {
        include: {
          round: { include: { season: { select: { name: true } } } },
        },
      },
    },
  })

  if (!match) {
    redirect('/')
  }

  // Загружаем ссылки для донатов по городу площадки
  const cityId = match.venue?.cityId
  const donateLinks = cityId
    ? await prisma.donateLink.findMany({
      where: { cityId, active: true },
      select: { name: true, url: true, description: true },
      orderBy: { order: 'asc' },
      take: 3,
    })
    : []

  return (
    <LiveDisplayClient
      match={{
        id: match.id,
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        homeTeamName: match.homeTeam.team.name,
        awayTeamName: match.awayTeam.team.name,
        venue: match.venue?.name ?? null,
        season: match.tour?.round.season.name ?? 'Товарищеский',
        tour: match.tour ? `Круг ${match.tour.round.number}, Тур ${match.tour.number}` : 'Товарищеский матч',
      }}
      donateLinks={donateLinks}
    />
  )
}
