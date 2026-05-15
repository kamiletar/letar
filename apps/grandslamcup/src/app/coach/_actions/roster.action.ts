'use server'

/**
 * Server actions для управления составом команды тренером.
 *
 * Потоки:
 * - Добавление нового игрока → мгновенное (тренер сам формирует команду)
 * - Запрос трансфера → проверка окна + заявка на модерацию
 * - Удаление игрока из состава → мгновенное (soft delete)
 */

import { prisma } from '@/lib/db'
import { requireCoachAction } from '@/lib/roles'
import { transliterate } from '@/lib/transliterate'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Добавить нового игрока (мгновенно, без модерации) ===

const AddNewPlayerSchema = z
  .object({
    playerName: z.string().min(2, 'Минимум 2 символа').max(200),
    playerCity: z.string().max(100).optional(),
    playerTelegram: z.string().max(200).optional(),
    playerVk: z.string().max(200).optional(),
    playerBio: z.string().max(2000).optional(),
    role: z.enum(['PLAYER', 'COACH', 'ASSISTANT_COACH']).default('PLAYER'),
    isPlaying: z.boolean().optional(),
  })
  .strip()

export async function addNewPlayerAction(input: unknown) {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = AddNewPlayerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Проверьте заполнение формы' }
  }

  const { playerName, playerTelegram, playerVk, playerBio, role, isPlaying } = parsed.data

  // Проверяем ограничение: максимум 1 тренер (COACH) на команду
  if (role === 'COACH') {
    const existingCoach = await prisma.playerTeamSeason.findFirst({
      where: { teamSeasonId: auth.coach.teamSeasonId, role: 'COACH', leftAt: null },
    })
    if (existingCoach) {
      return { error: 'В команде уже есть тренер' }
    }
  }

  // Генерируем уникальный slug
  let slug = transliterate(playerName)
  const existing = await prisma.player.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  // Определяем город из команды
  const teamSeason = await prisma.teamSeason.findUnique({
    where: { id: auth.coach.teamSeasonId },
    select: { team: { select: { cityId: true } } },
  })

  try {
    // Создаём игрока и добавляем в состав за одну транзакцию
    await prisma.$transaction(async (tx) => {
      const player = await tx.player.create({
        data: {
          name: playerName,
          slug,
          cityId: teamSeason?.team.cityId ?? null,
          bio: playerBio || null,
          socialLinks: [
            ...(playerTelegram ? [{ platform: 'telegram', url: playerTelegram }] : []),
            ...(playerVk ? [{ platform: 'vk', url: playerVk }] : []),
          ],
        },
      })

      await tx.playerTeamSeason.create({
        data: {
          playerId: player.id,
          teamSeasonId: auth.coach.teamSeasonId,
          role,
          isPlaying: role === 'PLAYER' ? true : (isPlaying ?? false),
        },
      })
    })

    revalidatePath('/coach/roster')
    return { success: true }
  } catch (error) {
    console.error('[addNewPlayerAction] ошибка:', error)
    return { error: 'Не удалось добавить игрока' }
  }
}

// === Запросить трансфер ===

const RequestTransferSchema = z
  .object({
    playerId: z.string().min(1),
    fromTeamSeasonId: z.string().min(1),
    role: z.enum(['PLAYER', 'COACH', 'ASSISTANT_COACH']).default('PLAYER'),
    isPlaying: z.boolean().optional(),
    coachNote: z.string().max(500).optional(),
  })
  .strip()

export async function requestTransferAction(input: unknown) {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = RequestTransferSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const { playerId, fromTeamSeasonId, role, coachNote } = parsed.data

  // Проверяем что трансферное окно открыто
  const season = await prisma.season.findFirst({
    where: { id: auth.coach.seasonId },
    select: { transferWindowOpen: true },
  })

  if (!season?.transferWindowOpen) {
    return { error: 'Трансферное окно закрыто' }
  }

  // Проверяем что игрок существует и играет в другой команде
  const playerMembership = await prisma.playerTeamSeason.findFirst({
    where: {
      playerId,
      teamSeasonId: fromTeamSeasonId,
      leftAt: null,
    },
  })

  if (!playerMembership) {
    return { error: 'Игрок не найден в указанной команде' }
  }

  // Проверяем ограничение: максимум 1 тренер (COACH) на команду
  if (role === 'COACH') {
    const existingCoach = await prisma.playerTeamSeason.findFirst({
      where: { teamSeasonId: auth.coach.teamSeasonId, role: 'COACH', leftAt: null },
    })
    if (existingCoach) {
      return { error: 'В команде уже есть тренер' }
    }
  }

  // Проверяем что нет дублирующей заявки
  const existing = await prisma.rosterApplication.findFirst({
    where: {
      type: 'TRANSFER',
      playerId,
      toTeamSeasonId: auth.coach.teamSeasonId,
      status: 'PENDING',
    },
  })

  if (existing) {
    return { error: 'Заявка на этого игрока уже подана' }
  }

  try {
    await prisma.rosterApplication.create({
      data: {
        type: 'TRANSFER',
        playerId,
        fromTeamSeasonId,
        toTeamSeasonId: auth.coach.teamSeasonId,
        role,
        coachNote: coachNote || null,
        submittedById: auth.coach.userId,
      },
    })

    revalidatePath('/coach/transfers')
    return { success: true }
  } catch {
    return { error: 'Не удалось подать заявку на трансфер' }
  }
}

// === Убрать игрока из состава (мгновенное действие) ===

const RemovePlayerSchema = z
  .object({
    playerTeamSeasonId: z.string().min(1),
  })
  .strip()

