/**
 * Проверка порогов здоровья сервера (Backlog «Алерты при превышении порогов», P2).
 *
 * `DashboardAlertType` уже с самого начала содержал `CPU_HIGH`/`MEMORY_HIGH`/`DISK_HIGH`/
 * `CONTAINER_DOWN`/`CONTAINER_RESTARTED`/`DATABASE_DOWN` (`dashboard-alert.ts`), но их никто
 * не вызывал — метрики только отдавались по запросу (`routes/system.ts`), без проактивного
 * контроля. Этот модуль закрывает разрыв: один прогон проверяет CPU/память/диск против
 * порогов, статус Docker-контейнеров и доступность БД, алертит через существующий
 * `postDashboardAlert()`.
 *
 * Дебаунс — тот же паттерн, что `email-canary.ts`/`backup-freshness.ts`: один алерт на
 * непрерывный эпизод, состояние переживает рестарт контейнера через `json-state-file.ts`
 * на смонтированном `/home/deploy/letar`.
 */

import { postDashboardAlert } from './dashboard-alert'
import { getAllDatabaseStatuses } from './database'
import { getContainers } from './docker'
import { loadJsonState, saveJsonState } from './json-state-file'
import { getCPUInfo, getDiskInfo, getMemoryInfo } from './system'

const STATE_PATH = process.env.HEALTH_CHECK_STATE_PATH || '/home/deploy/letar/health-check-state.json'

const CPU_THRESHOLD = Number(process.env.HEALTH_CPU_THRESHOLD) || 90
const MEMORY_THRESHOLD = Number(process.env.HEALTH_MEMORY_THRESHOLD) || 90
const DISK_THRESHOLD = Number(process.env.HEALTH_DISK_THRESHOLD) || 90

interface HealthCheckState {
  /** Дебаунс порогов CPU/память/диск — ключ: 'cpu' | 'memory' | `disk:<mount>` */
  metricsAlerted: Record<string, boolean>
  /** Последнее известное состояние контейнера по имени, для детекта переходов */
  containerStates: Record<string, string>
  /** Дебаунс DATABASE_DOWN по имени приложения */
  databaseAlerted: Record<string, boolean>
}

const EMPTY_STATE: HealthCheckState = { metricsAlerted: {}, containerStates: {}, databaseAlerted: {} }

function loadState(): HealthCheckState {
  const state = loadJsonState<HealthCheckState>(STATE_PATH, EMPTY_STATE)
  return {
    metricsAlerted: state.metricsAlerted ?? {},
    containerStates: state.containerStates ?? {},
    databaseAlerted: state.databaseAlerted ?? {},
  }
}

function saveState(state: HealthCheckState): void {
  saveJsonState(STATE_PATH, state, 'HealthCheck')
}

export interface HealthCheckResult {
  checkedAt: string
  metrics: { cpu: number; memory: number; disks: Array<{ mount: string; usedPercent: number }> }
  alertsTriggered: string[]
}

/**
 * Проверка CPU/память/диск против порогов — по одному алерту на метрику на непрерывный эпизод.
 */
async function checkMetricThresholds(state: HealthCheckState): Promise<{
  cpu: number
  memory: number
  disks: Array<{ mount: string; usedPercent: number }>
  triggered: string[]
}> {
  const triggered: string[] = []
  const [cpu, memory, disks] = await Promise.all([getCPUInfo(), getMemoryInfo(), getDiskInfo()])

  const checks: Array<{
    key: string
    label: string
    value: number
    threshold: number
    type: 'CPU_HIGH' | 'MEMORY_HIGH' | 'DISK_HIGH'
  }> = [
    { key: 'cpu', label: 'CPU', value: cpu.currentLoad, threshold: CPU_THRESHOLD, type: 'CPU_HIGH' },
    {
      key: 'memory',
      label: 'Память',
      value: memory.usedPercent ?? 0,
      threshold: MEMORY_THRESHOLD,
      type: 'MEMORY_HIGH',
    },
  ]

  // Bind-mount'ы Docker (/etc/hostname, /etc/resolv.conf, /home/deploy/*) — это разные точки
  // монтирования одного и того же физического раздела хоста. Дедуп по mount давал алерт на
  // каждую точку монтирования при переполнении одного диска — до двух десятков одинаковых
  // уведомлений за одно превышение порога. Дедупим по `disk.fs` (устройство), берём точку
  // монтирования с самым коротким путём как самую понятную для заголовка алерта.
  const uniqueDisks = new Map<string, { mount: string; usedPercent: number }>()
  for (const disk of disks) {
    const existing = uniqueDisks.get(disk.fs)
    if (!existing || disk.mount.length < existing.mount.length) {
      uniqueDisks.set(disk.fs, { mount: disk.mount, usedPercent: disk.usedPercent ?? 0 })
    }
  }

  for (const [fs, disk] of uniqueDisks) {
    checks.push({
      key: `disk:${fs}`,
      label: `Диск ${disk.mount}`,
      value: disk.usedPercent,
      threshold: DISK_THRESHOLD,
      type: 'DISK_HIGH',
    })
  }

  for (const check of checks) {
    const wasAlerted = state.metricsAlerted[check.key] ?? false
    const isOver = check.value > check.threshold

    if (!isOver) {
      state.metricsAlerted[check.key] = false
      continue
    }

    if (wasAlerted) {
      continue
    }

    const delivered = await postDashboardAlert({
      type: check.type,
      severity: 'WARNING',
      title: `${check.label}: ${check.value.toFixed(1)}% (порог ${check.threshold}%)`,
      message: `${check.label} превысил порог ${check.threshold}% — текущее значение ${check.value.toFixed(1)}%.`,
      metadata: { jobId: 'health-check', metric: check.key, value: check.value, threshold: check.threshold },
    })
    triggered.push(check.type)
    // Как в email-canary (§62): пишем ИСХОД отправки, а не факт вызова. Недоставленный алерт
    // оставляет `wasAlerted` false — следующий прогон, пока метрика всё ещё над порогом, повторит попытку.
    state.metricsAlerted[check.key] = delivered
  }

  return {
    cpu: cpu.currentLoad,
    memory: memory.usedPercent ?? 0,
    disks: disks.map((d) => ({ mount: d.mount, usedPercent: d.usedPercent ?? 0 })),
    triggered,
  }
}

