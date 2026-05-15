'use server'

import { requireAdmin } from '@/lib/auth-utils'
import { prismaAuth } from '@/lib/prisma'
import { slugify } from '@/lib/slugify'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const ProductInputSchema = z
  .object({
    name: z.string().min(2).max(120),
    slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис').optional(),
    description: z.string().max(5000).optional(),
    pricePerMeter: z.coerce.number().int().min(1, 'Цена должна быть > 0'),
    minLengthMeters: z.coerce.number().min(0.1).max(1000).default(1),
    affirmations: z.array(z.string().min(1).max(50)).max(20).default([]),
    published: z.coerce.boolean().default(false),
  })
  .strip()

export type ProductInput = z.infer<typeof ProductInputSchema>

export interface ActionResult<T = void> {
  ok: boolean
  data?: T
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function createProductAction(raw: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin()
  const parsed = ProductInputSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> }
  }

  const slug = (parsed.data.slug ?? slugify(parsed.data.name)).slice(0, 80)
  if (!slug) {
    return { ok: false, error: 'Не удалось сгенерировать slug — введите вручную' }
  }

  // Уникальность slug (включая soft-deleted чтобы не было конфликта при восстановлении)
  const collision = await prismaAuth.product.findUnique({ where: { slug } })
  if (collision) {
    return { ok: false, error: `Slug "${slug}" уже используется` }
  }

  const product = await prismaAuth.product.create({
    data: {
      slug,
      name: parsed.data.name,
      description: parsed.data.description,
      pricePerMeter: parsed.data.pricePerMeter,
      minLengthMeters: parsed.data.minLengthMeters,
      affirmations: parsed.data.affirmations,
      published: parsed.data.published,
    },
  })

  revalidatePath('/admin/products')
  revalidatePath('/catalog')
  return { ok: true, data: { id: product.id, slug: product.slug } }
}

export async function updateProductAction(id: string, raw: unknown): Promise<ActionResult> {
  await requireAdmin()
  const parsed = ProductInputSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> }
  }

  const slug = (parsed.data.slug ?? slugify(parsed.data.name)).slice(0, 80)
  if (!slug) {
    return { ok: false, error: 'Не удалось сгенерировать slug' }
  }

  // Проверяем что slug не занят другим товаром
  const collision = await prismaAuth.product.findFirst({ where: { slug, NOT: { id } } })
  if (collision) {
    return { ok: false, error: `Slug "${slug}" уже используется другим товаром` }
  }

  await prismaAuth.product.update({
    where: { id },
    data: {
      slug,
      name: parsed.data.name,
      description: parsed.data.description,
      pricePerMeter: parsed.data.pricePerMeter,
      minLengthMeters: parsed.data.minLengthMeters,
      affirmations: parsed.data.affirmations,
      published: parsed.data.published,
    },
  })

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${id}`)
  revalidatePath('/catalog')
  revalidatePath(`/catalog/${slug}`)
  return { ok: true }
}

export async function softDeleteProductAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  await prismaAuth.product.update({
    where: { id },
    data: { deletedAt: new Date(), published: false },
  })
  revalidatePath('/admin/products')
  revalidatePath('/catalog')
  return { ok: true }
}

export async function restoreProductAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  await prismaAuth.product.update({ where: { id }, data: { deletedAt: null } })
  revalidatePath('/admin/products')
  return { ok: true }
}

export async function setPublishedAction(id: string, published: boolean): Promise<ActionResult> {
  await requireAdmin()
  await prismaAuth.product.update({ where: { id }, data: { published } })
  revalidatePath('/admin/products')
  revalidatePath('/catalog')
  return { ok: true }
}

export async function addProductImageAction(productId: string, imageId: string): Promise<ActionResult> {
  await requireAdmin()
  const last = await prismaAuth.productImage.findFirst({
    where: { productId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })
  await prismaAuth.productImage.create({
    data: { productId, imageId, sortOrder: (last?.sortOrder ?? -1) + 1 },
  })
  revalidatePath(`/admin/products/${productId}`)
  return { ok: true }
}

export async function removeProductImageAction(productImageId: string): Promise<ActionResult> {
  await requireAdmin()
  const pi = await prismaAuth.productImage.findUnique({ where: { id: productImageId } })
  if (!pi) return { ok: false, error: 'Не найдено' }
  await prismaAuth.productImage.delete({ where: { id: productImageId } })
  revalidatePath(`/admin/products/${pi.productId}`)
  return { ok: true }
}

export async function moveProductImageAction(productImageId: string, direction: 'up' | 'down'): Promise<ActionResult> {
  await requireAdmin()
  const current = await prismaAuth.productImage.findUnique({ where: { id: productImageId } })
  if (!current) return { ok: false, error: 'Не найдено' }

  const neighbor = await prismaAuth.productImage.findFirst({
    where: {
      productId: current.productId,
      sortOrder: direction === 'up' ? { lt: current.sortOrder } : { gt: current.sortOrder },
    },
    orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
  })

  if (!neighbor) return { ok: true } // уже на краю

  // Свапаем sortOrder через временное значение (уникальный constraint? нет — но безопаснее)
  await prismaAuth.$transaction([
    prismaAuth.productImage.update({ where: { id: current.id }, data: { sortOrder: neighbor.sortOrder } }),
    prismaAuth.productImage.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } }),
  ])

  revalidatePath(`/admin/products/${current.productId}`)
  return { ok: true }
}
