'use server'

/**
 * Server actions для управления составом команды организатором.
 * Админ может: менять роли, редактировать профили (без ограничений),
 * добавлять/убирать игроков, привязывать/отвязывать User.
 */

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Смена роли игрока в команде ===

const ChangeRoleSchema = z
  .object({
    playerTeamSeasonId: z.string().min(1),
    role: z.enum(['PLAYER', 'COACH', 'ASSISTANT_COACH']),
    isPlaying: z.boolean().optional(),
  })
  .strip()

export const changePlayerRoleAction = adminGuard(async (input: unknown) => {
  const parsed = ChangeRoleSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  try {
    // Проверяем ограничение: максимум 1 тренер (COACH) на команду
    if (parsed.data.role === 'COACH') {
      const current = await prisma.playerTeamSeason.findUnique({
        where: { id: parsed.data.playerTeamSeasonId },
        select: { teamSeasonId: true, id: true },
      })
      if (current) {
        const existingCoach = await prisma.playerTeamSeason.findFirst({
          where: {
            teamSeasonId: current.teamSeasonId,
            role: 'COACH',
            leftAt: null,
            id: { not: current.id },
          },
        })
        if (existingCoach) {
          return { error: 'В команде уже есть тренер' }
        }
      }
    }

    await prisma.playerTeamSeason.update({
      where: { id: parsed.data.playerTeamSeasonId },
      data: {
        role: parsed.data.role,
        ...(parsed.data.isPlaying !== undefined ? { isPlaying: parsed.data.isPlaying } : {}),
      },
    })
    revalidatePath('/admin/teams')
    return { success: true }
  } catch {
    return { error: 'Не удалось изменить роль' }
  }
})

// === Переключение «играющий» для тренеров/замов ===

const ToggleIsPlayingAdminSchema = z
  .object({
    playerTeamSeasonId: z.string().min(1),
    isPlaying: z.boolean(),
  })
  .strip()

export const adminToggleIsPlayingAction = adminGuard(async (input: unknown) => {
  const parsed = ToggleIsPlayingAdminSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const membership = await prisma.playerTeamSeason.findUnique({
    where: { id: parsed.data.playerTeamSeasonId },
    select: { role: true },
  })

  if (!membership) {
    return { error: 'Участник не найден' }
  }
  if (membership.role === 'PLAYER') {
    return { error: 'Игроки всегда играющие' }
  }

  try {
    await prisma.playerTeamSeason.update({
      where: { id: parsed.data.playerTeamSeasonId },
      data: { isPlaying: parsed.data.isPlaying },
    })
    revalidatePath('/admin/teams')
    return { success: true }
  } catch {
    return { error: 'Не удалось обновить статус' }
  }
})

// === Редактирование профиля поэта (админ — без ограничений) ===

const SocialLinkSchema = z.object({
  platform: z.string().min(1),
  url: z.string().min(1),
})

const UpdateProfileSchema = z
  .object({
    playerId: z.string().min(1),
    bio: z.string().max(2000).optional(),
    socialLinks: z.array(SocialLinkSchema).optional(),
    badges: z.array(z.string()).optional(),
  })
  .strip()

export const updatePlayerProfileAdminAction = adminGuard(async (input: unknown) => {
  const parsed = UpdateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Проверьте заполнение формы' }
  }

  const { playerId, bio, socialLinks, badges } = parsed.data

  try {
    await prisma.player.update({
      where: { id: playerId },
      data: {
        bio: bio || null,
        ...(socialLinks !== undefined ? { socialLinks: socialLinks.length > 0 ? socialLinks : [] } : {}),
        ...(badges !== undefined ? { badges } : {}),
      },
    })
    revalidatePath('/admin/teams')
    return { success: true }
  } catch {
    return { error: 'Не удалось обновить профиль' }
  }
})

// === Добавить существующего игрока в команду ===

const AddExistingSchema = z
  .object({
    teamSeasonId: z.string().min(1),
    playerId: z.string().min(1),
    role: z.enum(['PLAYER', 'COACH', 'ASSISTANT_COACH']).default('PLAYER'),
    isPlaying: z.boolean().optional(),
  })
  .strip()

