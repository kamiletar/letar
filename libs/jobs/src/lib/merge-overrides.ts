import type { EffectiveJob, JobDefinition, JobOverrideRecord } from './types'

/**
 * Слияние деклараций из кода с оверрайдами из БД — код задаёт дефолты, `JobOverride`
 * (правки через админку) их перекрывает. Источник истины по СОСТАВУ задач — код: если id
 * убрали из реестра, задача пропадает из эффективного списка, даже если для неё остался
 * оверрайд в БД (закрывает PLAN-INFRA §56 — раньше снятая из кода задача жила на проде вечно).
 */
export function mergeJobsWithOverrides(
  definitions: JobDefinition[],
  overrides: JobOverrideRecord[],
): EffectiveJob[] {
  const overrideByJobId = new Map(overrides.map((o) => [o.jobId, o]))

  return definitions.map((definition) => {
    const override = overrideByJobId.get(definition.id)
    const schedule = override?.schedule ?? definition.schedule
    const enabled = override?.enabled ?? definition.enabled ?? true
    const hasOverride = override !== undefined && (override.schedule !== null || override.enabled !== null)

    return { definition, schedule, enabled, hasOverride }
  })
}
