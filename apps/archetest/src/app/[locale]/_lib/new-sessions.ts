/*
 * «N новых сессий» у клиента в кабинете психолога (Фаза 3, пул 2026-09-24, волна 7.4).
 * Новая — завершённая после последнего просмотра карточки клиента психологом
 * (`ClientPsychologistLink.lastSeenAt`), а если карточку ещё не открывали — после привязки:
 * сессии до привязки психолог не «пропускал». Отозванные связи не считаются.
 * Валидность сессий фильтрует вызывающий (в выборку попадают только isValid).
 */

export interface LinkSeen {
  clientId: string
  status: string
  createdAt: Date
  lastSeenAt: Date | null
}

export interface SessionCompleted {
  userId: string
  completedAt: Date | null
}

export function countNewSessions(
  links: readonly LinkSeen[],
  sessions: readonly SessionCompleted[],
): Map<string, number> {
  const since = new Map(
    links.filter((l) => l.status === 'ACTIVE').map((l) => [l.clientId, (l.lastSeenAt ?? l.createdAt).getTime()]),
  )
  const counts = new Map<string, number>()
  for (const s of sessions) {
    const threshold = since.get(s.userId)
    if (threshold === undefined || !s.completedAt || s.completedAt.getTime() <= threshold) {
      continue
    }
    counts.set(s.userId, (counts.get(s.userId) ?? 0) + 1)
  }
  return counts
}
