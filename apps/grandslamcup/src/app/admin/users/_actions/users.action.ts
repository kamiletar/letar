'use server'

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { requireAdminAction } from '@/lib/roles'
import type { ActionResult } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Типы ===

export interface CityOrganizerItem {
  id: string
  cityId: string
  createdAt: string
  city: { id: string; name: string }
}

export interface UserItem {
  id: string
  name: string
  email: string
  image: string | null
  roles: string[]
  createdAt: string
  organizedCities: CityOrganizerItem[]
  player: { id: string; name: string } | null
}

// === Схемы ===

const AddCityOrganizerSchema = z
  .object({
    userId: z.string().min(1),
    cityId: z.string().min(1),
  })
  .strip()

const RemoveCityOrganizerSchema = z
  .object({
    id: z.string().min(1),
  })
  .strip()

const ToggleAdminSchema = z
  .object({
    userId: z.string().min(1),
    makeAdmin: z.boolean(),
  })
  .strip()

// === Actions ===

/** Получить список всех пользователей */
export const getUsersAction = adminGuard(async (): Promise<ActionResult<UserItem[]>> => {
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

  return { success: true, data: users as unknown as UserItem[] }
})

/** Назначить пользователя организатором города */
export const addCityOrganizerAction = adminGuard(async (input: unknown): Promise<ActionResult<{ id: string }>> => {
  const parsed = AddCityOrganizerSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    const organizer = await prisma.cityOrganizer.create({
      data: { userId: parsed.data.userId, cityId: parsed.data.cityId },
    })
    revalidatePath('/admin/users')
    return { success: true, data: { id: organizer.id } }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique')) {
      return { success: false, error: 'Пользователь уже является организатором этого города' }
    }
    return { success: false, error: 'Ошибка назначения организатора' }
  }
})

/** Снять пользователя с роли организатора города */
export const removeCityOrganizerAction = adminGuard(async (input: unknown): Promise<ActionResult> => {
  const parsed = RemoveCityOrganizerSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    await prisma.cityOrganizer.delete({ where: { id: parsed.data.id } })
    revalidatePath('/admin/users')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Ошибка удаления организатора' }
  }
})

/** Переключить роль ADMIN у пользователя */
export async function toggleAdminRoleAction(input: unknown): Promise<ActionResult> {
  const auth = await requireAdminAction()
  if (!auth.success) {
    return { success: false, error: auth.error }
  }

  const parsed = ToggleAdminSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  // Защита от самодемотирования
  if (!parsed.data.makeAdmin && parsed.data.userId === auth.user.id) {
    return { success: false, error: 'Нельзя снять роль администратора с самого себя' }
  }

  try {
    const roles: ('USER' | 'ADMIN')[] = parsed.data.makeAdmin ? ['USER', 'ADMIN'] : ['USER']
    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { roles },
    })
    revalidatePath('/admin/users')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Ошибка обновления роли' }
  }
}
