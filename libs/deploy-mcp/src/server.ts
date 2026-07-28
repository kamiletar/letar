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

import {
  type DeployTarget,
  HARD_GATED_APPS,
  type InfraServer,
  resolveDeployServer,
  SERVER_APPS,
  SERVERS,
} from '@letar/infra-config'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { agentRequest, type AgentResponse } from './client.js'
import { localHeadSha } from './config.js'

const serverEnum = z.enum(['s2', 's3'])
const E2E_GATE_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Форма ответа `/api/e2e/status` — то же поле, что читает и warn-, и hard-gate. */
interface E2eStatusResponse {
  lastStatus: { commitSha: string; passed: boolean; timestamp: string } | null
}

/** Результат оценки e2e-гейта: причины (человекочитаемые) + решение блокировать или нет. */
interface E2eGateResult {
  /** true только для hard-gated приложения с хотя бы одной причиной — деплой должен отказать. */
  blocked: boolean
  /** Причины без ведущего «⚠️»/форматирования — вызывающий код сам решает, как их показать. */
  reasons: string[]
}

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
 * Оценивает e2e-гейт перед production-деплоем (PLAN.md §18 Сессия D, PLAN-INFRA.md §18.7):
 * читает `.last-e2e-status/<app>.json` на s3 через dashboard-agent и собирает причины
 * (несвежий/проваленный/отсутствующий прогон, коммит не совпадает, инфраструктурная ошибка).
 *
 * Для приложений из `HARD_GATED_APPS` (archetest, dsperevod, svoichuzhie, aboi, aprel8008 —
 * PLAN-INFRA.md §18.7, инцидент archetest 2026-07-28) любая причина блокирует деплой
 * (`blocked: true`, fail-closed). Для остальных — те же причины остаются предупреждениями, деплой
 * продолжается (`blocked: false`) — старое warn-only поведение Фазы 2 не меняется.
 *
 * Зависимости (`fetchStatus`/`getHeadSha`) инжектируются — позволяет тестировать логику
 * гейта без реального SSH-туннеля/git (см. `server.spec.ts`).
 */
