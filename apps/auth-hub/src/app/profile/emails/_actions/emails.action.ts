'use server'

import { auth, requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@letar/email'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { z } from 'zod/v4'

const ADD_EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 часа

const AddEmailSchema = z.object({ email: z.email() }).strip()

/**
 * Запрашивает добавление дополнительного email к аккаунту (Этап 8.5 корневого PLAN.md).
 * Создаёт неподтверждённую запись UserEmail + отправляет письмо со ссылкой подтверждения.
 * Не путать с Better Auth Verification — свой токен, чтобы не пересекаться с core-флоу входа.
 */
export async function requestAddEmail(input: unknown) {
  const session = await requireAuth()
  const parsed = AddEmailSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректный email' }
  }
  const email = parsed.data.email.toLowerCase()

  const [existingUser, existingUserEmail] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.userEmail.findUnique({ where: { email }, select: { id: true, userId: true, verified: true } }),
  ])

  if (existingUser || (existingUserEmail && existingUserEmail.verified)) {
    return { error: 'Этот email уже используется другим аккаунтом' }
  }

  const token = randomBytes(32).toString('hex')
  const verificationExpiresAt = new Date(Date.now() + ADD_EMAIL_TOKEN_TTL_MS)

  if (existingUserEmail && existingUserEmail.userId === session.user.id) {
    // Повторный запрос на неподтверждённый email того же пользователя — обновляем токен
    await prisma.userEmail.update({
      where: { id: existingUserEmail.id },
      data: { verificationToken: token, verificationExpiresAt },
    })
  } else if (existingUserEmail) {
    // Неподтверждённый email другого пользователя, "завис" — не блокируем повторную заявку
    return { error: 'Этот email уже используется другим аккаунтом' }
  } else {
    await prisma.userEmail.create({
      data: { userId: session.user.id, email, verificationToken: token, verificationExpiresAt },
    })
  }

  const verificationUrl = `${
    process.env.BETTER_AUTH_URL ?? 'http://localhost:3014'
  }/profile/emails/verify?token=${token}`
  // provider.sendEmail уже вызывает reportEmailFailure при провале SMTP — здесь не дублируем.
  const result = await sendVerificationEmail({ to: email, userName: session.user.name ?? undefined, verificationUrl })
  if (!result.success) {
    return { error: 'Не удалось отправить письмо подтверждения' }
  }

  revalidatePath('/profile/emails')
  return { data: null }
}

/** Подтверждает добавленный email по токену из письма */
export async function verifyAddedEmail(token: string) {
  const session = await requireAuth()

  const entry = await prisma.userEmail.findUnique({ where: { verificationToken: token } })
  if (!entry || entry.userId !== session.user.id) {
    return { error: 'Ссылка недействительна' }
  }
  if (!entry.verificationExpiresAt || entry.verificationExpiresAt < new Date()) {
    return { error: 'Срок действия ссылки истёк — запросите новую' }
  }

  // Перепроверка на момент подтверждения: за 24ч жизни токена email мог стать
  // чьим-то основным (обычная регистрация) — тогда подтверждать привязку нельзя,
  // иначе резолв входа по linked-email конфликтовал бы с существующим аккаунтом.
  const takenByUser = await prisma.user.findUnique({ where: { email: entry.email }, select: { id: true } })
  if (takenByUser) {
    await prisma.userEmail.delete({ where: { id: entry.id } })
    return { error: 'Этот email уже используется другим аккаунтом' }
  }

  await prisma.userEmail.update({
    where: { id: entry.id },
    data: { verified: true, verificationToken: null, verificationExpiresAt: null },
  })

  // Без revalidatePath: вызывается во время рендера страницы /profile/emails/verify
  // (не через форму/transition), Next.js запрещает ревалидацию в этом контексте.
  // /profile/emails и так рендерится без кэша при следующем визите.
  return { data: null }
}

/** Удаляет привязанный дополнительный email (не основной — тот живёт на User.email) */
export async function removeEmail(id: string) {
  const session = await requireAuth()

  const entry = await prisma.userEmail.findUnique({ where: { id } })
  if (!entry || entry.userId !== session.user.id) {
    return { error: 'Email не найден' }
  }

  await prisma.userEmail.delete({ where: { id } })
  revalidatePath('/profile/emails')
  return { data: null }
}

/**
 * Делает подтверждённый дополнительный email основным (User.email).
 * Прежний основной email становится дополнительным (уже подтверждён — он был User.email).
 *
 * После смены принудительно завершает сессию: Better Auth кэширует user.email в подписанной
 * cookie (cookieCache, до 5 минут в hub-provider профиле) — без signOut активная сессия и OIDC
 * id_token для downstream-приложений отдавали бы устаревший email до истечения кэша. Для
 * Ключницы (SSO ~10 приложений) это неприемлемое окно рассинхрона identity.
 */
export async function setPrimaryEmail(id: string) {
  const session = await requireAuth()

  const entry = await prisma.userEmail.findUnique({ where: { id } })
  if (!entry || entry.userId !== session.user.id) {
    return { error: 'Email не найден' }
  }
  if (!entry.verified) {
    return { error: 'Сначала подтвердите email' }
  }

  const currentUser = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  })

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { email: entry.email, emailVerified: true },
    }),
    prisma.userEmail.delete({ where: { id: entry.id } }),
    prisma.userEmail.create({
      data: { userId: session.user.id, email: currentUser.email, verified: currentUser.emailVerified },
    }),
  ])

  await auth.api.signOut({ headers: await headers() })

  revalidatePath('/profile/emails')
  revalidatePath('/profile')
  return { data: null, requireReauth: true }
}
