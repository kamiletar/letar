'use server'

/**
 * Server Actions для управления стихами поэта.
 *
 * - createPoemAction — создание нового стиха
 * - updatePoemAction — редактирование существующего
 * - deletePoemAction — удаление стиха
 */

import { prisma } from '@/lib/db'
import { requirePoetAction } from '@/lib/roles'
import { transliterate } from '@/lib/transliterate'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Создание стиха ===

const CreatePoemSchema = z
  .object({
    title: z.string().min(1, 'Укажите название').max(500),
    text: z.string().min(1, 'Текст стиха обязателен'),
    coverImage: z.string().max(2000).optional().nullable(),
    published: z.boolean().default(false),
  })
  .strip()

export async function createPoemAction(input: unknown) {
  const auth = await requirePoetAction()
  if (!auth.success) { return { error: auth.error } }

  const parsed = CreatePoemSchema.safeParse(input)
  if (!parsed.success) { return { error: 'Проверьте заполнение формы' } }

  const { title, text, coverImage, published } = parsed.data

  // Генерация slug из названия
  let slug = transliterate(title)
  const existing = await prisma.poem.findUnique({ where: { slug } })
  if (existing) { slug = `${slug}-${Date.now().toString(36)}` }

  try {
    await prisma.poem.create({
      data: {
        title,
        slug,
        text,
        coverImage: coverImage || null,
        published,
        playerId: auth.poet.playerId,
      },
    })

    revalidatePath('/poet/poems')
    return { success: true }
  } catch (error) {
    console.error('[createPoemAction] ошибка:', error)
    return { error: 'Не удалось создать стихотворение' }
  }
}

// === Обновление стиха ===

const UpdatePoemSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1, 'Укажите название').max(500),
    text: z.string().min(1, 'Текст стиха обязателен'),
    coverImage: z.string().max(2000).optional().nullable(),
    published: z.boolean().default(false),
  })
  .strip()

export async function updatePoemAction(input: unknown) {
  const auth = await requirePoetAction()
  if (!auth.success) { return { error: auth.error } }

  const parsed = UpdatePoemSchema.safeParse(input)
  if (!parsed.success) { return { error: 'Проверьте заполнение формы' } }

  const { id, title, text, coverImage, published } = parsed.data

  // Проверяем что стих принадлежит текущему поэту
  const poem = await prisma.poem.findUnique({
    where: { id },
    select: { playerId: true },
  })

  if (!poem) { return { error: 'Стихотворение не найдено' } }
  if (poem.playerId !== auth.poet.playerId) { return { error: 'Нет прав на редактирование' } }

  // Обновление slug при изменении названия
  let slug = transliterate(title)
  const existingSlug = await prisma.poem.findUnique({ where: { slug } })
  if (existingSlug && existingSlug.id !== id) { slug = `${slug}-${Date.now().toString(36)}` }

  try {
    await prisma.poem.update({
      where: { id },
      data: {
        title,
        slug,
        text,
        coverImage: coverImage || null,
        published,
      },
    })

    revalidatePath('/poet/poems')
    return { success: true }
  } catch (error) {
    console.error('[updatePoemAction] ошибка:', error)
    return { error: 'Не удалось обновить стихотворение' }
  }
}

// === Удаление стиха ===

const DeletePoemSchema = z.object({ id: z.string().min(1) }).strip()

export async function deletePoemAction(input: unknown) {
  const auth = await requirePoetAction()
  if (!auth.success) { return { error: auth.error } }

  const parsed = DeletePoemSchema.safeParse(input)
  if (!parsed.success) { return { error: 'Некорректные данные' } }

  // Проверяем принадлежность
  const poem = await prisma.poem.findUnique({
    where: { id: parsed.data.id },
    select: { playerId: true },
  })

  if (!poem) { return { error: 'Стихотворение не найдено' } }
  if (poem.playerId !== auth.poet.playerId) { return { error: 'Нет прав на удаление' } }

  try {
    await prisma.poem.delete({ where: { id: parsed.data.id } })
    revalidatePath('/poet/poems')
    return { success: true }
  } catch (error) {
    console.error('[deletePoemAction] ошибка:', error)
    return { error: 'Не удалось удалить стихотворение' }
  }
}
