/**
 * Тонкий read-only HTTP-клиент к GlitchTip REST API (Sentry-совместимый `/api/0/...`,
 * см. libs/glitchtip/README.md). Bearer-токен из config.ts, без логина — GlitchTip Auth Token
 * долгоживущий, в отличие от Umami-сессии.
 */

import { glitchtipOrg, glitchtipToken, glitchtipUrl } from './config.js'

export interface GlitchtipProject {
  id: string
  slug: string
  name: string
}

export interface GlitchtipIssue {
  id: string
  title: string
  culprit: string | null
  count: string
  userCount: number
  level: string
  status: string
  firstSeen: string
  lastSeen: string
  permalink: string
}

export interface GlitchtipEvent {
  eventID: string
  message: string
  dateCreated: string
  entries: Array<{ type: string; data: unknown }>
}

/** Запрос к GlitchTip API с Bearer-токеном. */
async function glitchtipRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${glitchtipUrl()}${path}`, {
    headers: { Authorization: `Bearer ${glitchtipToken()}` },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GlitchTip API error (${path}): HTTP ${res.status}${body ? ` — ${body.slice(0, 300)}` : ''}`)
  }
  return res.json() as Promise<T>
}

/** Все проекты организации. */
export async function listProjects(): Promise<GlitchtipProject[]> {
  return glitchtipRequest<GlitchtipProject[]>(`/api/0/organizations/${glitchtipOrg()}/projects/`)
}

export interface ListIssuesOptions {
  environment?: string
  statsPeriod?: string
  limit?: number
  status?: 'unresolved' | 'resolved' | 'ignored'
}

/** Issues проекта, по умолчанию is:unresolved за 14 дней, отсортированные по частоте. */
export async function listIssues(project: string, options: ListIssuesOptions = {}): Promise<GlitchtipIssue[]> {
  const status = options.status ?? 'unresolved'
  const statsPeriod = options.statsPeriod ?? '14d'
  const limit = options.limit ?? 25
  let query = `is:${status}`
  if (options.environment) {
    query += ` environment:${options.environment}`
  }
  // GlitchTip принимает свой набор значений sort (не Sentry-совместимый freq/date/new/priority) —
  // '-count' сортирует по убыванию частоты, см. https://errors.s3.letar.best/api/0/... 422 при 'freq'.
  const params = new URLSearchParams({ query, sort: '-count', statsPeriod, limit: String(limit) })
  return glitchtipRequest<GlitchtipIssue[]>(
    `/api/0/projects/${glitchtipOrg()}/${project}/issues/?${params.toString()}`,
  )
}

/** Последнее событие issue (сообщение + стектрейс) — GlitchTip issue id, не project slug. */
export async function getLatestIssueEvent(issueId: string): Promise<GlitchtipEvent> {
  return glitchtipRequest<GlitchtipEvent>(`/api/0/issues/${issueId}/events/latest/`)
}
