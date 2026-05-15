import { z } from 'zod/v4'

/**
 * Срок действия приглашения в днях
 */
export const INVITATION_EXPIRY_DAYS = 7

/**
 * Статусы приглашения
 */
export const InvitationStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'DECLINED'])
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>

/**
 * Схема создания приглашения (email опционален - можно создать ссылку без email)
 */
export const CreateInviteByEmailSchema = z
  .object({
    email: z
      .string()
      .transform((val) => val.trim())
      .refine((val) => val === '' || z.email().safeParse(val).success, {
        message: 'Некорректный формат email',
      })
      .optional()
      .default('')
      .meta({
        ui: {
          title: 'Email ученика',
          placeholder: 'student@example.com',
          description: 'Оставьте пустым для создания ссылки-приглашения',
        },
      }),
  })
  .strip()

export type CreateInviteByEmailData = z.infer<typeof CreateInviteByEmailSchema>

/**
 * Схема токена приглашения
 */
export const InviteTokenSchema = z
  .object({
    token: z
      .string()
      .min(1, 'Токен обязателен')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Некорректный формат токена'),
  })
  .strip()

export type InviteTokenData = z.infer<typeof InviteTokenSchema>

/**
 * Проверка истечения приглашения
 */
export function isInvitationExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now > expiresAt
}

/**
 * Расчёт даты истечения приглашения
 */
export function calculateExpirationDate(createdAt: Date = new Date()): Date {
  const expiresAt = new Date(createdAt)
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)
  return expiresAt
}
