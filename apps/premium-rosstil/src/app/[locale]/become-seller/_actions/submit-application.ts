'use server'

import { getSession } from '@/lib/auth'
import { getPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { type SellerApplicationFormData, SellerApplicationSchema } from '../_schemas/seller-application.schema'

export type SubmitApplicationResult = { success: true } | { success: false; error: string }

/**
 * Server action для подачи заявки на продавца.
 */
export async function submitSellerApplication(data: SellerApplicationFormData): Promise<SubmitApplicationResult> {
  // 1. Аутентификация
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  // 2. Валидация
  const parsed = SellerApplicationSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validated = parsed.data

  const db = getPrisma()

  // 3. Проверка — уже есть активная заявка или статус SELLER
  const existingApplication = await db.sellerApplication.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ['PENDING', 'APPROVED'] },
    },
  })

  if (existingApplication) {
    return {
      success: false,
      error:
        existingApplication.status === 'PENDING' ? 'У вас уже есть заявка на рассмотрении' : 'Ваша заявка уже одобрена',
    }
  }

  // Проверка — уже есть Seller-профиль
  const existingSeller = await db.seller.findUnique({
    where: { userId: session.user.id },
  })

  if (existingSeller) {
    return { success: false, error: 'Вы уже являетесь продавцом' }
  }

  // 4. Создание заявки
  try {
    await db.sellerApplication.create({
      data: {
        userId: session.user.id,
        shopName: validated.shopName,
        description: validated.description || null,
        inn: validated.inn || null,
        legalName: validated.legalName || null,
        ogrn: validated.ogrn || null,
        contactEmail: validated.contactEmail,
        contactPhone: validated.contactPhone,
        portfolioLinks: validated.portfolioLinks || null,
      },
    })

    revalidatePath('/become-seller')

    return { success: true }
  } catch (error) {
    console.error('Ошибка создания заявки:', error)
    return { success: false, error: 'Не удалось отправить заявку. Попробуйте позже.' }
  }
}
