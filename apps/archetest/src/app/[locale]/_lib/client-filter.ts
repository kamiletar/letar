/*
 * Фильтр списка клиентов в кабинете психолога (Фаза 3, пул 2026-09-24, волна 7.3).
 * Чистая функция: список приходит целиком (клиентов у психолога десятки), фильтр — на клиенте,
 * состояние — в URL через Form.UrlSync.
 */

export type ClientStatusFilter = 'all' | 'ACTIVE' | 'REVOKED'

/** Значения формы фильтра — только строки, чтобы Form.UrlSync писал их в URL как есть */
export interface ClientFilters {
  search: string
  status: ClientStatusFilter
  /** Дата привязки «с», YYYY-MM-DD; '' — без ограничения */
  since: string
  /** Уровень ранга (tier из `_data/ranks`); 'all' — любой */
  rankTier: string
}

export const CLIENT_FILTER_DEFAULTS: ClientFilters = { search: '', status: 'all', since: '', rankTier: 'all' }

export interface FilterableClient {
  clientName: string
  clientEmail: string
  status: string
  createdAt: Date | string
  /** null — ранга нет (нет валидных сессий или связь отозвана) */
  rankTier: string | null
}

export function filterClients<T extends FilterableClient>(clients: readonly T[], f: ClientFilters): T[] {
  const q = f.search.trim().toLowerCase()
  return clients.filter((c) => {
    if (q && !`${c.clientName} ${c.clientEmail}`.toLowerCase().includes(q)) {
      return false
    }
    if (f.status !== 'all' && c.status !== f.status) {
      return false
    }
    // Сравнение по UTC-дню привязки: строки YYYY-MM-DD сравниваются лексикографически
    if (f.since && new Date(c.createdAt).toISOString().slice(0, 10) < f.since) {
      return false
    }
    if (f.rankTier !== 'all' && c.rankTier !== f.rankTier) {
      return false
    }
    return true
  })
}
