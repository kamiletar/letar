/**
 * Серверная часть синхронизации стихов режима чтеца: загрузка копии и применение очереди
 * правок, накопленных без сети. Клиент — `src/lib/offline/poems-store.ts`.
 *
 * Принципы:
 * - правка стиха принимается, только если стих на сайте не менялся с момента, от которого
 *   правили (`baseUpdatedAt`); иначе — `conflict`, ничего не затирается;
 * - повторная отправка безопасна: ответ мог потеряться, поэтому «уже применено» считается успехом;
 * - стих чужого поэта для клиента выглядит как «не найден».
 */

import { prisma } from '@/lib/db'
import type { ChangeResult, ReaderPoem } from '@/lib/offline/poems-store'
import { transliterate } from '@/lib/transliterate'
import { z } from 'zod/v4'

const IdSchema = z.string().min(1).max(100)
const TitleSchema = z.string().trim().min(1).max(500)
const TextSchema = z.string().min(1).max(100_000)

const ChangeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), id: IdSchema, title: TitleSchema, text: TextSchema, published: z.boolean() }),
  z.object({
    kind: z.literal('update'),
    id: IdSchema,
    title: TitleSchema,
    text: TextSchema,
    published: z.boolean(),
    baseUpdatedAt: z.string().min(1).max(40),
  }),
  z.object({ kind: z.literal('delete'), id: IdSchema }),
])

/** Тело запроса синхронизации; `.strip()` отбрасывает всё, чего нет в схеме */
export const SyncRequestSchema = z.object({ changes: z.array(ChangeSchema).max(200) }).strip()

export type PoemChange = z.infer<typeof ChangeSchema>

/** Поля стиха, которые читает синхронизация */
interface PoemRow {
  id: string
  title: string
  text: string
  published: boolean
  updatedAt: Date
  playerId?: string
}

const POEM_SELECT = { id: true, title: true, text: true, published: true, updatedAt: true } as const

function toReaderPoem(row: PoemRow): ReaderPoem {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    published: row.published,
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** Все стихи поэта (с черновиками), новые первыми */
export async function loadPoetPoems(playerId: string): Promise<ReaderPoem[]> {
  const rows: PoemRow[] = await prisma.poem.findMany({
    where: { playerId },
    orderBy: { createdAt: 'desc' },
    select: POEM_SELECT,
  })
  return rows.map(toReaderPoem)
}

/** slug из названия; при совпадении с чужим стихом — с суффиксом (как в серверных действиях) */
async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const slug = transliterate(title)
  const taken = await prisma.poem.findUnique({ where: { slug }, select: { id: true } })
  return taken && taken.id !== excludeId ? `${slug}-${Date.now().toString(36)}` : slug
}

function sameDraft(row: PoemRow, change: { title: string; text: string; published: boolean }): boolean {
  return row.title === change.title && row.text === change.text && row.published === change.published
}

async function applyCreate(
  playerId: string,
  change: Extract<PoemChange, { kind: 'create' }>,
): Promise<ChangeResult> {
  // Повтор после потерянного ответа: такой же стих, созданный недавно, считаем уже созданным
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const duplicate: PoemRow | null = await prisma.poem.findFirst({
    where: { playerId, title: change.title, text: change.text, createdAt: { gte: since } },
    select: POEM_SELECT,
  })
  if (duplicate) {
    return { id: change.id, status: 'ok', poem: toReaderPoem(duplicate) }
  }

  const created: PoemRow = await prisma.poem.create({
    data: {
      title: change.title,
      slug: await uniqueSlug(change.title),
      text: change.text,
      published: change.published,
      playerId,
    },
    select: POEM_SELECT,
  })
  return { id: change.id, status: 'ok', poem: toReaderPoem(created) }
}

async function applyUpdate(
  playerId: string,
  change: Extract<PoemChange, { kind: 'update' }>,
): Promise<ChangeResult> {
  const current: PoemRow | null = await prisma.poem.findUnique({
    where: { id: change.id },
    select: { ...POEM_SELECT, playerId: true },
  })
  if (!current || current.playerId !== playerId) {
    return { id: change.id, status: 'missing' }
  }

  // Уже применено (повтор после потерянного ответа) — успех, без второй записи
  if (sameDraft(current, change)) {
    return { id: change.id, status: 'ok', poem: toReaderPoem(current) }
  }

  const base = new Date(change.baseUpdatedAt).getTime()
  if (Number.isNaN(base)) {
    return { id: change.id, status: 'invalid' }
  }
  if (current.updatedAt.getTime() !== base) {
    return { id: change.id, status: 'conflict', server: toReaderPoem(current) }
  }

  // slug меняем только вместе с названием: публичные ссылки на стих не должны ломаться зря
  const slug = current.title === change.title ? undefined : await uniqueSlug(change.title, change.id)
  const updated: PoemRow = await prisma.poem.update({
    where: { id: change.id },
    data: { title: change.title, text: change.text, published: change.published, ...(slug ? { slug } : {}) },
    select: POEM_SELECT,
  })
  return { id: change.id, status: 'ok', poem: toReaderPoem(updated) }
}

async function applyDelete(playerId: string, change: Extract<PoemChange, { kind: 'delete' }>): Promise<ChangeResult> {
  const current = await prisma.poem.findUnique({ where: { id: change.id }, select: { id: true, playerId: true } })
  if (!current) {
    // уже удалён — цель достигнута
    return { id: change.id, status: 'ok' }
  }
  if (current.playerId !== playerId) {
    return { id: change.id, status: 'missing' }
  }
  await prisma.poem.delete({ where: { id: change.id } })
  return { id: change.id, status: 'ok' }
}

/** Применяет правки по порядку; сбой одной не останавливает остальные */
export async function applyPoemChanges(playerId: string, changes: PoemChange[]): Promise<ChangeResult[]> {
  const results: ChangeResult[] = []

  for (const change of changes) {
    try {
      if (change.kind === 'create') {
        results.push(await applyCreate(playerId, change))
      } else if (change.kind === 'update') {
        results.push(await applyUpdate(playerId, change))
      } else {
        results.push(await applyDelete(playerId, change))
      }
    } catch (error) {
      console.error('[poet-poems-sync] ошибка применения правки:', change.kind, error)
      results.push({ id: change.id, status: 'error' })
    }
  }

  return results
}
