import { formatFiles, generateFiles, joinPathFragments, logger, readJson, type Tree } from '@nx/devkit'
import { toDisplayName } from '../../utils/naming'
import { assertTargetIsFree, templatesDirFor } from '../../utils/tree'
import type { ElectronAppGeneratorSchema } from './schema'

const templatesDir = templatesDirFor(import.meta.url)

/** Убирает диапазонный префикс (^, ~) — electron-builder требует точную версию, иначе не может скачать бинарник */
function pinVersion(range: string): string {
  return range.replace(/^[\^~]/, '')
}

export default async function electronAppGenerator(tree: Tree, options: ElectronAppGeneratorSchema): Promise<void> {
  const { name } = options
  const appDir = joinPathFragments('apps', name)

  assertTargetIsFree(tree, appDir, 'приложения')

  const rootPkg = readJson(tree, 'package.json')
  const electronRange = rootPkg.dependencies?.electron ?? rootPkg.devDependencies?.electron
  const electronBuilderRange =
    rootPkg.dependencies?.['electron-builder'] ?? rootPkg.devDependencies?.['electron-builder']

  if (!electronRange || !electronBuilderRange) {
    throw new Error(
      'Не найдены electron/electron-builder в dependencies или devDependencies корневого package.json — ' +
        'без них electron-builder не сможет определить точную версию для сборки.'
    )
  }

  const electronVersion = pinVersion(electronRange)
  const electronBuilderVersion = pinVersion(electronBuilderRange)

  const displayName = options.displayName ?? toDisplayName(name)
  const description = options.description ?? `${displayName} — Electron-приложение`

  generateFiles(tree, templatesDir, appDir, {
    name,
    displayName,
    description,
    electronVersion,
    electronBuilderVersion,
    year: new Date().getFullYear(),
  })

  await formatFiles(tree)

  logger.info(`✅ apps/${name} создан (Electron ${electronVersion}).`)
  logger.info(`Дальше: nx dev ${name} — проверить, что окно открывается и реагирует на клики.`)
  logger.info(`Иконка: замени resources/icon.svg, затем "node scripts/generate-icons.mjs" из apps/${name}.`)
  if (options.private) {
    logger.info(
      'Приложение помечено как приватное — заведи submodule по инструкции в ' +
        '.claude/commands/create/new-app.md § «Приватные приложения» (gh repo create → git submodule add).'
    )
  }
}
