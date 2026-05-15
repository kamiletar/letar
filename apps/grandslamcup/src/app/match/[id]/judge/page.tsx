/**
 * Экран судьи — голосование за поэтов
 *
 * Доступ через QR-код: /match/{id}/judge?half=1&invite=xxx
 * Или через cookie (повторный визит): /match/{id}/judge
 */

import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { JudgeClient } from './_components/judge-client'

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ half?: string; invite?: string }>

export default async function JudgePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id: matchId } = await params
  const { half, invite } = await searchParams

  // Проверяем существование матча
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, status: true },
  })

  if (!match) {
    redirect('/')
  }

  // Проверяем cookie — возможно судья уже зарегистрирован
  const cookieStore = await cookies()
  const judgeToken = cookieStore.get('judge_token')?.value

  let existingSession: { id: string; name: string; judgeNumber: number; half: number } | null = null
  if (judgeToken) {
    existingSession = await prisma.judgeSession.findUnique({
      where: { token: judgeToken },
      select: { id: true, name: true, judgeNumber: true, half: true },
    })
    // Проверяем что сессия для этого матча
    if (existingSession) {
      const fullSession = await prisma.judgeSession.findUnique({
        where: { token: judgeToken },
        select: { matchId: true },
      })
      if (fullSession?.matchId !== matchId) {
        existingSession = null
      }
    }
  }

  return (
    <JudgeClient
      matchId={matchId}
      matchStatus={match.status}
      half={half ? parseInt(half) : 1}
      inviteKey={invite ?? null}
      existingSession={
        existingSession
          ? {
              name: existingSession.name,
              judgeNumber: existingSession.judgeNumber,
            }
          : null
      }
    />
  )
}
