/**
 * E2E API Routes
 *
 * Запуск Playwright e2e-прогона на s3 (единственный e2e-раннер, см. e2e-testing.md)
 * против staging-контейнера приложения и чтение персистентного статуса. Часть
 * staging-gated пайплайна (PLAN.md §18 Сессия D): deploy-mcp читает
 * `.last-e2e-status/<app>.json` перед production-деплоем (warn-only gate).
 *
 * baseUrl передаётся явно из POST body (не хардкодится) — все playwright.config.ts
 * в монорепо читают `process.env.BASE_URL` (единая конвенция, см. любой apps/*-e2e).
 * baseUrl ВСЕГДА реальный публичный HTTPS-домен `https://<app>-stage.s3.letar.best`,
 * НЕ `http://localhost:<port>` — иначе Playwright молча поднимает свой dev-сервер
 * (webServer.reuseExistingServer в playwright.config.ts) и прогон становится ложным
 * (PLAN.md §18.7, aboi 2026-07-19 — ложный localhost-прогон дал совсем другой набор
 * отказов, чем реальный staging).
 */

import { type ChildProcess, spawn } from 'child_process'
import { randomUUID } from 'crypto'
import type { FastifyInstance } from 'fastify'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { getCurrentCommit } from '../lib/git'
import { hostShellArgs } from '../lib/host-exec'
import { getCurrentServer } from '../lib/server-config'
import type { ApiResponse } from '../types'

const REPO_PATH = process.env.REPO_PATH || '/home/deploy/letar'
const STATUS_DIR = path.join(REPO_PATH, '.last-e2e-status')

// Ограничения хранения — как в deploy.ts (ring-buffer + cap строк лога)
const MAX_E2E_HISTORY = 20
const MAX_OUTPUT_LINES = 2000

// Таймаут прогона (PLAN-INFRA.md §18.7, hard e2e-gate): без него зависший процесс никогда не
// пишет .last-e2e-status/<app>.json, и evaluateE2eGate в deploy-mcp продолжает читать СТАРЫЙ
// (потенциально «зелёный») статус — зависание молча не блокирует прод-деплой. Таймаут явно
// помечает прогон как failed, а не оставляет «прогона как будто не было».
const E2E_RUN_TIMEOUT_MS = 15 * 60 * 1000
const E2E_KILL_GRACE_MS = 10 * 1000

interface E2eRun {
  runId: string
  running: boolean
  app: string
  project?: string
  grep?: string
  workers?: number
  startTime?: string
  endTime?: string
  exitCode?: number | null
  output: string[]
  truncatedLines: number
  error?: string
}

/** Персистентный результат последнего прогона — читает warn-gate в deploy-mcp. */
interface LastE2eStatus {
  commitSha: string
  passed: boolean
  timestamp: string
  durationMs: number
}

const e2eHistory: E2eRun[] = []
let currentProcess: ChildProcess | null = null

function createRun(partial: Omit<E2eRun, 'runId' | 'output' | 'truncatedLines'>): E2eRun {
  const run: E2eRun = { runId: randomUUID(), output: [], truncatedLines: 0, ...partial }
  e2eHistory.push(run)
  if (e2eHistory.length > MAX_E2E_HISTORY) {
    e2eHistory.shift()
  }
  return run
}

function appendOutput(run: E2eRun, line: string): void {
  run.output.push(line)
  if (run.output.length > MAX_OUTPUT_LINES) {
    run.output.shift()
    run.truncatedLines++
  }
}

function getLatestRun(app?: string): E2eRun | undefined {
  const list = app ? e2eHistory.filter((r) => r.app === app) : e2eHistory
  return list[list.length - 1]
}

function isE2eRunning(): boolean {
  return e2eHistory.some((r) => r.running)
}

/** Читает персистентный статус последнего успешного/неуспешного прогона приложения. */
function readLastStatus(app: string): LastE2eStatus | undefined {
  const file = path.join(STATUS_DIR, `${app}.json`)
  if (!existsSync(file)) {
    return undefined
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as LastE2eStatus
  } catch {
    return undefined
  }
}

function writeLastStatus(app: string, status: LastE2eStatus): void {
  if (!existsSync(STATUS_DIR)) {
    mkdirSync(STATUS_DIR, { recursive: true })
  }
  writeFileSync(path.join(STATUS_DIR, `${app}.json`), JSON.stringify(status, null, 2))
}

