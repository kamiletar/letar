/**
 * Проверить, истекают ли права скоро (в течение 30 дней)
 */
export function isLicenseExpiringSoon(expiresAt: Date): boolean {
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  return expiresAt <= thirtyDaysFromNow
}

/**
 * Проверить, истекли ли права
 */
export function isLicenseExpired(expiresAt: Date): boolean {
  return expiresAt < new Date()
}
