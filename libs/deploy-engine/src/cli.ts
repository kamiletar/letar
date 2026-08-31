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
import { composePathForApp, type DoctorReport, runDoctor } from './doctor.js'
import { createNodeExecutor } from './executor.js'
import { migrateComposeToRollout } from './migrate-compose.js'
import { detectProxyKind, type RolloutResult, type RolloutStep, runRollout } from './rollout.js'
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

function printRolloutStep(step: RolloutStep): void {
  console.log(`${step.ok ? '✅' : '❌'} [${step.id}] ${step.description}${step.detail ? ` — ${step.detail}` : ''}`)
}

function printRolloutSummary(result: RolloutResult): void {
  console.log(`\n${result.ok ? '✅ OK' : '❌ FAILED'}`)
}

function requireApp(rest: string[], usage: string): string {
  const { values } = parseArgs({ args: rest, options: { app: { type: 'string' } }, strict: false })
  if (typeof values.app !== 'string' || !values.app) {
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
        'Использование: deploy-engine rollout --app <имя> [--deploy-tag <sha>] [--proxy-kind npm|traefik] [--npm-container <имя>] [--project-name <имя>] [--env-file <файл>]'
      const app = requireApp(rest, usage)
      const { values } = parseArgs({
        args: rest,
        options: {
          app: { type: 'string' },
          'deploy-tag': { type: 'string' },
          'proxy-kind': { type: 'string' },
          'npm-container': { type: 'string' },
          'project-name': { type: 'string' },
          'env-file': { type: 'string' },
        },
      })
      // `--proxy-kind` явно форсирует выбор (для приложений с label `letar.proxy-kind` в
      // compose). Без флага — автоопределение по реально запущенным контейнерам на хосте
      // (см. detectProxyKind), не жёсткий дефолт 'npm': NPM снят и с s2, и с s3 (§48 M3),
      // жёсткий дефолт ронял nginx-reload-1 на каждом rollout-приложении без выставленного label.
      let proxyKind: 'npm' | 'traefik'
      let npmContainerName: string | undefined
      if (values['proxy-kind'] === 'npm' || values['proxy-kind'] === 'traefik') {
        proxyKind = values['proxy-kind']
        npmContainerName = proxyKind === 'npm' ? (values['npm-container'] ?? DEFAULT_NPM_CONTAINER) : undefined
      } else {
        const detected = await detectProxyKind(executor)
        proxyKind = detected.proxyKind
        npmContainerName = proxyKind === 'npm' ? (values['npm-container'] ?? detected.npmContainerName) : undefined
      }
      console.log(
        `## rollout ${app} (proxy: ${proxyKind}${npmContainerName ? `, container: ${npmContainerName}` : ''})\n`,
      )
      const result = await runRollout(
        executor,
        app,
        {
          deployTag: values['deploy-tag'],
          proxyKind,
          npmContainerName,
          projectName: values['project-name'],
          envFile: values['env-file'],
        },
        undefined,
        printRolloutStep,
      )
      printRolloutSummary(result)
      process.exit(result.ok ? 0 : 1)
      break
    }
    case 'migrate-compose': {
      const usage = 'Использование: deploy-engine migrate-compose --app <имя> [--write]'
      const app = requireApp(rest, usage)
      const { values } = parseArgs({ args: rest, options: { app: { type: 'string' }, write: { type: 'boolean' } } })
      const composePath = composePathForApp(app)
      const current = await executor.readFile(composePath)
      if (current === null) {
        console.error(`Файл не найден: ${composePath}`)
        process.exit(1)
        return
      }
      const result = migrateComposeToRollout(current, app)
      if (!result.changed) {
        console.log(`✅ ${composePath} уже соответствует rollout-профилю, изменений нет.`)
      } else if (values.write) {
        await executor.writeFile(composePath, result.yaml)
        console.log(`✅ ${composePath} обновлён.`)
      } else {
        console.log(result.yaml)
        console.log(`\n(предпросмотр — добавь --write, чтобы записать в ${composePath})`)
      }
      for (const warning of result.warnings) {
        console.warn(`⚠️  ${warning}`)
      }
      process.exit(result.warnings.length > 0 ? 1 : 0)
      break
    }
    default: {
      console.error(
        `Неизвестная подкоманда: ${subcommand ?? '(пусто)'}\nДоступно: doctor, status, rollout, migrate-compose`,
      )
      process.exit(2)
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err))
  process.exit(1)
})
