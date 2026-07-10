/**
 * MCP-сервер deploy-mcp — структурированный слой над REST API dashboard-agent.
 *
 * Даёт агентам (в первую очередь BlackCove) деплой через инструменты вместо сырого
 * SSH + парсинга stdout. Вся деплой-логика остаётся в deploy-affected.sh и
 * dashboard-agent — здесь только тонкие HTTP-обёртки через SSH-туннель.
 *
 * Фаза 1: deploy_app, deploy_status, deploy_cancel, git_status, list_servers, agent_health.
 * Фаза 2 (Сессия D): run_e2e, e2e_status + e2e-gate в deploy_app(production).
 */

import { type DeployTarget, type InfraServer, resolveDeployServer, SERVER_APPS, SERVERS } from '@letar/infra-config'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { agentRequest } from './client.js'
import { localHeadSha } from './config.js'

const serverEnum = z.enum(['s2', 's3'])
const E2E_GATE_MAX_AGE_MS = 24 * 60 * 60 * 1000

// Обе функции возвращают ОДНУ и ту же форму (с полем isError) без аннотации типа —
// так вывод типов SDK-колбэка работает (аналогично form-mcp). Аннотация или union
// из двух разных форм ломает overload-резолюцию tool() (ZodRawShapeCompat).

/** Оборачивает результат в MCP text-content. */
function text(body: string) {
  return { content: [{ type: 'text' as const, text: body }], isError: false as boolean }
}

/** Оборачивает ошибку в MCP isError-ответ с диагностикой. */
function errorText(body: string) {
  return { content: [{ type: 'text' as const, text: body }], isError: true as boolean }
}

/** JSON-представление данных агента для вывода в чат. */
function pretty(data: unknown): string {
  return '```json\n' + JSON.stringify(data, null, 2) + '\n```'
}

/**
 * Warn-only e2e-gate перед production-деплоем (PLAN.md §18 Сессия D): читает
 * `.last-e2e-status/<app>.json` на s3 через dashboard-agent и предупреждает о
 * несвежих/проваленных/отсутствующих данных — но НИКОГДА не блокирует деплой
 * (hard gate — отдельное решение Фазы 3, §18.6, после недели эксплуатации warn-only).
 */
async function checkE2eGate(app: string): Promise<string[]> {
  const warnings: string[] = []
  try {
    const res = await agentRequest('s3', {
      path: `/api/e2e/status?app=${encodeURIComponent(app)}`,
      timeoutMs: 10000,
    })
    if (!res.success) {
      warnings.push(`⚠️ e2e-gate: не удалось получить статус на s3 (${res.error ?? 'нет данных'}) — деплою вслепую.`)
      return warnings
    }
    const data = res.data as { lastStatus: { commitSha: string; passed: boolean; timestamp: string } | null } | null
    const last = data?.lastStatus
    if (!last) {
      warnings.push(`⚠️ e2e-gate: для ${app} ещё ни разу не прогонялся e2e на staging — нет данных для сверки.`)
      return warnings
    }
    if (!last.passed) {
      warnings.push(
        `⚠️ e2e-gate: последний e2e для ${app} (коммит ${last.commitSha.slice(0, 7)}, ${last.timestamp}) УПАЛ.`
      )
    }
    try {
      const head = localHeadSha()
      if (last.commitSha !== head) {
        warnings.push(
          `⚠️ e2e-gate: e2e прогонялся на ${last.commitSha.slice(0, 7)}, а деплоится ${head.slice(
            0,
            7
          )} — не тот же коммит.`
        )
      }
    } catch {
      // не удалось определить локальный HEAD — пропускаем сверку коммита, остальные проверки не отменяем
    }
    const ageMs = Date.now() - new Date(last.timestamp).getTime()
    if (ageMs > E2E_GATE_MAX_AGE_MS) {
      warnings.push(`⚠️ e2e-gate: последний прогон для ${app} старше 24ч (${last.timestamp}).`)
    }
  } catch (err) {
    warnings.push(
      `⚠️ e2e-gate: ошибка проверки (${err instanceof Error ? err.message : String(err)}) — деплою вслепую.`
    )
  }
  return warnings
}

