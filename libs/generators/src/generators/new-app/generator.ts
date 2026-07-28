import { formatFiles, generateFiles, joinPathFragments, logger, type Tree } from '@nx/devkit'
import { fileURLToPath } from 'node:url'
import type { NewAppGeneratorSchema } from './schema'

// Генератор исполняется как ESM (нет __dirname) — восстанавливаем аналог через import.meta.url
const currentDir = fileURLToPath(new URL('.', import.meta.url))

function toDisplayName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function toCamelCase(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase())
}

/** Следующий свободный 3xxx порт — сканирует apps/<app>/.env на PORT=<число> */
function resolveNextPort(tree: Tree): number {
  const usedPorts = new Set<number>()

  if (tree.exists('apps')) {
    for (const app of tree.children('apps')) {
      const envPath = joinPathFragments('apps', app, '.env')
      if (!tree.exists(envPath)) {
        continue
      }
      const content = tree.read(envPath, 'utf-8') ?? ''
      const match = content.match(/^PORT=(\d+)/m)
      if (match) {
        usedPorts.add(Number(match[1]))
      }
    }
  }

  let port = 3000
  while (usedPorts.has(port)) {
    port++
  }
  return port
}

export default async function newAppGenerator(tree: Tree, options: NewAppGeneratorSchema): Promise<void> {
  const { name } = options
  const appDir = joinPathFragments('apps', name)

  if (tree.exists(appDir)) {
    throw new Error(`apps/${name} уже существует — генератор не перезаписывает существующие приложения`)
  }

  const port = options.port ?? resolveNextPort(tree)
  const displayName = options.displayName ?? toDisplayName(name)
  const description = options.description ?? `${displayName} — Next.js приложение`

  generateFiles(tree, joinPathFragments(currentDir, 'files'), appDir, {
    name,
    camelCaseName: toCamelCase(name),
    port,
    displayName,
    description,
    year: new Date().getFullYear(),
  })

  await formatFiles(tree)

  logger.info(`✅ apps/${name} создан (порт ${port}).`)
  logger.info(`Дальше: nx dev ${name} — проверить, что страница открывается на http://localhost:${port}.`)
  logger.info(`nx typecheck:tsgo ${name} && nx lint ${name} && nx test ${name} — проверить сгенерированный каркас.`)
  logger.info(
    `Umami website ID пустой в NEXT_PUBLIC_UMAMI_WEBSITE_ID (.env.docker создаётся на этапе деплоя) — ` +
      `заполнится после регистрации сайта в Umami.`
  )
  logger.info(
    'Каркас минимален (нет БД/форм/auth) — это осознанно: schema.zmodel, БД, ZenStack-формы, Better Auth ' +
      'подключаются отдельно по .claude/rules/database.md и .claude/docs/forms.md, когда появится реальная нужда.'
  )
  logger.info(
    'Дальнейшие шаги (регистрация в Dashboard, бэкапы, docker-compose.production, e2e-gate, submodule) — ' +
      'см. раздел «Дальнейшие шаги» в .claude/commands/create/new-app.md, они намеренно не автоматизированы.'
  )
  if (options.private) {
    logger.info(
      'Приложение помечено как приватное — заведи submodule по инструкции в ' +
        '.claude/commands/create/new-app.md § «Приватные приложения» (gh repo create → git submodule add). ' +
        'Сгенерированные файлы уже лежат в apps/<name> — просто перенеси их в новый submodule-репозиторий.'
    )
  }
  logger.info(
    'Если приложение будет собирать персональные данные — изучи чеклист .claude/docs/personal-data.md ' +
      'до публичного запуска (cookie-баннер, /privacy, чекбоксы согласия, уведомление в РКН).'
  )
}
