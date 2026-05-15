'use server'

import { requireAdmin } from '@/lib/auth'
import { getPrisma } from '@/lib/db'
import { sendApplicationApprovedEmail, sendApplicationRejectedEmail } from '@/lib/seller-notifications'
import { revalidatePath } from 'next/cache'

/**
 * Одобрить заявку продавца.
 * Создаёт Seller, SellerBalance, обновляет User.role → SELLER.
 */
export async function approveApplication(applicationId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const db = getPrisma()

  const application = await db.sellerApplication.findUnique({
    where: { id: applicationId },
    include: { user: { select: { id: true, role: true } } },
  })

  if (!application) {
    return { success: false, error: 'Заявка не найдена' }
  }

  if (application.status !== 'PENDING') {
    return { success: false, error: 'Заявка уже обработана' }
  }

  // Генерация slug из shopName
  const slug = application.shopName
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')

  try {
    await db.$transaction(async (tx) => {
      // 1. Обновить заявку → APPROVED
      await tx.sellerApplication.update({
        where: { id: applicationId },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
        },
      })

      // 2. Создать Seller-профиль
      const seller = await tx.seller.create({
        data: {
          userId: application.userId,
          shopName: application.shopName,
          slug,
          description: application.description,
          inn: application.inn,
          legalName: application.legalName,
          ogrn: application.ogrn,
          contactEmail: application.contactEmail,
          contactPhone: application.contactPhone,
          status: 'ACTIVE',
        },
      })

      // 3. Создать SellerBalance
      await tx.sellerBalance.create({
        data: { sellerId: seller.id },
      })

      // 4. Обновить роль пользователя → SELLER
      if (application.user.role !== 'ADMIN') {
        await tx.user.update({
          where: { id: application.userId },
          data: { role: 'SELLER' },
        })
      }
    })

    // Уведомление продавцу (fire-and-forget)
    sendApplicationApprovedEmail({
      shopName: application.shopName,
      contactEmail: application.contactEmail,
    }).catch(() => {
      /* fire-and-forget */
    })

    revalidatePath('/admin/sellers')
    return { success: true }
  } catch (error) {
    console.error('Ошибка одобрения заявки:', error)
    return { success: false, error: 'Не удалось одобрить заявку' }
  }
}

/**
 * Отклонить заявку продавца.
 */
export async function rejectApplication(
  applicationId: string,
  reviewNote: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const db = getPrisma()

  const application = await db.sellerApplication.findUnique({
    where: { id: applicationId },
  })

  if (!application) {
    return { success: false, error: 'Заявка не найдена' }
  }

  if (application.status !== 'PENDING') {
    return { success: false, error: 'Заявка уже обработана' }
  }

  try {
    await db.sellerApplication.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
      },
    })

    // Уведомление продавцу (fire-and-forget)
    sendApplicationRejectedEmail({
      shopName: application.shopName,
      contactEmail: application.contactEmail,
      reviewNote: reviewNote || undefined,
    }).catch(() => {
      /* fire-and-forget */
    })

    revalidatePath('/admin/sellers')
    return { success: true }
  } catch (error) {
    console.error('Ошибка отклонения заявки:', error)
    return { success: false, error: 'Не удалось отклонить заявку' }
  }
}
