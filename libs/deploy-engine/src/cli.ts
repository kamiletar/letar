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
import { getStatus } from './status.js'

function printDoctorReport(report: DoctorReport): void {
  console.log(`## doctor ${report.app} (${report.composePath})\n`)
  for (const check of report.checks) {
    const icon = check.passed ? '✅' : check.severity === 'required' ? '❌' : '⚠️'
    console.log(`${icon} [${check.id}] ${check.description}${check.detail ? ` — ${check.detail}` : ''}`)
  }
  console.log(`\n${report.ready ? '✅ READY' : '❌ NOT READY'} — rollout ${report.ready ? 'разрешён' : 'заблокирован'}`)
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
    default: {
      console.error(`Неизвестная подкоманда: ${subcommand ?? '(пусто)'}\nДоступно: doctor, status`)
      process.exit(2)
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err))
  process.exit(1)
})
