import { formatFiles, generateFiles, joinPathFragments, logger, type Tree } from '@nx/devkit'
import { fileURLToPath } from 'node:url'
import type { NewLibGeneratorSchema } from './schema'

// Генератор исполняется как ESM (нет __dirname) — восстанавливаем аналог через import.meta.url
const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default async function newLibGenerator(tree: Tree, options: NewLibGeneratorSchema): Promise<void> {
  const { name } = options
  const libDir = joinPathFragments('libs', name)

  if (tree.exists(libDir)) {
    throw new Error(`libs/${name} уже существует — генератор не перезаписывает существующие библиотеки`)
  }

  const description = options.description ?? `${name} — shared-библиотека монорепо letar`

  generateFiles(tree, joinPathFragments(currentDir, 'files'), libDir, {
    name,
    description,
  })

  await formatFiles(tree)

  logger.info(`✅ libs/${name} создан (@letar/${name}).`)
  logger.info(`Дальше: nx sync — синхронизировать TypeScript references корня.`)
  logger.info(
    `Подключение к приложению (3 обязательных места, см. .claude/rules/libs.md): 'paths' и 'references' `
      + `в tsconfig.json приложения, 'implicitDependencies' в package.json приложения.`,
  )
  logger.info(`nx typecheck:tsgo ${name} && nx lint ${name} && nx test ${name} — проверить сгенерированный каркас.`)
}
