import { formatFiles, generateFiles, joinPathFragments, logger, type Tree } from '@nx/devkit'
import { assertTargetIsFree, templatesDirFor } from '../../utils/tree'
import type { NewLibGeneratorSchema } from './schema'

const templatesDir = templatesDirFor(import.meta.url)

export default async function newLibGenerator(tree: Tree, options: NewLibGeneratorSchema): Promise<void> {
  const { name } = options
  const libDir = joinPathFragments('libs', name)

  assertTargetIsFree(tree, libDir, 'библиотеки')

  const description = options.description ?? `${name} — shared-библиотека монорепо letar`

  generateFiles(tree, templatesDir, libDir, {
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
