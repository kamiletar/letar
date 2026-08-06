import { formatFiles, generateFiles, joinPathFragments, logger, type Tree } from '@nx/devkit'
import { toCamelCase, toDisplayName } from '../../utils/naming'
import { resolveNextFreePort } from '../../utils/ports'
import { assertTargetIsFree, templatesDirFor } from '../../utils/tree'
import type { NewAppGeneratorSchema } from './schema'

const templatesDir = templatesDirFor(import.meta.url)

/**
 * Шаблоны только для приватных приложений (`--private`).
 *
 * Сейчас это `.gitignore`: приватное приложение живёт в отдельном submodule-репозитории, на
 * который корневой `.gitignore` монорепо не действует. Публичным приложениям он не нужен —
 * их закрывают правила корневого репо.
 */
const privateTemplatesDir = templatesDirFor(import.meta.url, 'files-private')

/** Шаблоны ZenStack/Prisma-каркаса (`--withDb`) — prisma.config.ts + schema.zmodel-заготовка. */
const dbTemplatesDir = templatesDirFor(import.meta.url, 'files-db')

export default async function newAppGenerator(tree: Tree, options: NewAppGeneratorSchema): Promise<void> {
  const { name } = options
  const appDir = joinPathFragments('apps', name)

  assertTargetIsFree(tree, appDir, 'приложения')

  const port = options.port ?? resolveNextFreePort(tree)
  const displayName = options.displayName ?? toDisplayName(name)
  const description = options.description ?? `${displayName} — Next.js приложение`
  const withDb = options.withDb ?? false

  if (options.private) {
    generateFiles(tree, privateTemplatesDir, appDir, { name, withDb })
  }

  generateFiles(tree, templatesDir, appDir, {
    name,
    camelCaseName: toCamelCase(name),
    port,
    displayName,
    description,
    year: new Date().getFullYear(),
    withDb,
  })

  if (withDb) {
    generateFiles(tree, dbTemplatesDir, appDir, { name, displayName })
  }

  await formatFiles(tree)

  logger.info(`✅ apps/${name} создан (порт ${port}).`)
  logger.info(`Дальше: nx dev ${name} — проверить, что страница открывается на http://localhost:${port}.`)
  logger.info(`nx typecheck:tsgo ${name} && nx lint ${name} && nx test ${name} — проверить сгенерированный каркас.`)
  logger.info(
    `Umami website ID пустой в NEXT_PUBLIC_UMAMI_WEBSITE_ID (.env.docker создаётся на этапе деплоя) — ` +
      `заполнится после регистрации сайта в Umami.`
  )
  if (withDb) {
    logger.info(
      'ZenStack/Prisma-каркас подключён (prisma.config.ts, schema.zmodel-заготовка без моделей, ' +
        'zenstack:generate/db:* таргеты). Дальше: опиши модели в schema.zmodel → создай ' +
        `apps/${name}/.env.local с DATABASE_URL → nx zenstack:generate ${name} → nx db:migrate ${name} -- --name init. ` +
        'Формы/auth каркас не создаёт — см. .claude/docs/forms.md и .claude/docs/auth.md.'
    )
  } else {
    logger.info(
      'Каркас минимален (нет БД/форм/auth) — это осознанно: schema.zmodel, БД, ZenStack-формы, Better Auth ' +
        'подключаются отдельно по .claude/rules/database.md и .claude/docs/forms.md, когда появится реальная нужда.'
    )
  }
  logger.info(
    'Дальнейшие шаги (регистрация в Dashboard, бэкапы, docker-compose.production, e2e-gate, submodule) — ' +
      'см. раздел «Дальнейшие шаги» в .claude/commands/create/new-app.md, они намеренно не автоматизированы.'
  )
  if (options.private) {
    logger.info(
      'Приложение помечено как приватное — заведи submodule по инструкции в ' +
        '.claude/commands/create/new-app.md § «Приватные приложения» (gh repo create → git submodule add). ' +
        'Сгенерированные файлы уже лежат в apps/<name> — просто перенеси их в новый submodule-репозиторий. ' +
        '.gitignore для будущего submodule уже создан: не потеряй его при переносе, иначе первый же ' +
        '`git add .` унесёт node_modules/ и dist/ в initial commit.'
    )
  }
  logger.info(
    'Если приложение будет собирать персональные данные — изучи чеклист .claude/docs/personal-data.md ' +
      'до публичного запуска (cookie-баннер, /privacy, чекбоксы согласия, уведомление в РКН).'
  )
}
