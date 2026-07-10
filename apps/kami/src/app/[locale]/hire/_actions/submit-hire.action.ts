'use server'

import { getEnhancedPrisma } from '@/lib/db'
import { sendHireRequestNotification } from '@/lib/email/email-service'
import type { HireFormData } from '../_schemas/hire.schema'
import { HireFormSchema } from '../_schemas/hire.schema'

export type SubmitHireResult =
  { success: true } | { success: false; error: 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'UNKNOWN_ERROR' }

/**
 * Server Action для сохранения заявки на работу
 */
export async function submitHireAction(data: HireFormData): Promise<SubmitHireResult> {
  try {
    // Валидация данных
    const parsed = HireFormSchema.safeParse(data)
    if (!parsed.success) {
      console.error('[submitHireAction] Validation error:', parsed.error.flatten())
      return { success: false, error: 'VALIDATION_ERROR' }
    }

    // Используем ZenStack v3 для доступа к БД с политиками доступа
    const db = getEnhancedPrisma()

    // Подготавливаем данные — убираем пустые строки, заменяем на null
    const cleanData = {
      companyName: parsed.data.companyName,
      companyWebsite: parsed.data.companyWebsite || null,
      companySize: parsed.data.companySize || null,
      industry: parsed.data.industry || null,
      teamSize: parsed.data.teamSize || null,
      teamStructure: parsed.data.teamStructure || null,
      remoteFriendly: parsed.data.remoteFriendly,
      techStack: parsed.data.techStack,
      projectType: parsed.data.projectType || null,
      employmentType: parsed.data.employmentType || null,
      location: parsed.data.location || null,
      timezone: parsed.data.timezone || null,
      salaryRange: parsed.data.salaryRange || null,
      benefits: parsed.data.benefits || null,
      hiringProcess: parsed.data.hiringProcess || null,
      startDate: parsed.data.startDate || null,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail,
      contactTelegram: parsed.data.contactTelegram || null,
      message: parsed.data.message || null,
    }

    // Создаём заявку в БД
    await db.hireRequest.create({
      data: cleanData,
    })

    // Отправляем email-уведомление владельцу сайта (не блокируем ответ)
    sendHireRequestNotification({
      companyName: parsed.data.companyName,
      companyWebsite: parsed.data.companyWebsite,
      companySize: parsed.data.companySize,
      industry: parsed.data.industry,
      teamSize: parsed.data.teamSize,
      teamStructure: parsed.data.teamStructure,
      remoteFriendly: parsed.data.remoteFriendly,
      techStack: parsed.data.techStack,
      projectType: parsed.data.projectType,
      employmentType: parsed.data.employmentType,
      location: parsed.data.location,
      timezone: parsed.data.timezone,
      salaryRange: parsed.data.salaryRange,
      benefits: parsed.data.benefits,
      hiringProcess: parsed.data.hiringProcess,
      startDate: parsed.data.startDate,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail,
      contactTelegram: parsed.data.contactTelegram,
      message: parsed.data.message,
    }).catch((error) => {
      // Логируем ошибку, но не блокируем успешный ответ пользователю
      console.error('[submitHireAction] Failed to send notification email:', error)
    })

    return { success: true }
  } catch (error) {
    console.error('[submitHireAction] Error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
