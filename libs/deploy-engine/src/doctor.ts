/**
 * `doctor` — валидирует `docker-compose.production.yml` приложения на готовность к
 * zero-downtime rollout (§18.6): healthcheck, network alias, отсутствие
 * `container_name`/`ports`, image-тег через `${DEPLOY_TAG}`, opt-in label.
 * `rollout` (сессия G) отказывается работать без пройденного `doctor`.
 */

import { type ComposeService, parseCompose, serviceLabelValue, serviceNetworkAliases } from './compose.js'
import type { DeployEngineExecutor } from './executor.js'

export type DoctorSeverity = 'required' | 'info'

export interface DoctorCheck {
  id: string
  description: string
  passed: boolean
  severity: DoctorSeverity
  detail?: string
}

export interface DoctorReport {
  app: string
  composePath: string
  ready: boolean
  checks: DoctorCheck[]
}

export function composePathForApp(app: string): string {
  return `apps/${app}/docker-compose.production.yml`
}

function reportFromChecks(app: string, composePath: string, checks: DoctorCheck[]): DoctorReport {
  const ready = checks.filter((c) => c.severity === 'required').every((c) => c.passed)
  return { app, composePath, ready, checks }
}

function checkNoContainerName(service: ComposeService): DoctorCheck {
  const has = service.container_name !== undefined
  return {
    id: 'no-container-name',
    description: "нет 'container_name' у сервиса app (нужен scale=2 для zero-downtime)",
    passed: !has,
    severity: 'required',
    detail: has ? `найден container_name: ${service.container_name}` : undefined,
  }
}

function checkNoPorts(service: ComposeService): DoctorCheck {
  const has = service.ports !== undefined
  return {
    id: 'no-ports',
    description: 'нет прямой публикации портов у app (только network alias, NPM Forward Host не меняется)',
    passed: !has,
    severity: 'required',
    detail: has ? 'найден ports' : undefined,
  }
}

function checkNetworkAlias(service: ComposeService, app: string): DoctorCheck {
  const expected = `${app}-app`
  const aliases = serviceNetworkAliases(service)
  const passed = aliases.includes(expected)
  return {
    id: 'network-alias',
    description: `network alias '${expected}' задан на premium-network`,
    passed,
    severity: 'required',
    detail: passed ? undefined : `найдены aliases: ${aliases.length > 0 ? aliases.join(', ') : 'нет'}`,
  }
}

function checkHealthcheck(service: ComposeService): DoctorCheck {
  const passed = service.healthcheck !== undefined
  return {
    id: 'healthcheck',
    description: 'healthcheck определён (стандарт — profile grandslamcup: wget --spider, interval 5s, retries 30)',
    passed,
    severity: 'required',
  }
}

function checkDeployTagImage(service: ComposeService, app: string): DoctorCheck {
  const image = typeof service.image === 'string' ? service.image : ''
  const passed = image.includes('${DEPLOY_TAG')
  return {
    id: 'deploy-tag-image',
    description:
      `image использует '\${DEPLOY_TAG:-latest}' вместо хардкода тега (например '${app}:\${DEPLOY_TAG:-latest}')`,
    passed,
    severity: 'required',
    detail: passed ? undefined : `image: ${image || '(не задан)'}`,
  }
}

function checkRolloutLabel(service: ComposeService): DoctorCheck {
  const value = serviceLabelValue(service, 'letar.rollout')
  const passed = value === 'true'
  return {
    id: 'rollout-label',
    description: "label 'letar.rollout: true' включает opt-in strangler-переход на rollout",
    passed,
    severity: 'required',
    detail: passed ? undefined : `значение: ${value ?? 'отсутствует'}`,
  }
}

function checkStopGracePeriod(service: ComposeService): DoctorCheck {
  const passed = service.stop_grace_period !== undefined
  return {
    id: 'stop-grace-period',
    description: 'stop_grace_period задан (рекомендуется для graceful shutdown старого контейнера)',
    passed,
    severity: 'info',
  }
}

/** Прогоняет все проверки готовности приложения к rollout по его production-compose файлу. */
export async function runDoctor(executor: DeployEngineExecutor, app: string): Promise<DoctorReport> {
  const composePath = composePathForApp(app)
  const raw = await executor.readFile(composePath)
  if (raw === null) {
    return reportFromChecks(app, composePath, [
      {
        id: 'compose-exists',
        description: `${composePath} существует`,
        passed: false,
        severity: 'required',
        detail: 'файл не найден',
      },
    ])
  }

  let compose
  try {
    compose = parseCompose(raw)
  } catch (err) {
    return reportFromChecks(app, composePath, [
      {
        id: 'compose-parses',
        description: 'compose-файл — валидный YAML-объект',
        passed: false,
        severity: 'required',
        detail: err instanceof Error ? err.message : String(err),
      },
    ])
  }

  const service = compose.services?.['app']
  if (!service) {
    return reportFromChecks(app, composePath, [
      {
        id: 'service-app-exists',
        description: "сервис 'app' объявлен в compose",
        passed: false,
        severity: 'required',
        detail: `объявленные сервисы: ${Object.keys(compose.services ?? {}).join(', ') || 'нет'}`,
      },
    ])
  }

  const checks: DoctorCheck[] = [
    { id: 'service-app-exists', description: "сервис 'app' объявлен в compose", passed: true, severity: 'required' },
    checkNoContainerName(service),
    checkNoPorts(service),
    checkNetworkAlias(service, app),
    checkHealthcheck(service),
    checkDeployTagImage(service, app),
    checkRolloutLabel(service),
    checkStopGracePeriod(service),
  ]

  return reportFromChecks(app, composePath, checks)
}
