#!/usr/bin/env node
/**
 * CLI-вход deploy-engine. Исполняется на хосте из корня репозитория:
 *   bun run libs/deploy-engine/src/cli.ts doctor --app grandslamcup
 *   bun run libs/deploy-engine/src/cli.ts status --app grandslamcup
 *
 * dashboard-agent вызывает движок тем же паттерном, что сейчас bash —
 * `spawn('nsenter', hostExecArgs([...]))` (apps/dashboard-agent/src/routes/deploy.ts).
 */

import { parseArgs } from 'node:util'
import { type DoctorReport, runDoctor } from './doctor.js'
import { createNodeExecutor } from './executor.js'
import { type RolloutResult, runRollout } from './rollout.js'
import { getStatus } from './status.js'

const DEFAULT_NPM_CONTAINER = 'nginx-proxy-manager'

function printDoctorReport(report: DoctorReport): void {
  console.log(`## doctor ${report.app} (${report.composePath})\n`)
  for (const check of report.checks) {
    const icon = check.passed ? '✅' : check.severity === 'required' ? '❌' : '⚠️'
    console.log(`${icon} [${check.id}] ${check.description}${check.detail ? ` — ${check.detail}` : ''}`)
  }
  console.log(`\n${report.ready ? '✅ READY' : '❌ NOT READY'} — rollout ${report.ready ? 'разрешён' : 'заблокирован'}`)
}

function printRolloutResult(result: RolloutResult): void {
  console.log(`## rollout ${result.app}\n`)
  for (const step of result.steps) {
    console.log(`${step.ok ? '✅' : '❌'} [${step.id}] ${step.description}${step.detail ? ` — ${step.detail}` : ''}`)
  }
  console.log(`\n${result.ok ? '✅ OK' : '❌ FAILED'}`)
}

function requireApp(rest: string[], usage: string): string {
  const { values } = parseArgs({ args: rest, options: { app: { type: 'string' } } })
  if (!values.app) {
    console.error(usage)
    process.exit(2)
  }
  return values.app
}

async function main(): Promise<void> {
  const [subcommand, ...rest] = process.argv.slice(2)
  const executor = createNodeExecutor()

  switch (subcommand) {
    case 'doctor': {
      const app = requireApp(rest, 'Использование: deploy-engine doctor --app <имя>')
      const report = await runDoctor(executor, app)
      printDoctorReport(report)
      process.exit(report.ready ? 0 : 1)
      break
    }
    case 'status': {
      const app = requireApp(rest, 'Использование: deploy-engine status --app <имя>')
      const status = await getStatus(executor, app)
      console.log(JSON.stringify(status, null, 2))
      break
    }
    case 'rollout': {
      const usage =
        'Использование: deploy-engine rollout --app <имя> [--deploy-tag <sha>] [--npm-container <имя>] [--project-name <имя>] [--env-file <файл>]'
      const app = requireApp(rest, usage)
      const { values } = parseArgs({
        args: rest,
        options: {
          app: { type: 'string' },
          'deploy-tag': { type: 'string' },
          'npm-container': { type: 'string' },
          'project-name': { type: 'string' },
          'env-file': { type: 'string' },
        },
      })
      const result = await runRollout(executor, app, {
        deployTag: values['deploy-tag'],
        npmContainerName: values['npm-container'] ?? DEFAULT_NPM_CONTAINER,
        projectName: values['project-name'],
        envFile: values['env-file'],
      })
      printRolloutResult(result)
      process.exit(result.ok ? 0 : 1)
      break
    }
    default: {
      console.error(`Неизвестная подкоманда: ${subcommand ?? '(пусто)'}\nДоступно: doctor, status, rollout`)
      process.exit(2)
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err))
  process.exit(1)
})