/**
 * Проверка состояния Docker-контейнеров: переход running → exited/dead — `CONTAINER_DOWN`,
 * состояние `restarting` (Docker сам держит контейнер в этом состоянии при crash-loop) —
 * `CONTAINER_RESTARTED`. Сравнение с предыдущим прогоном по имени контейнера (id меняется
 * при пересоздании — не годится как устойчивый ключ дебаунса).
 */
async function checkContainers(state: HealthCheckState): Promise<string[]> {
  const triggered: string[] = []

  let containers: Awaited<ReturnType<typeof getContainers>>
  try {
    containers = await getContainers(true)
  } catch (error) {
    console.error('[HealthCheck] Не удалось получить список контейнеров:', error)
    return triggered
  }

  const seenNames = new Set<string>()

  for (const container of containers) {
    seenNames.add(container.name)
    const prevState = state.containerStates[container.name]
    const wasRunning = prevState === 'running'

    if (container.state === 'restarting') {
      // Не дебаунсится — каждый прогон алертит заново, пока crash-loop не закончится, поэтому
      // недоставленная попытка и так будет повторена на следующем прогоне без доп. состояния.
      await postDashboardAlert({
        type: 'CONTAINER_RESTARTED',
        severity: 'WARNING',
        title: `Контейнер перезапускается: ${container.name}`,
        message:
          `Контейнер ${container.name} в состоянии restarting — похоже на crash-loop. Status: ${container.status}`,
        metadata: { jobId: 'health-check', container: container.name, status: container.status },
      })
      triggered.push('CONTAINER_RESTARTED')
      state.containerStates[container.name] = container.state
    } else if (wasRunning && container.state !== 'running') {
      const delivered = await postDashboardAlert({
        type: 'CONTAINER_DOWN',
        severity: 'ERROR',
        title: `Контейнер остановлен: ${container.name}`,
        message: `Контейнер ${container.name} был running, теперь ${container.state}. Status: ${container.status}`,
        metadata: {
          jobId: 'health-check',
          container: container.name,
          state: container.state,
          status: container.status,
        },
      })
      triggered.push('CONTAINER_DOWN')
      // Недоставленный алерт (§62) не должен продвигать состояние: следующий прогон должен
      // снова увидеть переход running → не-running и повторить попытку.
      if (delivered) {
        state.containerStates[container.name] = container.state
      }
    } else {
      state.containerStates[container.name] = container.state
    }
  }

  // Контейнеры, пропавшие из списка (удалены) — чистим их состояние, чтобы не копить мусор в файле.
  for (const name of Object.keys(state.containerStates)) {
    if (!seenNames.has(name)) {
      delete state.containerStates[name]
    }
  }

  return triggered
}

/**
 * Проверка доступности БД: контейнер запущен, но подключение не удаётся — `DATABASE_DOWN`.
 * Не работающий контейнер БД уже покрыт `checkContainers()` через `CONTAINER_DOWN`.
 */
async function checkDatabases(state: HealthCheckState): Promise<string[]> {
  const triggered: string[] = []

  let statuses: Awaited<ReturnType<typeof getAllDatabaseStatuses>>
  try {
    statuses = await getAllDatabaseStatuses()
  } catch (error) {
    console.error('[HealthCheck] Не удалось получить статусы БД:', error)
    return triggered
  }

  for (const status of statuses) {
    const isDown = status.containerStatus.running && !status.connectionOk
    const wasAlerted = state.databaseAlerted[status.name] ?? false

    if (!isDown) {
      state.databaseAlerted[status.name] = false
      continue
    }

    if (wasAlerted) {
      continue
    }

    const delivered = await postDashboardAlert({
      type: 'DATABASE_DOWN',
      severity: 'ERROR',
      title: `БД недоступна: ${status.name}`,
      message:
        `Контейнер ${status.containerStatus.containerName} запущен, но подключение к БД ${status.database} не удалось.`,
      metadata: { jobId: 'health-check', app: status.name, host: status.host, port: status.port },
    })
    triggered.push('DATABASE_DOWN')
    state.databaseAlerted[status.name] = delivered
  }

  return triggered
}

/**
 * Один прогон проверки — вызывается роутом `/api/cron/health-check`.
 */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  const checkedAt = new Date().toISOString()
  const state = loadState()

  const metrics = await checkMetricThresholds(state)
  const containerAlerts = await checkContainers(state)
  const databaseAlerts = await checkDatabases(state)

  saveState(state)

  return {
    checkedAt,
    metrics: { cpu: metrics.cpu, memory: metrics.memory, disks: metrics.disks },
    alertsTriggered: [...metrics.triggered, ...containerAlerts, ...databaseAlerts],
  }
}
