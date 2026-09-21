/**
 * Тонкий HTTP-клиент к GlitchTip REST API (Sentry-совместимый `/api/0/...`,
 * см. libs/glitchtip/README.md). Bearer-токен из config.ts, без логина — GlitchTip Auth Token
 * долгоживущий, в отличие от Umami-сессии. Единственная запись — смена статуса группы
 * (`setIssueStatus`), остальное только чтение.
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

/** Запрос к GlitchTip API с Bearer-токеном; `init` — метод и JSON-тело для записи. */
async function glitchtipRequest<T>(path: string, init: { method: 'PUT'; body: unknown } | null = null): Promise<T> {
  const res = await fetch(`${glitchtipUrl()}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${glitchtipToken()}`,
      ...(init ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init ? JSON.stringify(init.body) : undefined,
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

export type GlitchtipIssueStatus = 'unresolved' | 'resolved' | 'ignored'

/**
 * Смена статуса группы (`PUT /api/0/issues/{id}/`, тело `{ status }`). Вызывающий обязан
 * передать числовой id — он подставляется в путь как есть.
 */
export async function setIssueStatus(issueId: string, status: GlitchtipIssueStatus): Promise<GlitchtipIssue> {
  return glitchtipRequest<GlitchtipIssue>(`/api/0/issues/${issueId}/`, { method: 'PUT', body: { status } })
}
