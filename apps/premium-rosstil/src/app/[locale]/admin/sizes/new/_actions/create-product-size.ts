'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type ProductSizeFormData, ProductSizeFormSchema } from '../../_schemas/product-size-form.schema'

export type CreateProductSizeResult =
  | { success: true; redirect: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

/**
 * Server action for creating a new ProductSize record.
 */
export async function createProductSize(data: ProductSizeFormData): Promise<CreateProductSizeResult> {
  // 1. Authenticate and check admin role
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Требуются права администратора' }
  }

  // 2. Validate form data
  const parsed = ProductSizeFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data

  // 3. Get enhanced Prisma client with ZenStack policies
  const db = getEnhancedPrisma(session.user)

  // 4. Try to create the record
  try {
    await db.productSize.create({
      data: {
        gender: validatedData.gender,
        international: validatedData.international,
        ru: validatedData.ru,
        de: validatedData.de,
        it: validatedData.it,
        fr: validatedData.fr,
        uk: validatedData.uk,
        us: validatedData.us,
        jeansFrom: validatedData.jeansFrom,
        jeansTo: validatedData.jeansTo,
        bustMin: validatedData.bustMin,
        bustMax: validatedData.bustMax,
        waistMin: validatedData.waistMin,
        waistMax: validatedData.waistMax,
        hipsMin: validatedData.hipsMin,
        hipsMax: validatedData.hipsMax,
        sortOrder: validatedData.sortOrder,
      },
    })
  } catch (error) {
    console.error('Failed to create ProductSize:', error)

    // Check if it's a unique constraint violation (Prisma error P2002)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return {
        success: false,
        error: 'Размер с таким значением RU и полом уже существует',
        fieldErrors: { ru: ['Размер с таким значением RU и полом уже существует'] },
      }
    }

    return { success: false, error: 'Не удалось создать размер. Попробуйте еще раз.' }
  }

  // 5. Return success with redirect
  return { success: true, redirect: '/admin/sizes' }
}
