'use server'

import { getDbUser, getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { z } from 'zod/v4'

/** Самоназначение роли PSYCHOLOGIST */
export async function becomePsychologistAction() {
  const session = await getSession()
  if (!session) {
    return { error: 'Не авторизован' }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  })

  if (!user) {
    return { error: 'Пользователь не найден' }
  }

  if (user.roles.includes('PSYCHOLOGIST')) {
    return { data: { alreadyPsychologist: true } }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { roles: [...user.roles, 'PSYCHOLOGIST'] },
  })

  return { data: { success: true } }
}

const LinkPsychologistSchema = z
  .object({
    email: z.email(),
  })
  .strip()

/** Клиент привязывает психолога по email */
export async function linkPsychologistAction(input: unknown) {
  const session = await getSession()
  if (!session) {
    return { error: 'Не авторизован' }
  }

  const parsed = LinkPsychologistSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректный email' }
  }

  const { email } = parsed.data

  // Нельзя привязать себя
  if (email.toLowerCase() === session.user.email.toLowerCase()) {
    return { error: 'Нельзя привязать самого себя' }
  }

  // Ищем психолога по email
  const psychologist = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, roles: true, name: true, email: true },
  })

  if (!psychologist) {
    return { error: 'Пользователь с таким email не найден' }
  }

  if (!psychologist.roles.includes('PSYCHOLOGIST')) {
    return { error: 'Этот пользователь не является психологом на платформе' }
  }

  // Проверяем, нет ли уже активной связи
  const dbUser = await getDbUser(session)
  const db = getEnhancedPrisma(dbUser)

  const existing = await db.clientPsychologistLink.findUnique({
    where: { clientId_psychologistId: { clientId: session.user.id, psychologistId: psychologist.id } },
  })

  if (existing && existing.status === 'ACTIVE') {
    return { error: 'Этот психолог уже привязан' }
  }

  // Если была отозванная связь — реактивируем
  if (existing && existing.status === 'REVOKED') {
    await db.clientPsychologistLink.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE', revokedAt: null },
    })
    return { data: { psychologistName: psychologist.name, psychologistEmail: psychologist.email } }
  }

  // Создаём новую связь
  await db.clientPsychologistLink.create({
    data: {
      clientId: session.user.id,
      psychologistId: psychologist.id,
    },
  })

  return { data: { psychologistName: psychologist.name, psychologistEmail: psychologist.email } }
}

/** Клиент отзывает доступ психолога */
export async function revokePsychologistAction(linkId: string) {
  const session = await getSession()
  if (!session) {
    return { error: 'Не авторизован' }
  }

  const dbUser = await getDbUser(session)
  const db = getEnhancedPrisma(dbUser)

  const link = await db.clientPsychologistLink.findUnique({ where: { id: linkId } })
  if (!link || link.clientId !== session.user.id) {
    return { error: 'Связь не найдена' }
  }

  await db.clientPsychologistLink.update({
    where: { id: linkId },
    data: { status: 'REVOKED', revokedAt: new Date() },
  })

  return { data: { success: true } }
}

/** Получить список привязанных психологов (для клиента) */
export async function getMyLinkedPsychologistsAction() {
  const session = await getSession()
  if (!session) {
    return { data: [] }
  }

  const dbUser = await getDbUser(session)
  const db = getEnhancedPrisma(dbUser)

  const links = await db.clientPsychologistLink.findMany({
    where: { clientId: session.user.id },
    include: {
      psychologist: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return { data: links }
}
