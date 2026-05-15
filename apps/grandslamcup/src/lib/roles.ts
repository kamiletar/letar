import type { UserRole } from '@/generated/prisma'
import { prisma } from '@/lib/db'

/**
 * Проверка роли ADMIN
 */
export function isAdmin(roles: UserRole[] | undefined | null): boolean {
  return roles?.includes('ADMIN') ?? false
}

/**
 * Требует роль ADMIN. Редирект если нет.
 */
export async function requireAdmin() {
  const { redirect } = await import('next/navigation')
  const { getSession, getDbUser } = await import('./auth')
  const session = await getSession()
  if (!session) {
    redirect('/sign-in')
  }
  const user = await getDbUser(session!)
  if (!isAdmin(user.roles)) {
    redirect('/')
  }
  return user
}

/**
 * Требует роль ADMIN для Server Actions (без редиректа).
 */
export async function requireAdminAction() {
  const { getSession, getDbUser } = await import('./auth')
  const session = await getSession()
  if (!session) {
    return { success: false as const, error: 'UNAUTHORIZED' as const }
  }
  const user = await getDbUser(session)
  if (!isAdmin(user.roles)) {
    return { success: false as const, error: 'FORBIDDEN' as const }
  }
  return { success: true as const, user }
}

/**
 * Данные тренера с его командой в активном сезоне
 */
export interface CoachContext {
  userId: string
  playerId: string
  teamSeasonId: string
  teamId: string
  teamName: string
  seasonId: string
  role: string
}

/**
 * Требует роль COACH/ASSISTANT_COACH. Редирект если нет.
 * Находит команду тренера через цепочку User → Player → PlayerTeamSeason (активный сезон).
 */
export async function requireCoach(): Promise<CoachContext> {
  const { redirect } = await import('next/navigation')
  const { getSession, getDbUser } = await import('./auth')
  const session = await getSession()
  if (!session) {
    redirect('/sign-in')
  }
  const user = await getDbUser(session!)

  // Ищем связь User → Player → PlayerTeamSeason в активном сезоне
  const playerTeamSeason = await prisma.playerTeamSeason.findFirst({
    where: {
      player: { userId: user.id },
      role: { in: ['COACH', 'ASSISTANT_COACH'] },
      leftAt: null,
      teamSeason: { season: { status: 'ACTIVE' } },
    },
    include: {
      player: { select: { id: true } },
      teamSeason: {
        include: {
          team: { select: { id: true, name: true } },
          season: { select: { id: true } },
        },
      },
    },
  })

  if (!playerTeamSeason) {
    redirect('/')
  }

  // TypeScript не знает что redirect() — never, поэтому используем !
  const pts = playerTeamSeason!
  return {
    userId: user.id,
    playerId: pts.player.id,
    teamSeasonId: pts.teamSeasonId,
    teamId: pts.teamSeason.team.id,
    teamName: pts.teamSeason.team.name,
    seasonId: pts.teamSeason.season.id,
    role: pts.role,
  }
}

/**
 * Данные поэта (игрока с привязанным аккаунтом)
 */
export interface PoetContext {
  userId: string
  playerId: string
  playerSlug: string
  playerName: string
  citySlug: string | null
}

/**
 * Требует привязанный Player. Редирект если нет.
 * Находит Player через User.id → Player.userId.
 */
export async function requirePoet(): Promise<PoetContext> {
  const { redirect } = await import('next/navigation')
  const { getSession, getDbUser } = await import('./auth')
  const session = await getSession()
  if (!session) {
    redirect('/sign-in')
  }
  const user = await getDbUser(session!)

  const player = await prisma.player.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      slug: true,
      name: true,
      city: { select: { slug: true } },
    },
  })

  if (!player) {
    redirect('/profile?error=no-player')
  }

  // TypeScript не знает что redirect() — never
  const p = player!
  return {
    userId: user.id,
    playerId: p.id,
    playerSlug: p.slug,
    playerName: p.name,
    citySlug: p.city?.slug ?? null,
  }
}

/**
 * Требует привязанный Player для Server Actions (без редиректа).
 */
export async function requirePoetAction(): Promise<
  { success: false; error: string } | { success: true; poet: PoetContext }
> {
  const { getSession, getDbUser } = await import('./auth')
  const session = await getSession()
  if (!session) {
    return { success: false, error: 'Не авторизован' }
  }
  const user = await getDbUser(session)

  const player = await prisma.player.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      slug: true,
      name: true,
      city: { select: { slug: true } },
    },
  })

  if (!player) {
    return { success: false, error: 'Профиль поэта не привязан' }
  }

  return {
    success: true,
    poet: {
      userId: user.id,
      playerId: player.id,
      playerSlug: player.slug,
      playerName: player.name,
      citySlug: player.city?.slug ?? null,
    },
  }
}

/**
 * Требует роль COACH для Server Actions (без редиректа).
 */
export async function requireCoachAction(): Promise<
  { success: false; error: 'UNAUTHORIZED' | 'FORBIDDEN' } | { success: true; coach: CoachContext }
> {
  const { getSession, getDbUser } = await import('./auth')
  const session = await getSession()
  if (!session) {
    return { success: false, error: 'UNAUTHORIZED' }
  }
  const user = await getDbUser(session)

  const playerTeamSeason = await prisma.playerTeamSeason.findFirst({
    where: {
      player: { userId: user.id },
      role: { in: ['COACH', 'ASSISTANT_COACH'] },
      leftAt: null,
      teamSeason: { season: { status: 'ACTIVE' } },
    },
    include: {
      player: { select: { id: true } },
      teamSeason: {
        include: {
          team: { select: { id: true, name: true } },
          season: { select: { id: true } },
        },
      },
    },
  })

  if (!playerTeamSeason) {
    return { success: false, error: 'FORBIDDEN' }
  }

  return {
    success: true,
    coach: {
      userId: user.id,
      playerId: playerTeamSeason.player.id,
      teamSeasonId: playerTeamSeason.teamSeasonId,
      teamId: playerTeamSeason.teamSeason.team.id,
      teamName: playerTeamSeason.teamSeason.team.name,
      seasonId: playerTeamSeason.teamSeason.season.id,
      role: playerTeamSeason.role,
    },
  }
}