export function createDeployMcpServer(): McpServer {
  const server = new McpServer({ name: '@letar/deploy-mcp', version: '0.1.0' }, { capabilities: { tools: {} } })

  // ─── list_servers ────────────────────────────────────────────────────────────
  server.tool(
    'list_servers',
    'Список серверов деплоя и маппинг «приложение → сервер». Используй, чтобы не угадывать, где живёт приложение.',
    {},
    async () => {
      return text(
        [
          '## Серверы',
          pretty(SERVERS),
          '',
          '## Приложение → сервер (production)',
          pretty(SERVER_APPS),
          '',
          '_staging любого приложения резолвится на s3 (target: "staging")._',
        ].join('\n')
      )
    }
  )

  // ─── agent_health ──────────────────────────────────────────────────────────────
  server.tool(
    'agent_health',
    'Health-check dashboard-agent на сервере (GET /health, без авторизации). Отличает «сервер недоступен» от «токен неверный».',
    { server: serverEnum.optional().describe('Сервер: s2 (прод, по умолчанию) или s3 (staging)') },
    async ({ server = 's2' }) => {
      try {
        const res = await agentRequest(server as InfraServer, { path: '/health', auth: false, timeoutMs: 10000 })
        return text(`✅ Агент на **${server}** отвечает.\n\n${pretty(res)}`)
      } catch (err) {
        return errorText(`❌ Агент на **${server}** недоступен: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  )

  // ─── git_status ────────────────────────────────────────────────────────────────
  server.tool(
    'git_status',
    'Git-статус репозитория на сервере (GET /api/git/status): ветка, незапушенные/входящие коммиты. Проверяй перед деплоем.',
    { server: serverEnum.optional().describe('Сервер: s2 (прод, по умолчанию) или s3 (staging)') },
    async ({ server = 's2' }) => {
      try {
        const res = await agentRequest(server as InfraServer, { path: '/api/git/status' })
        if (!res.success) {
          return errorText(`❌ git_status на ${server}: ${res.error ?? 'неизвестная ошибка'}`)
        }
        return text(`## Git-статус ${server}\n\n${pretty(res.data)}`)
      } catch (err) {
        return errorText(`❌ git_status на ${server}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  )

  // ─── deploy_status ───────────────────────────────────────────────────────────
  server.tool(
    'deploy_status',
    [
      'Статус деплоя на сервере (GET /api/deploy/status).',
      'Без deployId — текущий/последний деплой. sinceLine — курсор: вернёт только новые строки лога',
      '(экономит контекст при поллинге). В ответе totalLines/fromLine для следующего sinceLine.',
    ].join('\n'),
    {
      server: serverEnum.optional().describe('Сервер: s2 (прод, по умолчанию) или s3 (staging)'),
      deployId: z.string().optional().describe('ID конкретного деплоя из истории (без него — текущий/последний)'),
      sinceLine: z.number().int().min(0).optional().describe('Вернуть строки лога начиная с этого номера (курсор)'),
    },
    async ({ server = 's2', deployId, sinceLine }) => {
      const params = new URLSearchParams()
      if (deployId) {
        params.set('deployId', deployId)
      }
      if (sinceLine !== undefined) {
        params.set('sinceLine', String(sinceLine))
      }
      const qs = params.toString()
      try {
        const res = await agentRequest(server as InfraServer, {
          path: `/api/deploy/status${qs ? `?${qs}` : ''}`,
        })
        if (!res.success) {
          return errorText(`ℹ️ ${server}: ${res.error ?? 'нет данных о деплое'}`)
        }
        return text(`## Деплой на ${server}\n\n${pretty(res.data)}`)
      } catch (err) {
        return errorText(`❌ deploy_status на ${server}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  )

  // ─── deploy_cancel ───────────────────────────────────────────────────────────
  server.tool(
    'deploy_cancel',
    'Отменяет текущий деплой на сервере (POST /api/deploy/cancel, SIGTERM процессу). ⚠️ Прерывает деплой на полпути.',
    { server: serverEnum.optional().describe('Сервер: s2 (прод, по умолчанию) или s3 (staging)') },
    async ({ server = 's2' }) => {
      try {
        const res = await agentRequest(server as InfraServer, { method: 'POST', path: '/api/deploy/cancel' })
        if (!res.success) {
          return errorText(`❌ deploy_cancel на ${server}: ${res.error ?? 'нет активного деплоя'}`)
        }
        return text(`🛑 Деплой на ${server} отменён.\n\n${pretty(res.data)}`)
      } catch (err) {
        return errorText(`❌ deploy_cancel на ${server}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  )

  // ─── deploy_app ────────────────────────────────────────────────────────────────
  server.tool(
    'deploy_app',
    [
      'Запускает деплой приложения (POST /api/deploy/app) — замена сырого SSH + deploy-affected.sh.',
      'target: "production" (по умолчанию, → сервер приложения) или "staging" (→ s3, образ <app>:staging).',
      'Возвращает deployId — опрашивай прогресс через deploy_status({ server, deployId, sinceLine }).',
      '⚠️ Изменяет production. Перед деплоем убедись, что коммиты запушены (git_status).',
    ].join('\n'),
    {
      app: z
        .string()
        .regex(/^[a-z0-9-]+$/, 'Имя приложения: строчные буквы, цифры, дефис')
        .describe('Имя приложения'),
      target: z
        .enum(['production', 'staging'])
        .optional()
        .describe('production (по умолчанию, сервер приложения) или staging (s3)'),
    },
    async ({ app, target = 'production' }) => {
      const server = resolveDeployServer(app, target as DeployTarget)
      const staging = target === 'staging'
      // Warn-only e2e-gate: только для production, только предупреждает, никогда не блокирует
      const gateWarnings = staging ? [] : await checkE2eGate(app)
      const gatePrefix = gateWarnings.length > 0 ? [...gateWarnings, ''] : []
      try {
        const res = await agentRequest(server, {
          method: 'POST',
          path: '/api/deploy/app',
          body: { appName: app, staging },
        })
        if (!res.success) {
          return errorText(
            [...gatePrefix, `❌ Не удалось запустить деплой ${app} (${target}) на ${server}: ${res.error}`].join('\n')
          )
        }
        const data = res.data as { deployId?: string } | undefined
        return text(
          [
            ...gatePrefix,
            `🚀 Деплой **${app}** (${target}) запущен на **${server}**.`,
            '',
            `Опрашивай прогресс: \`deploy_status({ server: "${server}", deployId: "${
              data?.deployId ?? ''
            }", sinceLine: 0 })\``,
            '',
            pretty(res.data),
          ].join('\n')
        )
      } catch (err) {
        return errorText(
          [
            ...gatePrefix,
            `❌ deploy_app ${app} (${target}) на ${server}: ${err instanceof Error ? err.message : String(err)}`,
          ].join('\n')
        )
      }
    }
  )

  // ─── run_e2e ─────────────────────────────────────────────────────────────────
  server.tool(
    'run_e2e',
    [
      'Запускает Playwright e2e-прогон на s3 (POST /api/e2e/run) против staging-контейнера приложения.',
      'Приложение должно быть уже задеплоено на staging (deploy_app target:"staging") — e2e бьёт по',
      "<app>.s3.letar.best. Результат пишется в .last-e2e-status/<app>.json и читается warn-gate'ом",
      'в deploy_app(production). Возвращает runId — опрашивай через e2e_status.',
    ].join('\n'),
    {
      app: z
        .string()
        .regex(/^[a-z0-9-]+$/, 'Имя приложения: строчные буквы, цифры, дефис')
        .describe('Имя приложения'),
      project: z.string().optional().describe('Playwright project (chromium/firefox/webkit/shard-*); по умолчанию все'),
    },
    async ({ app, project }) => {
      try {
        const res = await agentRequest('s3', { method: 'POST', path: '/api/e2e/run', body: { app, project } })
        if (!res.success) {
          return errorText(`❌ Не удалось запустить e2e для ${app}: ${res.error}`)
        }
        const data = res.data as { runId?: string } | undefined
        return text(
          [
            `🧪 E2E для **${app}** запущен на **s3**.`,
            '',
            `Опрашивай прогресс: \`e2e_status({ app: "${app}", runId: "${data?.runId ?? ''}", sinceLine: 0 })\``,
            '',
            pretty(res.data),
          ].join('\n')
        )
      } catch (err) {
        return errorText(`❌ run_e2e ${app}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  )

  // ─── e2e_status ──────────────────────────────────────────────────────────────
  server.tool(
    'e2e_status',
    [
      'Статус e2e-прогона на s3 (GET /api/e2e/status). Без runId — последний прогон приложения.',
      'sinceLine — курсор лога. Всегда возвращает lastStatus (персистентный .last-e2e-status/<app>.json),',
      'даже если сейчас ничего не запущено — это то, что читает warn-gate в deploy_app(production).',
    ].join('\n'),
    {
      app: z.string().optional().describe('Имя приложения (для lastStatus и последнего прогона)'),
      runId: z.string().optional().describe('ID конкретного прогона из истории'),
      sinceLine: z.number().int().min(0).optional().describe('Курсор лога'),
    },
    async ({ app, runId, sinceLine }) => {
      const params = new URLSearchParams()
      if (app) {
        params.set('app', app)
      }
      if (runId) {
        params.set('runId', runId)
      }
      if (sinceLine !== undefined) {
        params.set('sinceLine', String(sinceLine))
      }
      const qs = params.toString()
      try {
        const res = await agentRequest('s3', { path: `/api/e2e/status${qs ? `?${qs}` : ''}` })
        if (!res.success) {
          return errorText(`ℹ️ e2e на s3: ${res.error ?? 'нет данных'}`)
        }
        return text(`## E2E статус${app ? ` (${app})` : ''}\n\n${pretty(res.data)}`)
      } catch (err) {
        return errorText(`❌ e2e_status: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  )

  return server
}
