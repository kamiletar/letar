'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { z } from 'zod/v4'
import type { ScaleCode } from '../_data/personality-types'
import { RANKS } from '../_data/ranks'
import { computeScoresCore, type QuizOptionData, type ScaleConfidence } from '../_lib/scoring-core'
import { buildSessionDynamics, type QuestionScoringRow } from '../_lib/session-dynamics'

/** Проверить, что текущий пользователь — психолог */
async function requirePsychologist() {
  const session = await getSession()
  if (!session) {
    throw new Error('Не авторизован')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, roles: true },
  })

  if (!user?.roles.includes('PSYCHOLOGIST')) {
    throw new Error('Доступ запрещён')
  }

  return { session, user }
}

/** Список клиентов психолога */
export async function getClientsListAction() {
  const { session, user } = await requirePsychologist()
  const db = getEnhancedPrisma(user)

  const links = await db.clientPsychologistLink.findMany({
    where: { psychologistId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  // Клиентов дочитываем raw-клиентом узким select: политика User открывает психологу только
  // АКТИВНЫХ клиентов, и через include отозвавший доступ клиент приходил null — список
  // падал целиком после первого же отзыва (.claude/docs/zenstack-required-relation-nested-select-null.md).
  // Имя и email отозванной связи психолог видел и раньше; данные прохождений закрыты политиками.
  const clients = await prisma.user.findMany({
    where: { id: { in: [...new Set(links.map((l) => l.clientId))] } },
    select: { id: true, name: true, email: true, image: true },
  })
  const byId = new Map(clients.map((c) => [c.id, c]))

  // Ранг (для фильтра) — только по активным связям: у отозвавшего доступ клиента данные его
  // активности психологу больше не принадлежат. Кэш лидерборда — raw prisma, как и запись в него
  const activeIds = links.filter((l) => l.status === 'ACTIVE').map((l) => l.clientId)
  const entries = activeIds.length > 0
    ? await prisma.quizLeaderboardEntry.findMany({
      where: { userId: { in: activeIds } },
      select: { userId: true, rankCode: true },
    })
    : []
  const tierByUser = new Map(entries.map((e) => [e.userId, RANKS.find((r) => r.code === e.rankCode)?.tier ?? null]))

  return {
    data: links.flatMap((link) => {
      const client = byId.get(link.clientId)
      if (!client) {
        return []
      }
      return [{
        id: link.id,
        clientId: client.id,
        clientName: link.displayName || client.name || client.email,
        clientEmail: client.email,
        clientImage: client.image,
        displayName: link.displayName,
        status: link.status,
        createdAt: link.createdAt,
        rankTier: link.status === 'ACTIVE' ? tierByUser.get(client.id) ?? null : null,
      }]
    }),
  }
}

/** Детальная информация о клиенте для психолога */
export async function getClientDetailAction(clientId: string) {
  const { session, user } = await requirePsychologist()
  const db = getEnhancedPrisma(user)

  // Проверяем связь
  const link = await db.clientPsychologistLink.findFirst({
    where: {
      psychologistId: session.user.id,
      clientId,
      status: 'ACTIVE',
    },
    include: {
      client: { select: { id: true, name: true, email: true, image: true } },
      notes: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!link) {
    return { error: 'Клиент не найден или доступ отозван' }
  }

  // Все ответы клиента (с сессией — для динамики по сессиям)
  const answeredData = await db.quizAnswer.findMany({
    where: { session: { userId: clientId } },
    select: { sessionId: true, questionId: true, selectedOption: true },
  })

  // Вопросы банка — один запрос и для кумулятивного профиля, и для пересчёта сессий
  const questionIds = [...new Set(answeredData.map((a) => a.questionId).filter((id): id is string => !!id))]
  const questionRows = questionIds.length > 0
    ? await db.quizQuestion.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, sortOrder: true, options: true },
    })
    : []
  const questions: QuestionScoringRow[] = questionRows.map((q) => ({
    id: q.id,
    sortOrder: q.sortOrder,
    options: JSON.parse(q.options) as QuizOptionData[],
  }))
  const questionById = new Map(questions.map((q) => [q.id, q]))

  // Уникальные ответы (берём последний)
  const uniqueAnswered = new Map<string, number>()
  for (const a of answeredData) {
    if (a.questionId) {
      uniqueAnswered.set(a.questionId, a.selectedOption)
    }
  }

  // Кумулятивные баллы. Вместе с ними — relevantCounts и confidence: без числа
  // отвеченных вопросов по шкале нельзя отличить «нет данных» от честного нуля
  // (нужно индексу «Тёмное ядро»), а ipsative-ранжирование в ProfileDetails без
  // relevantCounts вообще не срабатывает.
  let cumulativeScores: Record<ScaleCode, number> | null = null
  let scoreRelevantCounts: Record<ScaleCode, number> | null = null
  let scoreConfidence: Record<ScaleCode, ScaleConfidence> | null = null
  if (uniqueAnswered.size > 0) {
    const answered = [...uniqueAnswered].flatMap(([questionId, selectedOption]) => {
      const q = questionById.get(questionId)
      return q ? [{ sortOrder: q.sortOrder, selectedOption, options: q.options }] : []
    })
    const scores = computeScoresCore(answered)
    cumulativeScores = scores.normalized
    scoreRelevantCounts = scores.relevantCounts
    scoreConfidence = scores.confidence
  }

  // История сессий для графиков динамики. Только валидные протоколы: невалидные не идут
  // в динамику (schema.zmodel, QuizSession.isValid). questionBankVersion — чтобы график
  // не сравнивал молча сессии несопоставимых версий банка
  const sessions = await db.quizSession.findMany({
    where: { userId: clientId, completedAt: { not: null }, isValid: true },
    select: {
      id: true,
      answeredCount: true,
      completedAt: true,
      createdAt: true,
      questionBankVersion: true,
      moodValence: true,
    },
    orderBy: { completedAt: 'asc' },
  })

  // Баллы и индекс ядра каждой сессии — пересчётом по её ответам (в scores лежат сырые
  // баллы, несравнимые между сессиями), см. _lib/session-dynamics.ts
  const sessionsHistory = buildSessionDynamics(sessions, answeredData, questions)

  return {
    data: {
      link: {
        id: link.id,
        displayName: link.displayName,
        createdAt: link.createdAt,
      },
      client: link.client,
      cumulativeScores,
      scoreRelevantCounts,
      scoreConfidence,
      totalAnswered: uniqueAnswered.size,
      sessionsHistory,
      notes: link.notes.map((n) => ({
        id: n.id,
        content: n.content,
        createdAt: n.createdAt,
      })),
    },
  }
}

/** Обновить отображаемое имя клиента */
const UpdateDisplayNameSchema = z
  .object({
    linkId: z.string(),
    displayName: z.string().max(100).optional(),
  })
  .strip()

export async function updateDisplayNameAction(input: unknown) {
  const { user } = await requirePsychologist()
  const db = getEnhancedPrisma(user)

  const parsed = UpdateDisplayNameSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  await db.clientPsychologistLink.update({
    where: { id: parsed.data.linkId },
    data: { displayName: parsed.data.displayName || null },
  })

  return { data: { success: true } }
}

/** Добавить заметку */
const AddNoteSchema = z
  .object({
    linkId: z.string(),
    content: z.string().min(1).max(5000),
  })
  .strip()

export async function addNoteAction(input: unknown) {
  const { user } = await requirePsychologist()
  const db = getEnhancedPrisma(user)

  const parsed = AddNoteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const note = await db.psychologistNote.create({
    data: {
      linkId: parsed.data.linkId,
      content: parsed.data.content,
    },
  })

  return { data: note }
}

/** Удалить заметку */
export async function deleteNoteAction(noteId: string) {
  const { user } = await requirePsychologist()
  const db = getEnhancedPrisma(user)

  await db.psychologistNote.delete({ where: { id: noteId } })

  return { data: { success: true } }
}
