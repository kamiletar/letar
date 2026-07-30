/**
 * Prometheus exporter (Backlog «Интеграции», P3).
 *
 * Отдаёт уже собираемые dashboard-agent метрики (CPU/память/диск/сеть/контейнеры/БД) в
 * текстовом формате Prometheus exposition (`GET /metrics`), не дублируя логику сбора —
 * тонкая обёртка поверх `system.ts`/`docker.ts`/`database.ts`, тех же источников, что
 * `routes/system.ts`/`routes/docker.ts`/`routes/database.ts` отдают в JSON.
 *
 * Grafana может использовать этот же эндпоинт напрямую через Prometheus datasource (или
 * scrape'иться Prometheus/Telegraf) — отдельных экспортёров под них заводить не пришлось.
 *
 * Авторизация — тот же Bearer `AGENT_TOKEN`, что у остальных роутов (`authMiddleware`
 * не делает исключения для `/metrics`). Prometheus поддерживает `authorization.credentials`
 * в scrape-конфиге — исключения не нужны.
 */

import { getContainers } from './docker'
import { getCPUInfo, getDiskInfo, getMemoryInfo, getNetworkInfo } from './system'

/** Экранирование значения label по спецификации Prometheus text exposition format. */
function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

interface MetricLine {
  name: string
  help: string
  type: 'gauge' | 'counter'
  samples: Array<{ labels?: Record<string, string>; value: number }>
}

function renderMetric(metric: MetricLine): string {
  const lines = [`# HELP ${metric.name} ${metric.help}`, `# TYPE ${metric.name} ${metric.type}`]

  for (const sample of metric.samples) {
    const labelStr = sample.labels
      ? `{${Object.entries(sample.labels)
          .map(([k, v]) => `${k}="${escapeLabelValue(v)}"`)
          .join(',')}}`
      : ''
    lines.push(`${metric.name}${labelStr} ${sample.value}`)
  }

  return lines.join('\n')
}

/**
 * Собирает все метрики в текстовом формате Prometheus. Ошибка сбора одной группы метрик
 * (например, недоступен Docker-сокет) не должна ронять остальные — каждая обёрнута
 * в свой try/catch, отсутствующая группа просто не попадает в вывод.
 */
export async function renderPrometheusMetrics(): Promise<string> {
  const blocks: string[] = []

  try {
    const cpu = await getCPUInfo()
    blocks.push(
      renderMetric({
        name: 'dashboard_agent_cpu_usage_percent',
        help: 'Текущая загрузка CPU в процентах',
        type: 'gauge',
        samples: [{ value: cpu.currentLoad }],
      })
    )
  } catch (error) {
    console.error('[MetricsExporter] Не удалось получить CPU:', error)
  }

  try {
    const memory = await getMemoryInfo()
    blocks.push(
      renderMetric({
        name: 'dashboard_agent_memory_usage_percent',
        help: 'Использование памяти в процентах',
        type: 'gauge',
        samples: [{ value: memory.usedPercent }],
      }),
      renderMetric({
        name: 'dashboard_agent_memory_used_bytes',
        help: 'Использовано памяти в байтах',
        type: 'gauge',
        samples: [{ value: memory.used }],
      }),
      renderMetric({
        name: 'dashboard_agent_memory_total_bytes',
        help: 'Всего памяти в байтах',
        type: 'gauge',
        samples: [{ value: memory.total }],
      })
    )
  } catch (error) {
    console.error('[MetricsExporter] Не удалось получить память:', error)
  }

  try {
    const disks = await getDiskInfo()
    blocks.push(
      renderMetric({
        name: 'dashboard_agent_disk_usage_percent',
        help: 'Использование диска в процентах, по точке монтирования',
        type: 'gauge',
        samples: disks.map((disk) => ({ labels: { mount: disk.mount }, value: disk.usedPercent })),
      }),
      renderMetric({
        name: 'dashboard_agent_disk_used_bytes',
        help: 'Использовано на диске в байтах, по точке монтирования',
        type: 'gauge',
        samples: disks.map((disk) => ({ labels: { mount: disk.mount }, value: disk.used })),
      })
    )
  } catch (error) {
    console.error('[MetricsExporter] Не удалось получить диски:', error)
  }

  try {
    const network = await getNetworkInfo()
    blocks.push(
      renderMetric({
        name: 'dashboard_agent_network_receive_bytes_per_second',
        help: 'Скорость приёма по интерфейсу, байт/сек',
        type: 'gauge',
        samples: network.stats.map((stat) => ({ labels: { iface: stat.iface }, value: stat.rxSec })),
      }),
      renderMetric({
        name: 'dashboard_agent_network_transmit_bytes_per_second',
        help: 'Скорость отправки по интерфейсу, байт/сек',
        type: 'gauge',
        samples: network.stats.map((stat) => ({ labels: { iface: stat.iface }, value: stat.txSec })),
      })
    )
  } catch (error) {
    console.error('[MetricsExporter] Не удалось получить сеть:', error)
  }

  try {
    const containers = await getContainers(true)
    blocks.push(
      renderMetric({
        name: 'dashboard_agent_container_up',
        help: 'Контейнер в состоянии running (1) или нет (0), по имени контейнера',
        type: 'gauge',
        samples: containers.map((c) => ({
          labels: { name: c.name, state: c.state },
          value: c.state === 'running' ? 1 : 0,
        })),
      })
    )
  } catch (error) {
    console.error('[MetricsExporter] Не удалось получить контейнеры:', error)
  }

  return `${blocks.join('\n\n')}\n`
}
