'use server'

import { hash } from 'bcryptjs'
import { z } from 'zod/v4'

import { prisma } from '@/lib/db'

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

const AcceptInvitationSchema = z
  .object({
    token: z.string().min(1),
    name: z.string().min(2, 'Введите имя'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Пароль должен быть минимум 8 символов'),
  })
  .strip()

/**
 * Принятие приглашения и создание аккаунта ученика
 */
export async function acceptInvitationAction(
  input: z.infer<typeof AcceptInvitationSchema>
): Promise<ActionResult<{ userId: string }>> {
  // Валидация
  const parsed = AcceptInvitationSchema.safeParse(input)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const firstError = Object.values(errors).flat()[0]
    return { success: false, error: firstError || 'Некорректные данные' }
  }

  const { token, name, phone, password } = parsed.data

  // Загружаем приглашение
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { id: token },
    include: {
      organization: true,
    },
  })

  if (!invitation) {
    return { success: false, error: 'Приглашение не найдено' }
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: 'Приглашение уже использовано' }
  }

  if (new Date() > invitation.expiresAt) {
    return { success: false, error: 'Срок действия приглашения истёк' }
  }

  // Проверяем что пользователь ещё не существует
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
  })

  if (existingUser) {
    return { success: false, error: 'Пользователь с таким email уже существует' }
  }

  // Хешируем пароль
  const passwordHash = await hash(password, 10)

  // Получаем данные из metadata
  const metadata = invitation.metadata as { prefillData?: { birthdate?: string } } | null
  const birthdate = metadata?.prefillData?.birthdate

  // Создаём пользователя и всё связанное в транзакции
  const result = await prisma.$transaction(async (tx) => {
    // 1. Создаём пользователя
    const user = await tx.user.create({
      data: {
        email: invitation.email,
        name,
        phone: phone || null,
        birthdate: birthdate ? new Date(birthdate) : null,
        emailVerified: true, // Email уже подтверждён через приглашение
      },
    })

    // 2. Создаём учётные данные (пароль)
    await tx.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password: passwordHash,
      },
    })

    // 3. Создаём Member
    await tx.member.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role || 'member',
      },
    })

    // 4. Создаём StudentProgress
    await tx.studentProgress.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
      },
    })

    // 5. Обновляем статус приглашения
    await tx.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    })

    return user
  })

  return { success: true, data: { userId: (result as unknown as { id: string }).id } }
}
