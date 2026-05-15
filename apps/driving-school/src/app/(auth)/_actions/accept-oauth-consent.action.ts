'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { legalService } from '@/lib/legal'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod/v4'

/**
 * Схема валидации формы принятия оферты для OAuth
 */
export const OAuthConsentSchema = z.object({
  acceptOffer: z.boolean().refine((val) => val === true, {
    message: 'Необходимо принять условия договора-оферты',
  }),
  acceptPrivacy: z.boolean().refine((val) => val === true, {
    message: 'Необходимо принять политику конфиденциальности',
  }),
})

export type OAuthConsentFormData = z.infer<typeof OAuthConsentSchema>

/**
 * Server action для принятия оферты при OAuth регистрации
 */
export async function acceptOAuthConsentAction(
  data: OAuthConsentFormData
): Promise<{ success: boolean; error?: string }> {
  // Проверяем авторизацию
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'Необходимо авторизоваться' }
  }

  // Валидация данных
  const parsed = OAuthConsentSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Необходимо принять оба условия' }
  }

  try {
    // Получаем metadata для юридической значимости
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || undefined
    const userAgent = headersList.get('user-agent') || undefined

    // Получаем текущие версии документов
    const [offerVersionId, privacyVersionId] = await Promise.all([
      legalService.getCurrentOfferVersionId(),
      prisma.legalDocument
        .findUnique({ where: { type: 'PRIVACY_POLICY' }, select: { currentVersionId: true } })
        .then((doc: { currentVersionId: string | null } | null) => doc?.currentVersionId ?? null),
    ])

    // Сохраняем принятие оферты
    if (offerVersionId) {
      // Проверяем, не принял ли уже
      const existingOffer = await prisma.userAgreement.findUnique({
        where: {
          userId_versionId: {
            userId: session.user.id,
            versionId: offerVersionId,
          },
        },
      })

      if (!existingOffer) {
        await legalService.acceptVersion(session.user.id, offerVersionId, { ipAddress, userAgent })
      }
    }

    // Сохраняем принятие политики конфиденциальности
    if (privacyVersionId) {
      // Проверяем, не принял ли уже
      const existingPrivacy = await prisma.userAgreement.findUnique({
        where: {
          userId_versionId: {
            userId: session.user.id,
            versionId: privacyVersionId,
          },
        },
      })

      if (!existingPrivacy) {
        await legalService.acceptVersion(session.user.id, privacyVersionId, { ipAddress, userAgent })
      }
    }

    // Проверяем, завершён ли onboarding
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isOnboardingComplete: true },
    })

    // Редирект на onboarding или dashboard
    redirect(user?.isOnboardingComplete ? '/dashboard' : '/onboarding')
  } catch (error) {
    // Проверяем, не является ли ошибка редиректом
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }

    console.error('Error accepting OAuth consent:', error)
    return { success: false, error: 'Произошла ошибка. Попробуйте ещё раз.' }
  }
}
