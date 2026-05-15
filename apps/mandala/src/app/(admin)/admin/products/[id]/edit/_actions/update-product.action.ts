'use server'

import { assertAdminAuth, handleUniqueConstraintError, type MutationResult } from '@/lib/actions'
import { redirect } from 'next/navigation'
import { type UpdateProductInput, updateProductSchema } from '../../../_schemas/product.schema'

export async function updateProduct(productId: string, data: UpdateProductInput): Promise<MutationResult> {
  const { db } = await assertAdminAuth()

  const parsed = updateProductSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  try {
    // Обновляем товар в транзакции
    await db.$transaction(async (tx) => {
      // 1. Обновляем основные данные товара
      await tx.product.update({
        where: { id: productId },
        data: {
          slug: parsed.data.slug,
          name: parsed.data.name,
          description: parsed.data.description,
          price: parsed.data.price,
          // currency не обновляем — используется значение из БД
          metaTitle: parsed.data.metaTitle || null,
          metaDescription: parsed.data.metaDescription || null,
          // OG Image через FK
          ogImageId: parsed.data.ogImageId || null,
          order: parsed.data.order,
          published: parsed.data.published,
          stock: parsed.data.stock,
          // inStock вычисляется автоматически при изменении stock
          ...(parsed.data.stock !== undefined && { inStock: parsed.data.stock > 0 }),
        },
      })

      // 2. Обновляем изображения если переданы
      if (parsed.data.productImages !== undefined) {
        // Удаляем старые
        await tx.productImage.deleteMany({
          where: { productId },
        })

        // Создаём новые
        if (parsed.data.productImages.length > 0) {
          await tx.productImage.createMany({
            data: parsed.data.productImages.map((img) => ({
              productId,
              imageId: img.imageId,
              order: img.order,
            })),
          })
        }
      }
    })
  } catch (error) {
    console.error('Failed to update Product:', error)

    const uniqueError = handleUniqueConstraintError(error, 'slug', 'Товар с таким slug уже существует')
    if (uniqueError) {
      return uniqueError
    }

    return { success: false, error: 'Не удалось обновить товар. Попробуйте еще раз.' }
  }

  // redirect вне try/catch — он выбрасывает NEXT_REDIRECT исключение
  redirect(`/admin/products/${productId}`)
}
