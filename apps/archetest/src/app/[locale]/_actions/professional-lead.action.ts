'use server'

import { prisma } from '@/lib/db'
import { ProfessionalLeadSchema } from '../_schemas/professional-lead.schema'

/**
 * Приём заявки специалиста с /for-professionals (этап 5.7). Гостевой сабмит —
 * пишем через raw prisma (не getEnhancedPrisma), т.к. read-политика ограничена
 * ADMIN: enhanced-клиент делает read-back созданной записи для возврата данных,
 * и он бы упал на policy check для анонимного гостя (запись при этом всё равно
 * попала бы в БД) — тот же паттерн, что в auth-hub для ConsentLog.
 */
export async function submitProfessionalLeadAction(
  input: unknown,
): Promise<{ ok: true } | { error: string }> {
  const parsed = ProfessionalLeadSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'validation_failed' }
  }

  try {
    await prisma.professionalLead.create({ data: parsed.data })
    return { ok: true }
  } catch {
    return { error: 'submit_failed' }
  }
}
