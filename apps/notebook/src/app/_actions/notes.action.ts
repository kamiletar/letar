'use server'

import { getEnhancedPrisma } from '@/lib/db'
import { getOwner } from '@/lib/owner'
import { nextVersionInput, revertInput } from '@/lib/versions'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: ActionError }

type ActionError = 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'DATABASE_ERROR'

const SaveSchema = z
  .object({
    /** Не задан — создаём новую заметку */
    noteId: z.string().min(1).optional(),
    /** Версия, на основе которой правил клиент. Если её уже сдвинули с другого устройства — конфликт */
    baseVersionId: z.string().min(1).nullable().optional(),
    title: z.string().max(200),
    body: z.string().max(500_000),
    deviceId: z.string().max(100).nullable().optional(),
  })
  .strip()

const RevertSchema = z.object({ noteId: z.string().min(1), versionId: z.string().min(1) }).strip()
const DeleteSchema = z.object({ noteId: z.string().min(1) }).strip()

export interface SaveResult {
  /** `null`, если пустую новую заметку сохранять нечего */
  noteId: string | null
  /** `null`, если текст не менялся и новая версия не создавалась */
  versionId: string | null
}

/** Сохранить заметку: новая версия с родителем — текущей версией */
export async function saveNoteAction(input: unknown): Promise<ActionResult<SaveResult>> {
  const owner = await getOwner()
  if (!owner) {
    return { success: false, error: 'UNAUTHORIZED' }
  }
  const parsed = SaveSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }
  const { noteId, baseVersionId, title, body, deviceId } = parsed.data

  try {
    const db = getEnhancedPrisma(owner)
    const note = noteId
      ? await db.note.findFirst({
        where: { id: noteId, ownerId: owner.id, deletedAt: null },
      })
      : null
    if (noteId && !note) {
      return { success: false, error: 'NOT_FOUND' }
    }
    if (note && (note.currentVersionId ?? null) !== (baseVersionId ?? null)) {
      return { success: false, error: 'CONFLICT' }
    }

    const current = note?.currentVersionId
      ? await db.noteVersion.findUnique({ where: { id: note.currentVersionId } })
      : null
    const next = nextVersionInput(current, { title, body }, deviceId ?? null)
    if (!next) {
      return { success: true, data: { noteId: note?.id ?? null, versionId: null } }
    }

    const saved = await db.$transaction(async (tx) => {
      const target = note ?? await tx.note.create({ data: { ownerId: owner.id } })
      const version = await tx.noteVersion.create({ data: { ...next, noteId: target.id } })
      await tx.note.update({ where: { id: target.id }, data: { currentVersionId: version.id } })
      return { noteId: target.id, versionId: version.id }
    })
    revalidatePath('/')
    return { success: true, data: saved }
  } catch (error) {
    console.error('[saveNote] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/** Откатить заметку на старую версию: создаётся новая версия с тем же текстом */
export async function revertNoteAction(input: unknown): Promise<ActionResult<SaveResult>> {
  const owner = await getOwner()
  if (!owner) {
    return { success: false, error: 'UNAUTHORIZED' }
  }
  const parsed = RevertSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(owner)
    const note = await db.note.findFirst({ where: { id: parsed.data.noteId, ownerId: owner.id, deletedAt: null } })
    if (!note?.currentVersionId) {
      return { success: false, error: 'NOT_FOUND' }
    }
    const [current, target] = await Promise.all([
      db.noteVersion.findUnique({ where: { id: note.currentVersionId } }),
      db.noteVersion.findFirst({ where: { id: parsed.data.versionId, noteId: note.id } }),
    ])
    if (!current || !target) {
      return { success: false, error: 'NOT_FOUND' }
    }
    const next = revertInput(current, target)
    if (!next) {
      return { success: true, data: { noteId: note.id, versionId: null } }
    }

    const version = await db.$transaction(async (tx) => {
      const created = await tx.noteVersion.create({ data: { ...next, noteId: note.id } })
      await tx.note.update({ where: { id: note.id }, data: { currentVersionId: created.id } })
      return created
    })
    revalidatePath('/')
    revalidatePath(`/notes/${note.id}`)
    return { success: true, data: { noteId: note.id, versionId: version.id } }
  } catch (error) {
    console.error('[revertNote] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/** Мягкое удаление: заметка пропадает из списка, версии остаются */
export async function deleteNoteAction(input: unknown): Promise<ActionResult> {
  const owner = await getOwner()
  if (!owner) {
    return { success: false, error: 'UNAUTHORIZED' }
  }
  const parsed = DeleteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(owner)
    const result = await db.note.updateMany({
      where: { id: parsed.data.noteId, ownerId: owner.id, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    if (result.count === 0) {
      return { success: false, error: 'NOT_FOUND' }
    }
    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteNote] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}
