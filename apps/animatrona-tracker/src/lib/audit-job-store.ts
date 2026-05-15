/**
 * In-memory хранилище для фоновых задач аудита пинов.
 *
 * Задачи эфемерны — при перезагрузке сервера теряются.
 * Auto-cleanup задач старше 1 часа.
 * Максимум 1 активная задача на сервер.
 */

export type AuditPhase = 'collecting_cids' | 'fetching_pins' | 'comparing' | 'unpinning' | 'gc' | 'updating_stats'

export type AuditStatus = 'running' | 'done' | 'error'

export interface AuditJobResult {
  referencedCidsCount: number
  pinnedCidsCount: number
  orphanedCount: number
  unpinnedCount: number
  errorCount: number
  freedBytes: number
  /** Ошибки unpin (cap 50) */
  errors: string[]
  /** Ошибки загрузки манифестов (cap 50) */
  manifestErrors: string[]
}

export interface AuditJob {
  id: string
  serverId: string
  serverName: string
  status: AuditStatus
  phase: AuditPhase
  progress: { current: number; total: number; detail: string }
  result: AuditJobResult
  errorMessage?: string
  createdAt: number
}

const MAX_AGE_MS = 60 * 60 * 1000 // 1 час
const MAX_ERRORS = 50

const jobs = new Map<string, AuditJob>()

/** Удалить устаревшие задачи */
function cleanup(): void {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > MAX_AGE_MS) {
      jobs.delete(id)
    }
  }
}

/** Создать новую задачу аудита */
export function createAuditJob(serverId: string, serverName: string): AuditJob {
  cleanup()

  const id = crypto.randomUUID()
  const job: AuditJob = {
    id,
    serverId,
    serverName,
    status: 'running',
    phase: 'collecting_cids',
    progress: { current: 0, total: 0, detail: '' },
    result: {
      referencedCidsCount: 0,
      pinnedCidsCount: 0,
      orphanedCount: 0,
      unpinnedCount: 0,
      errorCount: 0,
      freedBytes: 0,
      errors: [],
      manifestErrors: [],
    },
    createdAt: Date.now(),
  }

  jobs.set(id, job)
  return job
}

/** Получить задачу по ID */
export function getAuditJob(jobId: string): AuditJob | undefined {
  return jobs.get(jobId)
}

/** Получить активную задачу для сервера */
export function getActiveJobForServer(serverId: string): AuditJob | undefined {
  for (const job of jobs.values()) {
    if (job.serverId === serverId && job.status === 'running') {
      return job
    }
  }
  return undefined
}

/** Обновить фазу и прогресс */
export function updateJobPhase(job: AuditJob, phase: AuditPhase, detail = ''): void {
  job.phase = phase
  job.progress = { current: 0, total: 0, detail }
}

/** Обновить прогресс текущей фазы */
export function updateJobProgress(job: AuditJob, current: number, total: number, detail?: string): void {
  job.progress.current = current
  job.progress.total = total
  if (detail !== undefined) {
    job.progress.detail = detail
  }
}

/** Добавить ошибку unpin (с лимитом) */
export function addJobError(job: AuditJob, error: string): void {
  job.result.errorCount++
  if (job.result.errors.length < MAX_ERRORS) {
    job.result.errors.push(error)
  }
}

/** Добавить ошибку манифеста (с лимитом) */
export function addManifestError(job: AuditJob, error: string): void {
  if (job.result.manifestErrors.length < MAX_ERRORS) {
    job.result.manifestErrors.push(error)
  }
}

/** Отметить задачу как завершённую */
export function completeJob(job: AuditJob): void {
  job.status = 'done'
}

/** Отметить задачу как ошибочную */
export function failJob(job: AuditJob, errorMessage: string): void {
  job.status = 'error'
  job.errorMessage = errorMessage
}
