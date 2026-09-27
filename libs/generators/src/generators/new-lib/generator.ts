import { formatFiles, generateFiles, joinPathFragments, logger, type Tree } from '@nx/devkit'
import { assertTargetIsFree, templatesDirFor } from '../../utils/tree'
import type { NewLibGeneratorSchema } from './schema'

const templatesDir = templatesDirFor(import.meta.url)

export default async function newLibGenerator(tree: Tree, options: NewLibGeneratorSchema): Promise<void> {
  const { name } = options
  const libDir = joinPathFragments('libs', name)

  assertTargetIsFree(tree, libDir, 'библиотеки')

  const description = options.description ?? `${name} — shared-библиотека монорепо letar`
  const react = options.react ?? false

  generateFiles(tree, templatesDir, libDir, {
    name,
    description,
    react,
  })

  if (react) {
    tree.delete(joinPathFragments(libDir, 'src/lib/feature.ts'))
    tree.delete(joinPathFragments(libDir, 'src/lib/feature.spec.ts'))

    const reactTemplatesDir = templatesDirFor(import.meta.url, 'files-react')
    generateFiles(tree, reactTemplatesDir, libDir, {
      name,
      description,
      react,
    })
  }

  await formatFiles(tree)

  logger.info(`✅ libs/${name} создан (@letar/${name}).`)
  logger.info(
    `Подключение к приложению (обязательно, см. .claude/rules/libs.md#подключение-к-приложению): `
      + `'@letar/${name}': 'workspace:*' в реальные dependencies приложения + bun install.`,
  )
  logger.info(
    `'paths' в tsconfig.json и 'implicitDependencies' — вспомогательные, не обязательные (nx sync здесь не поможет — отключён в nx.json).`,
  )
  logger.info(`nx typecheck:tsgo ${name} && nx lint ${name} && nx test ${name} — проверить сгенерированный каркас.`)
}
