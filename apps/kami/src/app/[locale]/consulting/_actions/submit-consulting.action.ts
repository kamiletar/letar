'use server'

import { getEnhancedPrisma } from '@/lib/db'
import { sendConsultingRequestNotification } from '@/lib/email/email-service'
import { ConsultingRequestSchema } from '../_schemas/consulting.schema'

type SubmitResult = { success: true; id: string } | { success: false; error: string }

/**
 * Server Action для отправки заявки на консультацию
 */
export async function submitConsultingRequest(data: unknown): Promise<SubmitResult> {
  // Валидация
  const parsed = ConsultingRequestSchema.safeParse(data)

  if (!parsed.success) {
    console.error('[submitConsultingRequest] Validation error:', parsed.error)
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    // Используем enhanced client с access control (@@allow('create', true) разрешает анонимное создание)
    const db = getEnhancedPrisma()

    // Создание заявки в БД
    const request = await db.consultingRequest.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        telegram: parsed.data.telegram || null,
        company: parsed.data.company || null,
        serviceType: parsed.data.serviceType || null,
        projectType: parsed.data.projectType || null,
        description: parsed.data.description,
        budget: parsed.data.budget || null,
        timeline: parsed.data.timeline || null,
        preferredTime: parsed.data.preferredTime || null,
        status: 'new',
      },
    })

    // Отправляем email-уведомление владельцу сайта (не блокируем ответ)
    sendConsultingRequestNotification({
      name: parsed.data.name,
      email: parsed.data.email,
      telegram: parsed.data.telegram,
      company: parsed.data.company,
      serviceType: parsed.data.serviceType,
      projectType: parsed.data.projectType,
      description: parsed.data.description,
      budget: parsed.data.budget,
      timeline: parsed.data.timeline,
      preferredTime: parsed.data.preferredTime,
    }).catch((error) => {
      // Логируем ошибку, но не блокируем успешный ответ пользователю
      console.error('[submitConsultingRequest] Failed to send notification email:', error)
    })

    return { success: true, id: request.id }
  } catch (error) {
    console.error('[submitConsultingRequest] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}
