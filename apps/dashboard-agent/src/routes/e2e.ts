/**
 * E2E API Routes
 *
 * Запуск Playwright e2e-прогона на s3 (единственный e2e-раннер, см. e2e-testing.md)
 * против staging-контейнера приложения и чтение персистентного статуса. Часть
 * staging-gated пайплайна (PLAN.md §18 Сессия D): deploy-mcp читает
 * `.last-e2e-status/<app>.json` перед production-деплоем (warn-only gate).
 *
 * baseUrl передаётся явно из POST body (не хардкодится) — все playwright.config.ts
 * в монорепо читают `process.env.BASE_URL` (единая конвенция, см. любой apps/*-e2e),
 * без единого стандарта публичного staging-домена на s3 пока нет: e2e чаще всего
 * бьёт напрямую по `http://localhost:<staging-host-port>` того же хоста s3.
 */

import { type ChildProcess, spawn } from 'child_process'
import { randomUUID } from 'crypto'
import type { FastifyInstance } from 'fastify'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { getCurrentCommit } from '../lib/git'
import { getCurrentServer } from '../lib/server-config'
import type { ApiResponse } from '../types'

const REPO_PATH = process.env.REPO_PATH || '/home/deploy/letar'
const STATUS_DIR = path.join(REPO_PATH, '.last-e2e-status')

// Ограничения хранения — как в deploy.ts (ring-buffer + cap строк лога)
const MAX_E2E_HISTORY = 20
const MAX_OUTPUT_LINES = 2000

interface E2eRun {
  runId: string
  running: boolean
  app: string
  project?: string
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
      request
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
    }
  )

  /**
   * POST /api/e2e/run — запускает `nx e2e <app>-e2e` против staging-контейнера
   * Body: { app: string; baseUrl: string; project?: string }
   * baseUrl — куда бить (обычно `http://localhost:<staging-host-port>` на этом же s3).
   * project — конкретный Playwright project (chromium/firefox/webkit/shard-*); без него — все.
   *
   * Асинхронный: возвращает runId сразу, клиент опрашивает /api/e2e/status.
   * По завершении пишет `.last-e2e-status/<app>.json` — читается warn-gate'ом deploy_app(production).
   */
  fastify.post<{ Body: { app: string; baseUrl: string; project?: string } }>(
    '/api/e2e/run',
    async (request): Promise<ApiResponse<{ runId: string; app: string; started: boolean }>> => {
      const { app, baseUrl, project } = request.body

      if (!app) {
        return { success: false, error: 'App name is required', timestamp: new Date().toISOString() }
      }
      if (!/^[a-z0-9-]+$/.test(app)) {
        return { success: false, error: 'Invalid app name format', timestamp: new Date().toISOString() }
      }
      if (!baseUrl) {
        return { success: false, error: 'baseUrl is required', timestamp: new Date().toISOString() }
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

      const run = createRun({ running: true, app, project, startTime: new Date().toISOString() })
      appendOutput(run, `🧪 Running e2e: ${app}${project ? ` (project=${project})` : ''} against ${baseUrl}`)

      // Коммит фиксируем ДО прогона — это то, что реально протестировано (не что задеплоено).
      let commitSha = 'unknown'
      try {
        commitSha = (await getCurrentCommit()).hash
      } catch {
        // не блокируем прогон из-за невозможности определить sha
      }

      const args = ['e2e', `${app}-e2e`]
      if (project) {
        args.push('--', `--project=${project}`)
      }
      appendOutput(run, `📋 Command: nx ${args.join(' ')}`)

      // BASE_URL — единая конвенция всех playwright.config.ts в монорепо (apps/*-e2e).
      // webServer.reuseExistingServer:true в конфигах означает: раз baseUrl уже отвечает
      // (staging-контейнер поднят), Playwright НЕ запускает `nx dev <app>` — бьёт напрямую.
      const env = { ...process.env, BASE_URL: baseUrl }

      currentProcess = spawn('nx', args, { cwd: REPO_PATH, stdio: ['ignore', 'pipe', 'pipe'], env })

      currentProcess.stdout?.on('data', (data: Buffer) => {
        for (const line of data
          .toString()
          .split('\n')
          .filter((l) => l.trim())) {
          appendOutput(run, line)
        }
      })

      currentProcess.stderr?.on('data', (data: Buffer) => {
        for (const line of data
          .toString()
          .split('\n')
          .filter((l) => l.trim())) {
          appendOutput(run, `⚠️ ${line}`)
        }
      })

      currentProcess.on('close', (code) => {
        run.exitCode = code
        run.running = false
        run.endTime = new Date().toISOString()
        const passed = code === 0
        appendOutput(run, passed ? '✅ E2E passed' : `❌ E2E failed with exit code ${code}`)
        if (!passed) {
          run.error = `Process exited with code ${code}`
        }

        const durationMs = run.startTime ? Date.now() - new Date(run.startTime).getTime() : 0
        writeLastStatus(app, { commitSha, passed, timestamp: run.endTime, durationMs })

        currentProcess = null
      })

      currentProcess.on('error', (error) => {
        appendOutput(run, `❌ Process error: ${error.message}`)
        run.error = error.message
        run.running = false
        run.endTime = new Date().toISOString()
        currentProcess = null
      })

      return {
        success: true,
        data: { runId: run.runId, app, started: true },
        timestamp: new Date().toISOString(),
      }
    }
  )
}