export async function e2eRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/e2e/status — статус e2e-прогона
   * Query:
   *   app       — фильтр по приложению (нужен и для lastStatus, и для последнего прогона без runId)
   *   runId     — конкретный прогон из истории
   *   sinceLine — курсор лога (как в /api/deploy/status)
   *
   * Всегда возвращает lastStatus (персистентный .last-e2e-status/<app>.json), даже если сейчас
   * ничего не запущено — это то, что читает warn-gate deploy-mcp перед production-деплоем.
   */
  fastify.get<{ Querystring: { app?: string; runId?: string; sinceLine?: string } }>(
    '/api/e2e/status',
    async (
      request,
    ): Promise<
      ApiResponse<{
        run: (Omit<E2eRun, 'output'> & { output: string[]; totalLines: number; fromLine: number }) | null
        lastStatus: LastE2eStatus | null
      }>
    > => {
      const { app, runId, sinceLine } = request.query
      const run = runId ? e2eHistory.find((r) => r.runId === runId) : getLatestRun(app)
      const lastStatus = app ? (readLastStatus(app) ?? null) : null

      if (!run) {
        return { success: true, data: { run: null, lastStatus }, timestamp: new Date().toISOString() }
      }

      const totalLines = run.truncatedLines + run.output.length
      const since = sinceLine !== undefined ? Math.max(0, parseInt(sinceLine, 10) || 0) : 0
      const startIdx = Math.max(0, since - run.truncatedLines)
      const output = run.output.slice(startIdx)
      const fromLine = run.truncatedLines + startIdx

      return {
        success: true,
        data: { run: { ...run, output, totalLines, fromLine }, lastStatus },
        timestamp: new Date().toISOString(),
      }
    },
  )

  /**
   * POST /api/e2e/run — запускает `nx e2e <app>-e2e` против staging-контейнера
   * Body: { app: string; baseUrl: string; project?: string; grep?: string; workers?: number }
   * baseUrl — куда бить: ВСЕГДА реальный публичный HTTPS-домен `https://<app>-stage.s3.letar.best`,
   * НЕ `http://localhost:<port>` — localhost не годится для проверки cookie/CORS/OIDC-редиректов,
   * а если он окажется недостижим, Playwright молча поднимет свой dev-сервер и результат прогона
   * будет ложным (PLAN.md §18.7, aboi 2026-07-19). Клиент (libs/deploy-mcp) уже блокирует
   * localhost/127.0.0.1 на уровне схемы — сюда localhost не должен долетать в принципе.
   * project — конкретный Playwright project (chromium/firefox/webkit/shard-*); без него — все.
   * grep — передаётся в `playwright test --grep` (имя файла/спека/название теста, подстрока
   * или regex) для точечного прогона вместо всего набора — экономит время (2026-07-22:
   * запрос точечной проверки /admin/products гонял все 123 теста за отсутствием фильтра).
   * workers — передаётся в `playwright test --workers`. Без него — дефолт Playwright (все ядра).
   * Полный параллелизм (несколько браузеров × несколько воркеров) создаёт ресурсную перегрузку
   * на общем staging-контейнере — CPU-bound шаги (scrypt-хеширование пароля, WebRTC/geolocation
   * таймауты) флейкуют при полном параллелизме и стабильно проходят при `workers=1` (aboi,
   * 2026-08-08). `1` — не гарантированный дефолт для всех приложений, задаётся по запросу.
   *
   * Асинхронный: возвращает runId сразу, клиент опрашивает /api/e2e/status.
   * По завершении пишет `.last-e2e-status/<app>.json` — читается warn-gate'ом deploy_app(production).
   */
  fastify.post<{ Body: { app: string; baseUrl: string; project?: string; grep?: string; workers?: number } }>(
    '/api/e2e/run',
    async (request): Promise<ApiResponse<{ runId: string; app: string; started: boolean }>> => {
      const { app, baseUrl, project, grep, workers } = request.body

      if (!app) {
        return { success: false, error: 'App name is required', timestamp: new Date().toISOString() }
      }
      if (!/^[a-z0-9-]+$/.test(app)) {
        return { success: false, error: 'Invalid app name format', timestamp: new Date().toISOString() }
      }
      if (!baseUrl) {
        return { success: false, error: 'baseUrl is required', timestamp: new Date().toISOString() }
      }
      // project интерполируется в shell-строку для nsenter (см. ниже) — обязательная валидация,
      // иначе это command injection в root-контекст хоста (nsenter -t 1 выходит из контейнера).
      if (project !== undefined && !/^[a-z0-9-]+$/.test(project)) {
        return { success: false, error: 'Invalid project format', timestamp: new Date().toISOString() }
      }
      // grep тоже интерполируется в shell-строку (внутри одинарных кавычек) — запрещаем символы,
      // которыми можно вырваться из кавычек или инжектировать команду. Кириллица/пробелы/пунктуация
      // (для поиска по названию теста) разрешены, поэтому это deny-, а не allow-лист.
      if (grep !== undefined && (grep.length > 200 || /['"`$;|&<>\\\r\n]/.test(grep))) {
        return {
          success: false,
          error: 'Invalid grep pattern (запрещены кавычки/`$;|&<>\\` и переносы строк, макс. 200 символов)',
          timestamp: new Date().toISOString(),
        }
      }
      // workers тоже интерполируется в shell-строку — числовая проверка убирает риск инъекции
      // без regex-эквилибристики. Верхняя граница 16 — щедрый потолок, реальные раннеры s3 меньше.
      if (workers !== undefined && (!Number.isInteger(workers) || workers < 1 || workers > 16)) {
        return {
          success: false,
          error: 'Invalid workers value (целое число от 1 до 16)',
          timestamp: new Date().toISOString(),
        }
      }

      // e2e гоняется только на s3 — там PostgreSQL/Redis E2E-инфра и nightly cron (e2e-testing.md)
      if (getCurrentServer() !== 's3') {
        return {
          success: false,
          error: 'E2E запускается только на s3 (staging-раннер), этот сервер — не s3',
          timestamp: new Date().toISOString(),
        }
      }

      if (isE2eRunning()) {
        return { success: false, error: 'Другой e2e-прогон уже выполняется', timestamp: new Date().toISOString() }
      }

      const run = createRun({ running: true, app, project, grep, workers, startTime: new Date().toISOString() })
      appendOutput(
        run,
        `🧪 Running e2e: ${app}${project ? ` (project=${project})` : ''}${grep ? ` (grep=${grep})` : ''}${
          workers !== undefined ? ` (workers=${workers})` : ''
        } against ${baseUrl}`,
      )

      // Коммит фиксируем ДО прогона — это то, что реально протестировано (не что задеплоено).
      let commitSha = 'unknown'
      try {
        commitSha = (await getCurrentCommit()).hash
      } catch {
        // не блокируем прогон из-за невозможности определить sha
      }

      // nsenter выполняет команду на хосте (pid: host + privileged) — как в deploy.ts.
      // Внутри контейнера dashboard-agent нет ни `nx`, ни воркспейса; сам монорепо и bun/nx
      // существуют только на хосте s3. `project`/`grep` уже провалидированы выше (regex/deny-лист) —
      // обязательно до интерполяции в шелл-строку, см. hostShellArgs().
      // ⚠️ grep оборачиваем ДВОЙНЫМИ кавычками, не одинарными: e2eCommand целиком попадает внутрь
      // одинарных кавычек в nxCommand ниже (`bash -c '${e2eCommand}'`) — одинарная кавычка здесь
      // преждевременно закрыла бы ту внешнюю обёртку. Deny-лист выше уже исключает `"` из grep,
      // так что вложенные двойные кавычки безопасны.
      const extraArgs = [
        project ? `--project=${project}` : '',
        grep ? `--grep "${grep}"` : '',
        workers !== undefined ? `--workers=${workers}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      const e2eCommand = `cd ${REPO_PATH} && bunx nx e2e ${app}-e2e${extraArgs ? ` -- ${extraArgs}` : ''}`
      // nsenter -t 1 наследует root (privileged-контейнер) — без переключения на deploy
      // прогон создаёт root-owned .nx/workspace-data и apps/<app>-e2e/test-output,
      // которые потом ломают следующий deploy_app/run_e2e (EACCES). Тот же приём,
      // что и DEPLOY_AS_ROOT-гвард в deploy-affected.sh:11-19.
      // ⚠️ `sudo -u deploy -H` по умолчанию СБРАСЫВАЕТ окружение (та же ловушка, что уже была
      // с SOPS_AGE_KEY_FILE в deploy-affected.sh) — без --preserve-env BASE_URL/DEV_SESSION_TOKEN
      // не долетают до `bunx nx e2e`, Playwright не видит staging baseUrl и поднимает свой
      // `nx dev` против dev-БД (регрессия, найдена BlackCove на живом прогоне 2026-07-11).
      const nxCommand =
        `if [ "$(id -u)" = "0" ] && id deploy >/dev/null 2>&1; then exec sudo -u deploy -H --preserve-env=BASE_URL,DEV_SESSION_TOKEN -- bash -c '${e2eCommand}'; fi; ${e2eCommand}`
      const args = hostShellArgs(nxCommand)
      appendOutput(run, `📋 Command: nsenter -- bash -c "${nxCommand}"`)

      // BASE_URL — единая конвенция всех playwright.config.ts в монорепо (apps/*-e2e).
      // webServer.reuseExistingServer:true в конфигах означает: раз baseUrl уже отвечает
      // (staging-контейнер поднят), Playwright НЕ запускает `nx dev <app>` — бьёт напрямую.
      // nsenter наследует env спавна (тот же приём, что SOPS_AGE_KEY_FILE в deploy.ts).
      const env = { ...process.env, BASE_URL: baseUrl }

      currentProcess = spawn('nsenter', args, { stdio: ['ignore', 'pipe', 'pipe'], env })

      // Таймаут: без него зависший прогон никогда не пишет lastStatus, и hard e2e-gate в
      // deploy-mcp продолжает читать старый (возможно зелёный) статус — зависание молча НЕ
      // блокирует прод-деплой. SIGTERM сначала (даёт Playwright шанс на graceful shutdown),
      // SIGKILL через E2E_KILL_GRACE_MS если процесс не среагировал.
      let timedOut = false
      const timeoutTimer = setTimeout(() => {
        timedOut = true
        appendOutput(run, `⏱️ E2E не уложился в ${E2E_RUN_TIMEOUT_MS / 60000} мин — останавливаю (SIGTERM)`)
        currentProcess?.kill('SIGTERM')
        setTimeout(() => {
          if (run.running) {
            appendOutput(run, '⏱️ Процесс не завершился после SIGTERM — SIGKILL')
            currentProcess?.kill('SIGKILL')
          }
        }, E2E_KILL_GRACE_MS)
      }, E2E_RUN_TIMEOUT_MS)

      currentProcess.stdout?.on('data', (data: Buffer) => {
        for (
          const line of data
            .toString()
            .split('\n')
            .filter((l) => l.trim())
        ) {
          appendOutput(run, line)
        }
      })

      currentProcess.stderr?.on('data', (data: Buffer) => {
        for (
          const line of data
            .toString()
            .split('\n')
            .filter((l) => l.trim())
        ) {
          appendOutput(run, `⚠️ ${line}`)
        }
      })

      currentProcess.on('close', (code) => {
        clearTimeout(timeoutTimer)
        run.exitCode = code
        run.running = false
        run.endTime = new Date().toISOString()
        const passed = !timedOut && code === 0
        if (timedOut) {
          appendOutput(run, '❌ E2E остановлен по таймауту')
          run.error = `Timed out after ${E2E_RUN_TIMEOUT_MS / 60000} min`
        } else {
          appendOutput(run, passed ? '✅ E2E passed' : `❌ E2E failed with exit code ${code}`)
          if (!passed) {
            run.error = `Process exited with code ${code}`
          }
        }

        const durationMs = run.startTime ? Date.now() - new Date(run.startTime).getTime() : 0
        writeLastStatus(app, { commitSha, passed, timestamp: run.endTime, durationMs })

        currentProcess = null
      })

      currentProcess.on('error', (error) => {
        clearTimeout(timeoutTimer)
        appendOutput(run, `❌ Process error: ${error.message}`)
        run.error = error.message
        run.running = false
        run.endTime = new Date().toISOString()
        // Инфраструктурный сбой самого прогона (не тест упал, а процесс не смог стартовать/
        // выполниться) должен блокировать hard-gated приложения так же, как явный fail —
        // без записи lastStatus гейт продолжил бы читать старый (возможно зелёный) статус.
        const durationMs = run.startTime ? Date.now() - new Date(run.startTime).getTime() : 0
        writeLastStatus(app, { commitSha, passed: false, timestamp: run.endTime, durationMs })
        currentProcess = null
      })

      return {
        success: true,
        data: { runId: run.runId, app, started: true },
        timestamp: new Date().toISOString(),
      }
    },
  )
}
