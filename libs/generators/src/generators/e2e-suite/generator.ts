import { formatFiles, generateFiles, joinPathFragments, logger, type Tree } from '@nx/devkit'
import { fileURLToPath } from 'node:url'
import type { E2eSuiteGeneratorSchema } from './schema'

// Генератор исполняется как ESM (нет __dirname) — восстанавливаем аналог через import.meta.url
const currentDir = fileURLToPath(new URL('.', import.meta.url))

/** Достаёт `PORT=<число>` из apps/<app>/.env (единственное, что там должно лежать — см. .claude/rules/env-files.md) */
function resolvePort(tree: Tree, app: string): number | undefined {
  const envPath = joinPathFragments('apps', app, '.env')
  if (!tree.exists(envPath)) {
    return undefined
  }
  const content = tree.read(envPath, 'utf-8') ?? ''
  const match = content.match(/^PORT=(\d+)/m)
  return match ? Number(match[1]) : undefined
}

export default async function e2eSuiteGenerator(tree: Tree, options: E2eSuiteGeneratorSchema): Promise<void> {
  const { app } = options
  const appDir = joinPathFragments('apps', app)
  const e2eDir = joinPathFragments('apps', `${app}-e2e`)

  if (!tree.exists(appDir)) {
    throw new Error(`Приложение apps/${app} не найдено — сначала создай приложение, потом e2e-сьют для него`)
  }
  if (tree.exists(e2eDir)) {
    throw new Error(`apps/${app}-e2e уже существует — генератор не перезаписывает существующие сьюты`)
  }

  const port = options.port ?? resolvePort(tree, app)
  if (!port) {
    throw new Error(
      `Не удалось определить dev-порт для apps/${app} (нет apps/${app}/.env с PORT=<число>). `
        + `Передай явно: nx g @letar/generators:e2e-suite ${app} --port=<число>`,
    )
  }

  generateFiles(tree, joinPathFragments(currentDir, 'files'), e2eDir, {
    app,
    port,
  })

  await formatFiles(tree)

  logger.info(`✅ apps/${app}-e2e создан (порт ${port}).`)
  logger.info(`Дальше: nx typecheck ${app}-e2e && nx lint ${app}-e2e`)
  logger.info(
    `project.json с явным executor '@nx/playwright:playwright' — защита от того, что staging-`
      + `прогон (deploy_app → run_e2e) молча тестирует локальный dev вместо задеплоенного контейнера `
      + `(см. .claude/docs/e2e-testing.md § «nx e2e зависает намертво»).`,
  )
  logger.info(
    `Локальный прогон: подними dev-сервер вручную (nx run ${app}:dev) и вызови "bunx playwright test" `
      + `из apps/${app}-e2e напрямую, не через "nx e2e ${app}-e2e" — та команда может зависнуть на `
      + `неопределённое время, если dev-сервер ещё не поднят (см. тот же раздел docs).`,
  )
}
