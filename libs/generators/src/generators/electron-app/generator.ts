import { formatFiles, generateFiles, joinPathFragments, logger, readJson, type Tree } from '@nx/devkit'
import { fileURLToPath } from 'node:url'
import type { ElectronAppGeneratorSchema } from './schema'

// Генератор исполняется как ESM (нет __dirname) — восстанавливаем аналог через import.meta.url
const currentDir = fileURLToPath(new URL('.', import.meta.url))

function toDisplayName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Убирает диапазонный префикс (^, ~) — electron-builder требует точную версию, иначе не может скачать бинарник */
function pinVersion(range: string): string {
  return range.replace(/^[\^~]/, '')
}

export default async function electronAppGenerator(tree: Tree, options: ElectronAppGeneratorSchema): Promise<void> {
  const { name } = options
  const appDir = joinPathFragments('apps', name)

  if (tree.exists(appDir)) {
    throw new Error(`apps/${name} уже существует — генератор не перезаписывает существующие приложения`)
  }

  const rootPkg = readJson(tree, 'package.json')
  const electronRange = rootPkg.dependencies?.electron ?? rootPkg.devDependencies?.electron
  const electronBuilderRange = rootPkg.dependencies?.['electron-builder']
    ?? rootPkg.devDependencies?.['electron-builder']

  if (!electronRange || !electronBuilderRange) {
    throw new Error(
      'Не найдены electron/electron-builder в dependencies или devDependencies корневого package.json — '
        + 'без них electron-builder не сможет определить точную версию для сборки.',
    )
  }

  const electronVersion = pinVersion(electronRange)
  const electronBuilderVersion = pinVersion(electronBuilderRange)

  const displayName = options.displayName ?? toDisplayName(name)
  const description = options.description ?? `${displayName} — Electron-приложение`

  generateFiles(tree, joinPathFragments(currentDir, 'files'), appDir, {
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
      'Приложение помечено как приватное — заведи submodule по инструкции в '
        + '.claude/commands/create/new-app.md § «Приватные приложения» (gh repo create → git submodule add).',
    )
  }
}
