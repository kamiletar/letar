/**
 * Зрительское голосование — народное жюри
 *
 * Доступ без авторизации: /match/{id}/audience
 * Зритель сканирует QR, оценивает поэтов (не влияет на результат).
 */

import { prisma } from '@/lib/db'
import { MATCH_TEAMS_NAME } from '@/lib/prisma-includes'
import { redirect } from 'next/navigation'

import { AudienceClient } from './_components/audience-client'

type Params = Promise<{ id: string }>

export default async function AudienceMatchPage({ params }: { params: Params }) {
  const { id: matchId } = await params

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      ...MATCH_TEAMS_NAME,
    },
  })

  if (!match) {
    redirect('/')
  }

  return (
    <AudienceClient
      match={{
        id: match.id,
        status: match.status,
        homeTeamName: match.homeTeam.team.name,
        awayTeamName: match.awayTeam.team.name,
      }}
    />
  )
}