export async function evaluateE2eGate(
  app: string,
  hardGated: boolean,
  fetchStatus: (app: string) => Promise<AgentResponse<E2eStatusResponse>> = (a) =>
    agentRequest<E2eStatusResponse>('s3', { path: `/api/e2e/status?app=${encodeURIComponent(a)}`, timeoutMs: 10000 }),
  getHeadSha: () => string = localHeadSha,
): Promise<E2eGateResult> {
  const reasons: string[] = []
  try {
    const res = await fetchStatus(app)
    if (!res.success) {
      reasons.push(`не удалось получить статус e2e на s3 (${res.error ?? 'нет данных'})`)
      return { blocked: hardGated, reasons }
    }
    const last = res.data?.lastStatus ?? null
    if (!last) {
      reasons.push(`для ${app} ещё ни разу не прогонялся e2e на staging — нет данных для сверки`)
      return { blocked: hardGated, reasons }
    }
    if (!last.passed) {
      reasons.push(`последний e2e для ${app} (коммит ${last.commitSha.slice(0, 7)}, ${last.timestamp}) УПАЛ`)
    }
    try {
      const head = getHeadSha()
      if (last.commitSha !== head) {
        reasons.push(
          `e2e прогонялся на ${last.commitSha.slice(0, 7)}, а деплоится ${head.slice(0, 7)} — не тот же коммит`,
        )
      }
    } catch {
      // Не удалось определить локальный HEAD. Для warn-only приложений просто пропускаем сверку
      // коммита. Для hard-gated это тоже повод отказать (fail-closed) — мы не можем подтвердить,
      // что прошедший e2e относится к тому же коду, что сейчас деплоится.
      if (hardGated) {
        reasons.push('не удалось определить локальный HEAD для сверки коммита e2e-прогона')
      }
    }
    const ageMs = Date.now() - new Date(last.timestamp).getTime()
    if (ageMs > E2E_GATE_MAX_AGE_MS) {
      reasons.push(`последний прогон для ${app} старше 24ч (${last.timestamp})`)
    }
  } catch (err) {
    reasons.push(`ошибка проверки e2e-статуса (${err instanceof Error ? err.message : String(err)})`)
  }
  return { blocked: hardGated && reasons.length > 0, reasons }
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
        ].join('\n'),
      )
    },
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
    },
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
    },
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
    },
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
    },
  )

  // ─── deploy_app ────────────────────────────────────────────────────────────────
  server.tool(
    'deploy_app',
    [
      'Запускает деплой приложения (POST /api/deploy/app) — замена сырого SSH + deploy-affected.sh.',
      'target: "production" (по умолчанию, → сервер приложения) или "staging" (→ s3, образ <app>:staging).',
      'seed: true → deploy-affected.sh --seed (nx run <app>:db:seed после успешного деплоя).',
      'Возвращает deployId — опрашивай прогресс через deploy_status({ server, deployId, sinceLine }).',
      '⚠️ Изменяет production. Перед деплоем убедись, что коммиты запушены (git_status).',
      '⛔ Для archetest/dsperevod/svoichuzhie/aboi/aprel8008 (HARD_GATED_APPS) production-деплой',
      'ОТКАЗЫВАЕТ без свежего зелёного e2e на staging для текущего коммита — не обходится флагом.',
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
      seed: z.boolean().optional().describe('Запустить nx run <app>:db:seed после успешного деплоя (--seed)'),
    },
    async ({ app, target = 'production', seed = false }) => {
      const server = resolveDeployServer(app, target as DeployTarget)
      const staging = target === 'staging'
      const hardGated = !staging && HARD_GATED_APPS.includes(app)
      // e2e-gate: только для production. Для HARD_GATED_APPS — fail-closed (блокирует деплой),
      // для остальных — старое warn-only поведение Фазы 2 (только предупреждает).
      const gate = staging ? { blocked: false, reasons: [] } : await evaluateE2eGate(app, hardGated)
      if (gate.blocked) {
        return errorText(
          [
            `⛔ deploy_app(${app}, production) заблокирован hard e2e-gate:`,
            ...gate.reasons.map((r) => `- ${r}`),
            '',
            'Чтобы снять блок: deploy_app({ app, target: "staging" }) → run_e2e({ app, baseUrl: '
            + `"https://${app}-stage.s3.letar.best" }) → дождаться passed:true на текущем коммите → повторить deploy_app.`,
          ].join('\n'),
        )
      }
      const gatePrefix = gate.reasons.length > 0 ? [...gate.reasons.map((r) => `⚠️ e2e-gate: ${r}.`), ''] : []
      try {
        const res = await agentRequest(server, {
          method: 'POST',
          path: '/api/deploy/app',
          body: { appName: app, staging, seed },
        })
        if (!res.success) {
          return errorText(
            [...gatePrefix, `❌ Не удалось запустить деплой ${app} (${target}) на ${server}: ${res.error}`].join('\n'),
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
          ].join('\n'),
        )
      } catch (err) {
        return errorText(
          [
            ...gatePrefix,
            `❌ deploy_app ${app} (${target}) на ${server}: ${err instanceof Error ? err.message : String(err)}`,
          ].join('\n'),
        )
      }
    },
  )

  // ─── run_e2e ─────────────────────────────────────────────────────────────────
  server.tool(
    'run_e2e',
    [
      'Запускает Playwright e2e-прогон на s3 (POST /api/e2e/run) против staging-контейнера приложения.',
      'Приложение должно быть уже задеплоено на staging (deploy_app target:"staging"). baseUrl — куда бить',
      '⚠️ ВСЕГДА реальный публичный HTTPS-домен `https://<app>-stage.s3.letar.best`, НИКОГДА',
      '`http://localhost:<port>` — localhost не годится для проверки cookie/CORS/OIDC-редиректов, а',
      'если baseUrl случайно окажется недостижим/не тем, Playwright молча поднимет свой локальный',
      'dev-сервер (webServer.reuseExistingServer в playwright.config.ts) и результат прогона будет',
      'ложным — проверял не staging-контейнер, а cold dev-режим (PLAN.md §18.7, aboi 2026-07-19).',
      "Результат пишется в .last-e2e-status/<app>.json и читается warn-gate'ом в deploy_app(production).",
      'Возвращает runId — опрашивай через e2e_status.',
      '',
      'grep — точечный прогон вместо всего набора (playwright test --grep): имя файла-спека, название',
      'теста/describe-блока (подстрока) или regex. Экономит время, когда нужно подтвердить фикс в паре',
      'тестов, а не гонять все ~100+ (типовой кейс: точечная проверка после фикса конкретной страницы).',
    ].join('\n'),
    {
      app: z
        .string()
        .regex(/^[a-z0-9-]+$/, 'Имя приложения: строчные буквы, цифры, дефис')
        .describe('Имя приложения'),
      baseUrl: z
        .string()
        .url()
        .refine((v) => !/^https?:\/\/localhost(:|\/|$)/.test(v) && !/^https?:\/\/127\.0\.0\.1(:|\/|$)/.test(v), {
          message: 'baseUrl не должен быть localhost/127.0.0.1 — используй реальный публичный домен '
            + 'https://<app>-stage.s3.letar.best (иначе Playwright поднимет свой dev-сервер и прогон будет ложным)',
        })
        .describe('Публичный HTTPS-домен staging на s3, например https://aboi-stage.s3.letar.best (НЕ localhost)'),
      project: z.string().optional().describe('Playwright project (chromium/firefox/webkit/shard-*); по умолчанию все'),
      grep: z
        .string()
        .max(200, 'grep слишком длинный (макс. 200 символов)')
        .refine((v) => !/['"`$;|&<>\\\r\n]/.test(v), {
          message: 'grep не должен содержать кавычки/`$;|&<>\\` и переносы строк (интерполируется в shell на s3)',
        })
        .optional()
        .describe(
          'Точечный прогон вместо всего набора: имя файла-спека (например "03-admin-products.admin.spec.ts") '
            + 'или подстрока/regex названия теста, передаётся в `playwright test --grep`. Без него — весь набор.',
        ),
    },
    async ({ app, baseUrl, project, grep }) => {
      try {
        const res = await agentRequest('s3', {
          method: 'POST',
          path: '/api/e2e/run',
          body: { app, baseUrl, project, grep },
        })
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
          ].join('\n'),
        )
      } catch (err) {
        return errorText(`❌ run_e2e ${app}: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
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
    },
  )

  return server
}
