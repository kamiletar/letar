'use server'

/**
 * Server Action — обновление профиля поэта (bio + socialLinks)
 */

import { prisma } from '@/lib/db'
import { requirePoetAction } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const SocialLinkSchema = z.object({
  platform: z.string().min(1),
  url: z.string().url(),
})

const UpdatePoetProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  socialLinks: z.array(SocialLinkSchema).optional(),
})

export async function updatePoetProfileAction(input: unknown) {
  const auth = await requirePoetAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = UpdatePoetProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Проверьте заполнение формы' }
  }

  const { bio, socialLinks } = parsed.data

  try {
    await prisma.player.update({
      where: { id: auth.poet.playerId },
      data: {
        bio: bio?.trim() || null,
        ...(socialLinks !== undefined ? { socialLinks: socialLinks.length > 0 ? socialLinks : [] } : {}),
      },
    })

    revalidatePath('/poet/profile')
    revalidatePath(`/players/${auth.poet.playerSlug}`)
    return { success: true }
  } catch {
    return { error: 'Не удалось обновить профиль' }
  }
}
