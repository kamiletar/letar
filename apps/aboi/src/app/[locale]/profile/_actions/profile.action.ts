'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'
import { requireAuth } from '@/lib/auth-utils'
import { prismaAuth } from '@/lib/prisma'

// =============================================================================
// Адреса
// =============================================================================

const AddressInputSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    phone: z.string().min(5).max(40),
    country: z.string().min(2).max(64).default('RU'),
    region: z.string().min(2).max(120),
    city: z.string().min(2).max(120),
    street: z.string().min(2).max(200),
    building: z.string().min(1).max(40),
    apartment: z.string().max(40).optional().nullable(),
    postalCode: z.string().min(4).max(12),
    isDefault: z.boolean().default(false),
  })
  .strip()

export type AddressInput = z.infer<typeof AddressInputSchema>

export interface ActionResult {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function createAddressAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth()
  const parsed = AddressInputSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> }
  }

  if (parsed.data.isDefault) {
    await prismaAuth.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } })
  }

  await prismaAuth.address.create({ data: { ...parsed.data, userId: user.id } })
  revalidatePath('/profile/addresses')
  return { ok: true }
}

export async function updateAddressAction(id: string, raw: unknown): Promise<ActionResult> {
  const user = await requireAuth()
  const parsed = AddressInputSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> }
  }

  const existing = await prismaAuth.address.findFirst({ where: { id, userId: user.id } })
  if (!existing) return { ok: false, error: 'Адрес не найден' }

  if (parsed.data.isDefault && !existing.isDefault) {
    await prismaAuth.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } })
  }

  await prismaAuth.address.update({ where: { id }, data: parsed.data })
  revalidatePath('/profile/addresses')
  return { ok: true }
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  const user = await requireAuth()
  const existing = await prismaAuth.address.findFirst({ where: { id, userId: user.id } })
  if (!existing) return { ok: false, error: 'Адрес не найден' }

  await prismaAuth.address.delete({ where: { id } })
  revalidatePath('/profile/addresses')
  return { ok: true }
}

// =============================================================================
// Избранное
// =============================================================================

export async function toggleWishlistAction(productId: string): Promise<ActionResult & { added?: boolean }> {
  const user = await requireAuth()

  const existing = await prismaAuth.wishlist.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  })

  if (existing) {
    await prismaAuth.wishlist.delete({ where: { id: existing.id } })
    revalidatePath('/profile/favorites')
    return { ok: true, added: false }
  }

  await prismaAuth.wishlist.create({ data: { userId: user.id, productId } })
  revalidatePath('/profile/favorites')
  return { ok: true, added: true }
}

// =============================================================================
// Настройки профиля
// =============================================================================

const ProfileSettingsSchema = z
  .object({
    name: z.string().min(2).max(120),
    phone: z.string().max(40).optional().nullable(),
  })
  .strip()

export async function updateProfileSettingsAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth()
  const parsed = ProfileSettingsSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> }
  }

  await prismaAuth.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
    },
  })

  revalidatePath('/profile')
  revalidatePath('/profile/settings')
  return { ok: true }
}

/**
 * 152-ФЗ — право на удаление аккаунта.
 * Каскадно удаляются: Account, Session, UserProfile, Address, Cart, CartItem, Wishlist.
 * Заказы НЕ удаляем — они нужны для отчётности; userId обнуляется (SetNull).
 * ConsentLog тоже сохраняется (SetNull).
 */
export async function deleteAccountAction(): Promise<ActionResult> {
  const user = await requireAuth()
  await prismaAuth.user.delete({ where: { id: user.id } })
  return { ok: true }
}
