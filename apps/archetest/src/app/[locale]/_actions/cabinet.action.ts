'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { z } from 'zod/v4'
import type { ScaleCode } from '../_data/personality-types'
import { calculateScores } from './quiz.action'

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
    include: {
      client: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    data: links.map((link) => ({
      id: link.id,
      clientId: link.client.id,
      clientName: link.displayName || link.client.name || link.client.email,
      clientEmail: link.client.email,
      clientImage: link.client.image,
      displayName: link.displayName,
      status: link.status,
      createdAt: link.createdAt,
    })),
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

  // Все ответы клиента
  const answeredData = await db.quizAnswer.findMany({
    where: { session: { userId: clientId } },
    select: { questionId: true, selectedOption: true },
  })

  // Уникальные ответы (берём последний)
  const uniqueAnswered = new Map<string, number>()
  for (const a of answeredData) {
    if (a.questionId) {
      uniqueAnswered.set(a.questionId, a.selectedOption)
    }
  }

  // Кумулятивные баллы
  let cumulativeScores: Record<ScaleCode, number> | null = null
  if (uniqueAnswered.size > 0) {
    const answersArray = Array.from(uniqueAnswered.entries()).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
    }))
    const scores = await calculateScores(answersArray, db)
    cumulativeScores = scores.normalized
  }

  // История сессий для графика динамики (questionBankVersion — чтобы график
  // не сравнивал молча сессии несопоставимых версий банка)
  const sessions = await db.quizSession.findMany({
    where: { userId: clientId, completedAt: { not: null } },
    select: {
      id: true,
      scores: true,
      answeredCount: true,
      completedAt: true,
      createdAt: true,
      questionBankVersion: true,
    },
    orderBy: { completedAt: 'asc' },
  })

  const sessionsHistory = sessions.map((s) => ({
    id: s.id,
    scores: s.scores ? (JSON.parse(s.scores) as Record<ScaleCode, number>) : null,
    answeredCount: s.answeredCount,
    completedAt: s.completedAt,
    createdAt: s.createdAt,
    questionBankVersion: s.questionBankVersion,
  }))

  return {
    data: {
      link: {
        id: link.id,
        displayName: link.displayName,
        createdAt: link.createdAt,
      },
      client: link.client,
      cumulativeScores,
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