export const addExistingPlayerAction = adminGuard(async (input: unknown) => {
  const parsed = AddExistingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  // Проверяем что игрок не уже в этой команде
  const existing = await prisma.playerTeamSeason.findFirst({
    where: {
      playerId: parsed.data.playerId,
      teamSeasonId: parsed.data.teamSeasonId,
      leftAt: null,
    },
  })
  if (existing) {
    return { error: 'Игрок уже в составе этой команды' }
  }

  // Проверяем ограничение: максимум 1 тренер (COACH) на команду
  if (parsed.data.role === 'COACH') {
    const existingCoach = await prisma.playerTeamSeason.findFirst({
      where: { teamSeasonId: parsed.data.teamSeasonId, role: 'COACH', leftAt: null },
    })
    if (existingCoach) {
      return { error: 'В команде уже есть тренер' }
    }
  }

  try {
    await prisma.playerTeamSeason.create({
      data: {
        playerId: parsed.data.playerId,
        teamSeasonId: parsed.data.teamSeasonId,
        role: parsed.data.role,
      },
    })
    revalidatePath('/admin/teams')
    return { success: true }
  } catch {
    return { error: 'Не удалось добавить игрока' }
  }
})

// === Создать нового игрока и добавить в команду ===

const CreateAndAddSchema = z
  .object({
    teamSeasonId: z.string().min(1),
    name: z.string().min(2).max(200),
    cityId: z.string().optional(),
    role: z.enum(['PLAYER', 'COACH', 'ASSISTANT_COACH']).default('PLAYER'),
    isPlaying: z.boolean().optional(),
  })
  .strip()

/** Транслитерация для slug */
function makeSlug(name: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  }
  return name
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const createAndAddPlayerAction = adminGuard(async (input: unknown) => {
  const parsed = CreateAndAddSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Проверьте заполнение формы' }
  }

  const { teamSeasonId, name, cityId, role } = parsed.data

  // Проверяем ограничение: максимум 1 тренер (COACH) на команду
  if (role === 'COACH') {
    const existingCoach = await prisma.playerTeamSeason.findFirst({
      where: { teamSeasonId, role: 'COACH', leftAt: null },
    })
    if (existingCoach) {
      return { error: 'В команде уже есть тренер' }
    }
  }

  let slug = makeSlug(name)

  // Уникальный slug
  const existingSlug = await prisma.player.findUnique({ where: { slug } })
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`
  }

  try {
    const player = await prisma.player.create({
      data: {
        name,
        slug,
        cityId: cityId || null,
      },
    })

    await prisma.playerTeamSeason.create({
      data: {
        playerId: player.id,
        teamSeasonId,
        role,
      },
    })

    revalidatePath('/admin/teams')
    return { success: true, playerId: player.id }
  } catch {
    return { error: 'Не удалось создать игрока' }
  }
})

// === Убрать игрока из состава ===

const RemoveSchema = z.object({ playerTeamSeasonId: z.string().min(1) }).strip()

export const removeFromRosterAction = adminGuard(async (input: unknown) => {
  const parsed = RemoveSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  try {
    await prisma.playerTeamSeason.update({
      where: { id: parsed.data.playerTeamSeasonId },
      data: { leftAt: new Date() },
    })
    revalidatePath('/admin/teams')
    return { success: true }
  } catch {
    return { error: 'Не удалось убрать игрока' }
  }
})

// === Привязка/отвязка User ===

const LinkSchema = z.object({ playerId: z.string().min(1), email: z.string().email() }).strip()

export const adminLinkPlayerToUserAction = adminGuard(async (input: unknown) => {
  const parsed = LinkSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Укажите корректный email' }
  }

  const user = await prisma.user.findFirst({ where: { email: parsed.data.email }, select: { id: true, name: true } })
  if (!user) {
    return { error: `Пользователь ${parsed.data.email} не найден` }
  }

  const existingPlayer = await prisma.player.findFirst({ where: { userId: user.id }, select: { name: true } })
  if (existingPlayer) {
    return { error: `Аккаунт уже привязан к: ${existingPlayer.name}` }
  }

  try {
    await prisma.player.update({ where: { id: parsed.data.playerId }, data: { userId: user.id } })
    revalidatePath('/admin/teams')
    return { success: true, userName: user.name }
  } catch {
    return { error: 'Не удалось привязать' }
  }
})

const UnlinkSchema = z.object({ playerId: z.string().min(1) }).strip()

export const adminUnlinkPlayerAction = adminGuard(async (input: unknown) => {
  const parsed = UnlinkSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  try {
    await prisma.player.update({ where: { id: parsed.data.playerId }, data: { userId: null } })
    revalidatePath('/admin/teams')
    return { success: true }
  } catch {
    return { error: 'Не удалось отвязать' }
  }
})
