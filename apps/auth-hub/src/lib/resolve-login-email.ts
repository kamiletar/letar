import { prisma } from './prisma'

/**
 * Резолв email для входа: linked-email → основной (Этап 8.5 корневого PLAN.md).
 *
 * Пользователь может входить по любому из своих ПОДТВЕРЖДЁННЫХ дополнительных
 * адресов (`UserEmail.verified === true`) — резолвим его в основной `User.email`
 * ДО вызова Better Auth, чтобы не трогать core-резолв sign-in (от него зависят
 * ~10 downstream-приложений через OIDC hub-provider).
 *
 * Неподтверждённые записи игнорируются намеренно: иначе злоумышленник мог бы
 * привязать чужой адрес без подтверждения и перехватывать попытки входа по нему.
 *
 * Возвращает основной email владельца linked-адреса либо исходный email
 * (в нижнем регистре), если он не является чьим-то дополнительным адресом.
 */
export async function resolveLoginEmail(email: string): Promise<{ email: string; resolved: boolean }> {
  const normalized = email.toLowerCase().trim()

  const [primaryOwner, linked] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalized }, select: { id: true } }),
    prisma.userEmail.findUnique({
      where: { email: normalized },
      select: { verified: true, user: { select: { email: true } } },
    }),
  ])

  // Точное совпадение с чьим-то основным адресом всегда приоритетнее linked-записи:
  // иначе устаревшая UserEmail-запись могла бы «затенить» вход в другой аккаунт.
  if (primaryOwner) {
    return { email: normalized, resolved: false }
  }

  if (linked?.verified) {
    return { email: linked.user.email, resolved: true }
  }

  return { email: normalized, resolved: false }
}
