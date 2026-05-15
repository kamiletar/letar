'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'
import { requireAdmin } from '@/lib/auth-utils'
import { prismaAuth } from '@/lib/prisma'

const PromoInputSchema = z
  .object({
    code: z.string().min(2).max(40).regex(/^[A-Z0-9_-]+$/i, 'Только латиница, цифры, _ и -'),
    type: z.enum(['PERCENT', 'FIXED']),
    /// PERCENT: 1..100; FIXED: копейки
    value: z.coerce.number().int().min(1),
    minOrderAmount: z.coerce.number().int().min(0).optional().nullable(),
    maxUses: z.coerce.number().int().min(1).optional().nullable(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional().nullable(),
    isActive: z.coerce.boolean().default(true),
  })
  .strip()

export interface PromoActionResult {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function createPromoAction(raw: unknown): Promise<PromoActionResult> {
  await requireAdmin()
  const parsed = PromoInputSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> }
  }
  const code = parsed.data.code.toUpperCase()
  if (parsed.data.type === 'PERCENT' && parsed.data.value > 100) {
    return { ok: false, error: 'Процент не может быть больше 100' }
  }
  const collision = await prismaAuth.promo.findUnique({ where: { code } })
  if (collision) return { ok: false, error: `Промокод "${code}" уже существует` }

  await prismaAuth.promo.create({
    data: {
      code,
      type: parsed.data.type,
      value: parsed.data.value,
      minOrderAmount: parsed.data.minOrderAmount ?? null,
      maxUses: parsed.data.maxUses ?? null,
      validFrom: parsed.data.validFrom ?? new Date(),
      validUntil: parsed.data.validUntil ?? null,
      isActive: parsed.data.isActive,
    },
  })
  revalidatePath('/admin/promos')
  return { ok: true }
}

export async function setPromoActiveAction(id: string, active: boolean): Promise<PromoActionResult> {
  await requireAdmin()
  await prismaAuth.promo.update({ where: { id }, data: { isActive: active } })
  revalidatePath('/admin/promos')
  return { ok: true }
}

export async function deletePromoAction(id: string): Promise<PromoActionResult> {
  await requireAdmin()
  await prismaAuth.promo.delete({ where: { id } })
  revalidatePath('/admin/promos')
  return { ok: true }
}
