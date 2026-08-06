'use server'

import { assertAdminAuth, handleUniqueConstraintError, type MutationResult } from '@/lib/actions'
import { redirect } from 'next/navigation'
import { type CreateProductInput, createProductSchema } from '../../_schemas/product.schema'

export async function createProduct(data: CreateProductInput): Promise<MutationResult> {
  const { db } = await assertAdminAuth()

  const parsed = createProductSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  let productId: string

  try {
    const product = await db.product.create({
      data: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        // currency имеет @default("RUB") в схеме БД
        metaTitle: parsed.data.metaTitle || null,
        metaDescription: parsed.data.metaDescription || null,
        // OG Image через FK
        ogImageId: parsed.data.ogImageId || null,
        order: parsed.data.order ?? 0,
        published: parsed.data.published ?? true,
        stock: parsed.data.stock ?? 1,
        inStock: (parsed.data.stock ?? 1) > 0, // Вычисляется автоматически
        // Создаём ProductImage записи
        images: {
          create: parsed.data.productImages?.map((img) => ({
            imageId: img.imageId,
            order: img.order,
          })) ?? [],
        },
      },
    })

    productId = product.id
  } catch (error) {
    console.error('Failed to create Product:', error)

    const uniqueError = handleUniqueConstraintError(error, 'slug', 'Товар с таким slug уже существует')
    if (uniqueError) {
      return uniqueError
    }

    return { success: false, error: 'Не удалось создать товар. Попробуйте еще раз.' }
  }

  // redirect вне try/catch — он выбрасывает NEXT_REDIRECT исключение
  redirect(`/admin/products/${productId}`)
}