export async function removePlayerAction(input: unknown) {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = RemovePlayerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  // Проверяем что это игрок нашей команды
  const membership = await prisma.playerTeamSeason.findFirst({
    where: {
      id: parsed.data.playerTeamSeasonId,
      teamSeasonId: auth.coach.teamSeasonId,
      leftAt: null,
    },
  })

  if (!membership) {
    return { error: 'Игрок не найден в составе' }
  }

  // Нельзя убрать самого себя (тренера)
  if (membership.playerId === auth.coach.playerId) {
    return { error: 'Нельзя убрать себя из состава' }
  }

  try {
    await prisma.playerTeamSeason.update({
      where: { id: membership.id },
      data: { leftAt: new Date() },
    })

    revalidatePath('/coach/roster')
    return { success: true }
  } catch {
    return { error: 'Не удалось убрать игрока' }
  }
}

// === Переключение «играющий» для тренеров/замов ===

const ToggleIsPlayingSchema = z
  .object({
    playerTeamSeasonId: z.string().min(1),
    isPlaying: z.boolean(),
  })
  .strip()

export async function toggleIsPlayingAction(input: unknown) {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = ToggleIsPlayingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const membership = await prisma.playerTeamSeason.findFirst({
    where: {
      id: parsed.data.playerTeamSeasonId,
      teamSeasonId: auth.coach.teamSeasonId,
      leftAt: null,
    },
  })

  if (!membership) {
    return { error: 'Участник не найден в составе' }
  }

  // Только для тренеров и замов
  if (membership.role === 'PLAYER') {
    return { error: 'Игроки всегда играющие' }
  }

  try {
    await prisma.playerTeamSeason.update({
      where: { id: membership.id },
      data: { isPlaying: parsed.data.isPlaying },
    })

    revalidatePath('/coach/roster')
    return { success: true }
  } catch {
    return { error: 'Не удалось обновить статус' }
  }
}

// === Редактирование профиля поэта (только если не привязан к User) ===

const SocialLinkSchema = z.object({ platform: z.string().min(1), url: z.string().min(1) })

const UpdatePlayerProfileSchema = z
  .object({
    playerId: z.string().min(1),
    bio: z.string().max(2000).optional(),
    socialLinks: z.array(SocialLinkSchema).optional(),
  })
  .strip()

export async function updatePlayerProfileAction(input: unknown) {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = UpdatePlayerProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Проверьте заполнение формы' }
  }

  const { playerId, bio, socialLinks } = parsed.data

  // Проверяем что игрок в нашей команде и не привязан к User
  const membership = await prisma.playerTeamSeason.findFirst({
    where: {
      playerId,
      teamSeasonId: auth.coach.teamSeasonId,
      leftAt: null,
    },
    include: {
      player: { select: { userId: true } },
    },
  })

  if (!membership) {
    return { error: 'Игрок не найден в составе' }
  }
  // Тренер может редактировать всех игроков, даже с привязанной учёткой

  try {
    await prisma.player.update({
      where: { id: playerId },
      data: {
        bio: bio || null,
        ...(socialLinks !== undefined ? { socialLinks: socialLinks.length > 0 ? socialLinks : [] } : {}),
      },
    })

    revalidatePath('/coach/roster')
    return { success: true }
  } catch {
    return { error: 'Не удалось обновить профиль' }
  }
}

// === Привязка User к поэту ===

const LinkPlayerToUserSchema = z
  .object({
    playerId: z.string().min(1),
    email: z.string().email('Некорректный email'),
  })
  .strip()

export async function linkPlayerToUserAction(input: unknown) {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = LinkPlayerToUserSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Укажите корректный email' }
  }

  const { playerId, email } = parsed.data

  // Проверяем что игрок в нашей команде
  const membership = await prisma.playerTeamSeason.findFirst({
    where: {
      playerId,
      teamSeasonId: auth.coach.teamSeasonId,
      leftAt: null,
    },
    include: {
      player: { select: { userId: true } },
    },
  })

  if (!membership) {
    return { error: 'Игрок не найден в составе' }
  }
  if (membership.player.userId) {
    return { error: 'Уже привязан к аккаунту' }
  }

  // Ищем пользователя по email
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, name: true },
  })

  if (!user) {
    return { error: `Пользователь с email ${email} не найден. Он должен сначала зарегистрироваться.` }
  }

  // Проверяем что User не привязан к другому Player
  const existingPlayer = await prisma.player.findFirst({
    where: { userId: user.id },
    select: { name: true },
  })

  if (existingPlayer) {
    return { error: `Этот аккаунт уже привязан к поэту: ${existingPlayer.name}` }
  }

  try {
    await prisma.player.update({
      where: { id: playerId },
      data: { userId: user.id },
    })

    revalidatePath('/coach/roster')
    return { success: true, userName: user.name }
  } catch {
    return { error: 'Не удалось привязать аккаунт' }
  }
}

// === Отвязка User от поэта ===

const UnlinkPlayerSchema = z.object({ playerId: z.string().min(1) }).strip()

export async function unlinkPlayerAction(input: unknown) {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = UnlinkPlayerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const membership = await prisma.playerTeamSeason.findFirst({
    where: {
      playerId: parsed.data.playerId,
      teamSeasonId: auth.coach.teamSeasonId,
      leftAt: null,
    },
  })

  if (!membership) {
    return { error: 'Игрок не найден в составе' }
  }

  try {
    await prisma.player.update({
      where: { id: parsed.data.playerId },
      data: { userId: null },
    })

    revalidatePath('/coach/roster')
    return { success: true }
  } catch {
    return { error: 'Не удалось отвязать аккаунт' }
  }
}
