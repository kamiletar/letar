/**
 * Структурная копия `JobStatus` из `@letar/jobs` — без рантайм-зависимости на pg-boss/cron-parser
 * ради одного типа. `@letar/jobs` возвращает объекты этой формы из `getStatuses()`, TypeScript
 * принимает их структурно, отдельного маппинга на стороне приложения не требуется.
 */
export interface JobStatusItem {
  id: string
  name: string
  description: string
  schedule: string
  hasOverride: boolean
  enabled: boolean
  lastRunAt: Date | null
  lastRunState: 'created' | 'active' | 'completed' | 'failed' | 'cancelled' | 'retry' | null
  lastRunError: string | null
  lastRunDurationMs: number | null
  nextRunAt: Date | null
}
