'use server'

/**
 * Server actions для управления ссылками на донаты
 */

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const DonateLinkSchema = z
  .object({
    name: z.string().min(1, 'Введите название'),
    url: z.string().url('Введите корректную ссылку'),
    description: z.string().max(500).optional(),
    order: z.number().int().min(0).default(0),
    active: z.boolean().default(true),
    cityId: z.string().optional(),
  })
  .strip()

export const getDonateLinksAction = adminGuard(async () => {
  try {
    const links = await prisma.donateLink.findMany({
      orderBy: { order: 'asc' },
      include: { city: { select: { id: true, name: true } } },
    })
    return { data: links }
  } catch (error) {
    console.error('[getDonateLinksAction] ошибка:', error)
    return { error: 'Не удалось загрузить ссылки' }
  }
})

export const createDonateLinkAction = adminGuard(async (formData: unknown) => {
  const parsed = DonateLinkSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Ошибка' }
  }

  try {
    await prisma.donateLink.create({
      data: { ...parsed.data, description: parsed.data.description || null, cityId: parsed.data.cityId || null },
    })

    revalidatePath('/admin/donate')
    revalidatePath('/donate')
    return { success: true }
  } catch (error) {
    console.error('[createDonateLinkAction] ошибка:', error)
    return { error: 'Не удалось создать ссылку' }
  }
})

export const updateDonateLinkAction = adminGuard(async (id: string, formData: unknown) => {
  const parsed = DonateLinkSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Ошибка' }
  }

  try {
    await prisma.donateLink.update({
      where: { id },
      data: { ...parsed.data, description: parsed.data.description || null, cityId: parsed.data.cityId || null },
    })

    revalidatePath('/admin/donate')
    revalidatePath('/donate')
    return { success: true }
  } catch (error) {
    console.error('[updateDonateLinkAction] ошибка:', error)
    return { error: 'Не удалось обновить ссылку' }
  }
})

export const deleteDonateLinkAction = adminGuard(async (id: string) => {
  try {
    await prisma.donateLink.delete({ where: { id } })

    revalidatePath('/admin/donate')
    revalidatePath('/donate')
    return { success: true }
  } catch (error) {
    console.error('[deleteDonateLinkAction] ошибка:', error)
    return { error: 'Не удалось удалить ссылку' }
  }
})
