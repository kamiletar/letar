'use server'

import { sendGenericEmail } from '@letar/email'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'
import { requireAdmin } from '@/lib/auth-utils'
import { createCertificate } from '@/lib/gift-certificate'
import { prismaAuth } from '@/lib/prisma'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3018'

const CreateCertificateSchema = z
  .object({
    /// Сумма в рублях — конвертируется в копейки
    amountRub: z.coerce.number().int().min(100).max(1_000_000),
    issuedToEmail: z.email().optional().nullable(),
    expiryMonths: z.coerce.number().int().min(1).max(60).default(12),
    /// Отправить email с кодом+PIN получателю
    sendEmail: z.coerce.boolean().default(true),
  })
  .strip()

export interface CertificateActionResult {
  ok: boolean
  /// Возвращается только при создании — потом из БД достать нельзя (только хэш)
  code?: string
  pin?: string
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function createCertificateAction(raw: unknown): Promise<CertificateActionResult> {
  await requireAdmin()
  const parsed = CreateCertificateSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> }
  }

  const result = await createCertificate({
    initialAmount: parsed.data.amountRub * 100,
    issuedToEmail: parsed.data.issuedToEmail,
    expiryMonths: parsed.data.expiryMonths,
  })

  if (parsed.data.sendEmail && parsed.data.issuedToEmail) {
    try {
      await sendGenericEmail({
        to: parsed.data.issuedToEmail,
        subject: 'Подарочный сертификат НейроАбоИ',
        heading: 'Ваш подарочный сертификат',
        body:
          `Номинал: <strong>${parsed.data.amountRub} ₽</strong><br/>` +
          `Код: <strong>${result.code}</strong><br/>` +
          `PIN: <strong>${result.pin}</strong><br/>` +
          `Срок действия: до ${result.expiresAt.toLocaleDateString('ru-RU')}<br/><br/>` +
          `Введите код и PIN при оформлении заказа в каталоге.`,
        buttonText: 'В каталог',
        buttonUrl: `${BASE_URL}/catalog`,
      })
    } catch (err) {
      console.error('[certificates] failed to send email:', err)
    }
  }

  revalidatePath('/admin/gift-certificates')
  return { ok: true, code: result.code, pin: result.pin }
}

export async function deactivateCertificateAction(id: string): Promise<CertificateActionResult> {
  await requireAdmin()
  await prismaAuth.giftCertificate.update({ where: { id }, data: { isActive: false } })
  revalidatePath('/admin/gift-certificates')
  return { ok: true }
}
