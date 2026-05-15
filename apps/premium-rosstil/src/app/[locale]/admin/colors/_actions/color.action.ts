'use server'

import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { type ColorFormData, ColorFormSchema } from '../_schemas/color.schema'

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

/**
 * Создание нового цвета
 */
export async function createColor(input: ColorFormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  const parsed = ColorFormSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Некорректные данные' }
  }

  try {
    // Проверка уникальности
    const existingByName = await db.color.findUnique({ where: { name: parsed.data.name } })
    if (existingByName) {
      return { success: false, error: 'Цвет с таким названием уже существует' }
    }

    const existingBySlug = await db.color.findUnique({ where: { slug: parsed.data.slug } })
    if (existingBySlug) {
      return { success: false, error: 'Цвет с таким slug уже существует' }
    }

    const color = await db.color.create({
      data: parsed.data,
    })

    revalidatePath('/admin/colors')
    return { success: true, data: { id: color.id } }
  } catch (error) {
    console.error('Failed to create color:', error)
    return { success: false, error: 'Не удалось создать цвет' }
  }
}

/**
 * Обновление цвета
 */
export async function updateColor(id: string, input: ColorFormData): Promise<ActionResult> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  const parsed = ColorFormSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Некорректные данные' }
  }

  try {
    // Проверка существования
    const existing = await db.color.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: 'Цвет не найден' }
    }

    // Проверка уникальности name (исключая текущий)
    const existingByName = await db.color.findFirst({
      where: { name: parsed.data.name, NOT: { id } },
    })
    if (existingByName) {
      return { success: false, error: 'Цвет с таким названием уже существует' }
    }

    // Проверка уникальности slug (исключая текущий)
    const existingBySlug = await db.color.findFirst({
      where: { slug: parsed.data.slug, NOT: { id } },
    })
    if (existingBySlug) {
      return { success: false, error: 'Цвет с таким slug уже существует' }
    }

    await db.color.update({
      where: { id },
      data: parsed.data,
    })

    revalidatePath('/admin/colors')
    revalidatePath(`/admin/colors/${id}/edit`)
    return { success: true }
  } catch (error) {
    console.error('Failed to update color:', error)
    return { success: false, error: 'Не удалось обновить цвет' }
  }
}

/**
 * Удаление цвета
 */
export async function deleteColor(id: string): Promise<ActionResult> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  try {
    // Проверка использования
    const usageCount = await db.productVariant.count({
      where: { colorId: id },
    })

    if (usageCount > 0) {
      return {
        success: false,
        error: `Этот цвет используется в ${usageCount} вариантах товаров. Сначала измените цвет в этих вариантах.`,
      }
    }

    await db.color.delete({ where: { id } })

    revalidatePath('/admin/colors')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete color:', error)
    return { success: false, error: 'Не удалось удалить цвет' }
  }
}

/**
 * Создание предустановленных цветов
 */
export async function seedDefaultColors(): Promise<ActionResult<{ created: number }>> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  const defaultColors = [
    { name: 'Чёрный', slug: 'black', hex: '#000000' },
    { name: 'Белый', slug: 'white', hex: '#FFFFFF' },
    { name: 'Бежевый', slug: 'beige', hex: '#F5F5DC' },
    { name: 'Серый', slug: 'gray', hex: '#808080' },
    { name: 'Синий', slug: 'blue', hex: '#0000FF' },
    { name: 'Красный', slug: 'red', hex: '#FF0000' },
    { name: 'Золотой', slug: 'gold', hex: '#CA9E67' },
    { name: 'Розовый', slug: 'pink', hex: '#FFC0CB' },
    { name: 'Коричневый', slug: 'brown', hex: '#8B4513' },
  ]

  try {
    let created = 0

    for (const color of defaultColors) {
      const existing = await db.color.findFirst({
        where: { OR: [{ name: color.name }, { slug: color.slug }] },
      })

      if (!existing) {
        await db.color.create({ data: color })
        created++
      }
    }

    revalidatePath('/admin/colors')
    return { success: true, data: { created } }
  } catch (error) {
    console.error('Failed to seed colors:', error)
    return { success: false, error: 'Не удалось создать предустановленные цвета' }
  }
}
