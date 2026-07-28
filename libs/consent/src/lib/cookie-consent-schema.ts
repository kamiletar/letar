import { z } from 'zod/v4'

/** Принимает формат CookieConsentState из @letar/ui CookieBanner. */
export const CookieConsentSchema = z
  .object({
    necessary: z.literal(true),
    analytics: z.boolean(),
    marketing: z.boolean(),
    version: z.string().min(1).max(20),
    acceptedAt: z.string(),
  })
  .strip()

export type CookieConsentInput = z.infer<typeof CookieConsentSchema>
