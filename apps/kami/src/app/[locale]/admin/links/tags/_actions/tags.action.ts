'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

const RenameSchema = z.object({ oldValue: z.string().min(1), newValue: z.string().trim().min(1).max(100) }).strip()
const NameSchema = z.object({ value: z.string().min(1) }).strip()

/** Переименовать категорию сразу у всех ссылок (scalar-поле — обычный updateMany) */
export async function renameCategoryAction(input: unknown): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }
  const parsed = RenameSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(session.user)
    await db.link.updateMany({
      where: { category: parsed.data.oldValue },
      data: { category: parsed.data.newValue },
    })
    revalidatePath('/admin/links')
    revalidatePath('/admin/links/tags')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[renameCategory] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/** Убрать категорию у всех ссылок, где она стоит (сама категория при этом не хранится отдельно — просто перестаёт встречаться) */
export async function deleteCategoryAction(input: unknown): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }
  const parsed = NameSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(session.user)
    await db.link.updateMany({
      where: { category: parsed.data.value },
      data: { category: null },
    })
    revalidatePath('/admin/links')
    revalidatePath('/admin/links/tags')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteCategory] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/**
 * Переименовать метку сразу у всех ссылок, где она встречается.
 * `tags` — Postgres-массив, `updateMany` не умеет менять элемент внутри массива —
 * проходим построчно (в масштабе личной коллекции ссылок это не проблема производительности).
 */
export async function renameTagAction(input: unknown): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }
  const parsed = RenameSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }
  const { oldValue, newValue } = parsed.data

  try {
    const db = getEnhancedPrisma(session.user)
    const links = await db.link.findMany({ where: { tags: { has: oldValue } }, select: { id: true, tags: true } })
    await db.$transaction(
      links.map((link) => {
        const tags = [...new Set(link.tags.map((t) => (t === oldValue ? newValue : t)))]
        return db.link.update({ where: { id: link.id }, data: { tags } })
      }),
    )
    revalidatePath('/admin/links')
    revalidatePath('/admin/links/tags')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[renameTag] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/** Удалить метку у всех ссылок, где она встречается */
export async function deleteTagAction(input: unknown): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }
  const parsed = NameSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }
  const { value } = parsed.data

  try {
    const db = getEnhancedPrisma(session.user)
    const links = await db.link.findMany({ where: { tags: { has: value } }, select: { id: true, tags: true } })
    await db.$transaction(
      links.map((link) =>
        db.link.update({ where: { id: link.id }, data: { tags: link.tags.filter((t) => t !== value) } })
      ),
    )
    revalidatePath('/admin/links')
    revalidatePath('/admin/links/tags')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteTag] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}
