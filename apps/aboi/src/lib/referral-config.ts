/**
 * Конфиг реферальной программы — plain module (без 'use server'),
 * чтобы можно было экспортировать константу-объект и использовать её
 * как в server-actions, так и в server/client-компонентах.
 *
 * Next.js 16 запрещает в `'use server'`-файлах любые экспорты, кроме async-функций.
 */
export const REFERRAL_CONFIG = {
  percent: Number(process.env.ABOI_REFERRAL_PERCENT ?? 12),
  pendingDays: Number(process.env.ABOI_REFERRAL_PENDING_DAYS ?? 14),
  cookieTtlDays: Number(process.env.ABOI_REFERRAL_COOKIE_TTL_DAYS ?? 60),
}
