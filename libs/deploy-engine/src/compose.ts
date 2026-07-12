/** Минимальные типы docker-compose, достаточные для проверок `doctor` (§18.6). */

import { parse } from 'yaml'

export interface ComposeService {
  image?: string
  container_name?: string
  ports?: unknown
  /** Список (`['net']`) либо объект с алиасами (`{ net: { aliases: ['x'] } }`) — compose поддерживает обе формы. */
  networks?: string[] | Record<string, { aliases?: string[] } | null>
  healthcheck?: unknown
  /** Список (`['k=v']`) либо объект (`{ k: 'v' }`) — тоже обе формы валидны в compose. */
  labels?: string[] | Record<string, string>
  stop_grace_period?: string
  [key: string]: unknown
}

export interface ComposeFile {
  services?: Record<string, ComposeService>
  [key: string]: unknown
}

/** Парсит YAML docker-compose файла. Бросает, если результат не объект. */
export function parseCompose(yamlText: string): ComposeFile {
  const parsed: unknown = parse(yamlText)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('docker-compose файл пуст или не является объектом')
  }
  return parsed as ComposeFile
}

/** Собирает все network alias'ы сервиса (только из объектной формы `networks`). */
export function serviceNetworkAliases(service: ComposeService): string[] {
  const networks = service.networks
  if (!networks || Array.isArray(networks)) {
    return []
  }
  const aliases: string[] = []
  for (const cfg of Object.values(networks)) {
    if (cfg?.aliases) {
      aliases.push(...cfg.aliases)
    }
  }
  return aliases
}

/** Читает значение label'а сервиса независимо от формы (список `k=v` или объект). */
export function serviceLabelValue(service: ComposeService, key: string): string | undefined {
  const labels = service.labels
  if (!labels) {
    return undefined
  }
  if (Array.isArray(labels)) {
    const entry = labels.find((l) => l.startsWith(`${key}=`))
    return entry?.slice(key.length + 1)
  }
  return labels[key]
}

/** Достаёт http(s)-URL из строки healthcheck.test (конвенция репо — `wget --spider <url>`). */
export function serviceHealthcheckUrl(service: ComposeService): string | undefined {
  const hc = service.healthcheck
  if (!hc || typeof hc !== 'object') {
    return undefined
  }
  const test = (hc as { test?: unknown }).test
  const testStr = Array.isArray(test) ? test.join(' ') : typeof test === 'string' ? test : ''
  return testStr.match(/https?:\/\/\S+?(?=['"\s]|$)/)?.[0]
}
