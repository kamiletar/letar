'use server'

import { getDbUser, getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { z } from 'zod/v4'

/** Максимальная длина сообщения клиенту — в символах */
const MESSAGE_MAX_LENGTH = 2000

/** Потолок получателей одной рассылки — защита от случайного огромного `linkIds` */
const MAX_RECIPIENTS = 500

/** Сколько последних сообщений показывать клиенту в настройках */
const INBOX_LIMIT = 50

const SendMessagesSchema = z
  .object({
    // Либо конкретные связи (карточка клиента), либо все активные (кнопка в списке)
    linkIds: z.array(z.string().min(1)).min(1).max(MAX_RECIPIENTS).optional(),
    allActive: z.boolean().optional(),
    body: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
  })
  .strip()
  .refine((v) => v.allActive === true || (v.linkIds?.length ?? 0) > 0)

/**
 * Психолог пишет привязанным клиентам: одному (карточка) или всем активным (список).
 *
 * Адресаты — только свои ACTIVE-связи, отобранные enhanced-клиентом; чужие и отозванные `linkIds`
 * молча отсеиваются здесь, а если что-то проскочит — create режет политика `PsychologistMessage`.
 */
export async function sendMessagesAction(input: unknown) {
  const session = await getSession()
  if (!session) {
    return { error: 'Не авторизован' }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, roles: true },
  })
  if (!user?.roles.includes('PSYCHOLOGIST')) {
    return { error: 'Доступ запрещён' }
  }

  const parsed = SendMessagesSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }
  const { linkIds, allActive, body } = parsed.data

  const db = getEnhancedPrisma(user)
  const links = await db.clientPsychologistLink.findMany({
    where: {
      psychologistId: user.id,
      status: 'ACTIVE',
      ...(allActive ? {} : { id: { in: linkIds ?? [] } }),
    },
    select: { id: true },
    take: MAX_RECIPIENTS,
  })

  if (links.length === 0) {
    return { error: 'Нет активных клиентов для сообщения' }
  }

  // Одна транзакция: либо сообщение получили все адресаты рассылки, либо никто
  await db.$transaction(async (tx) => {
    for (const link of links) {
      await tx.psychologistMessage.create({ data: { linkId: link.id, body }, select: { id: true } })
    }
  })

  return { data: { sent: links.length } }
}

/** Сообщение от психолога глазами клиента */
export interface ClientMessage {
  id: string
  body: string
  createdAt: Date
  readAt: Date | null
  psychologistName: string
}

/** Сообщения от привязанных психологов (для клиента, раздел в настройках) */
export async function getMyMessagesAction(): Promise<{ data: ClientMessage[] }> {
  const session = await getSession()
  if (!session) {
    return { data: [] }
  }

  // Прочитав свою связь, клиент видит сообщения по ней — в том числе после отзыва доступа:
  // написанное психологом раньше остаётся у клиента
  const db = getEnhancedPrisma(await getDbUser(session))
  const messages = await db.psychologistMessage.findMany({
    where: { link: { clientId: session.user.id } },
    select: { id: true, body: true, createdAt: true, readAt: true, link: { select: { psychologistId: true } } },
    orderBy: { createdAt: 'desc' },
    take: INBOX_LIMIT,
  })

  // Имя психолога — raw-клиентом узким select: политика User открывает клиенту только его
  // самого, через include психолог пришёл бы null
  // (.claude/docs/zenstack-required-relation-nested-select-null.md)
  const psychologists = await prisma.user.findMany({
    where: { id: { in: [...new Set(messages.map((m) => m.link.psychologistId))] } },
    select: { id: true, name: true, email: true },
  })
  const nameById = new Map(psychologists.map((p) => [p.id, p.name || p.email]))

  return {
    data: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      readAt: m.readAt,
      psychologistName: nameById.get(m.link.psychologistId) ?? '',
    })),
  }
}

/**
 * Клиент отмечает свои сообщения прочитанными.
 *
 * Права на update у клиента в политике нет намеренно (иначе он мог бы переписать `body`):
 * id отбираются enhanced-чтением со своей связью, а запись — raw-клиентом и только поля `readAt`.
 */
export async function markMyMessagesReadAction() {
  const session = await getSession()
  if (!session) {
    return { error: 'Не авторизован' }
  }

  const db = getEnhancedPrisma(await getDbUser(session))
  const unread = await db.psychologistMessage.findMany({
    where: { link: { clientId: session.user.id }, readAt: null },
    select: { id: true },
  })

  if (unread.length === 0) {
    return { data: { marked: 0 } }
  }

  const { count } = await prisma.psychologistMessage.updateMany({
    where: { id: { in: unread.map((m) => m.id) }, readAt: null },
    data: { readAt: new Date() },
  })

  return { data: { marked: count } }
}
