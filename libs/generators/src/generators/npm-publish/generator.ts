import { formatFiles, generateFiles, joinPathFragments, logger, readJson, type Tree, writeJson } from '@nx/devkit'
import { templatesDirFor } from '../../utils/tree'
import type { NpmPublishGeneratorSchema } from './schema'

const templatesDir = templatesDirFor(import.meta.url)

/** Диапазон опубликованного peer `@letar/forms-core` (см. .claude/docs/npm-publish-from-monorepo.md, «Волна 1») */
const FORMS_CORE_RANGE = '>=0.28.0 <1'

interface PackageJson {
  description?: string
  type?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, unknown>
  [key: string]: unknown
}

const isInternal = (dep: string) => dep.startsWith('@letar/')

function pickExternal(deps: Record<string, string> | undefined): Record<string, string> | undefined {
  const entries = Object.entries(deps ?? {}).filter(([dep]) => !isInternal(dep))
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export default async function npmPublishGenerator(tree: Tree, options: NpmPublishGeneratorSchema): Promise<void> {
  const { name } = options
  const libDir = joinPathFragments('libs', name)
  const pkgPath = joinPathFragments(libDir, 'package.json')
  const projectPath = joinPathFragments(libDir, 'project.json')

  if (!tree.exists(pkgPath) || !tree.exists(projectPath)) {
    throw new Error(`${libDir} не найдена — сначала создай библиотеку: nx g @letar/generators:new-lib ${name}`)
  }
  if (tree.exists(joinPathFragments(libDir, 'tsup.config.ts'))) {
    throw new Error(`${libDir}/tsup.config.ts уже есть — генератор не перезаписывает существующую публикацию`)
  }

  const pkg = readJson<PackageJson>(tree, pkgPath)
  const description = options.description ?? pkg.description ?? `${name} — библиотека монорепо letar`
  const keywords = (options.keywords ?? '').split(',').map((k) => k.trim()).filter(Boolean)

  // Внутренние @letar/* не вбандливаются (external в tsup), поэтому в рабочем package.json
  // они обязаны жить в devDependencies; forms-core дополнительно уходит в peer публикуемого пакета
  const internalFromDeps = Object.entries(pkg.dependencies ?? {}).filter(([dep]) => isInternal(dep))
  const movedToDev = internalFromDeps.map(([dep]) => dep)
  const externalDependencies = pickExternal(pkg.dependencies)

  pkg.type = 'module'
  if (internalFromDeps.length > 0) {
    pkg.devDependencies = { ...pkg.devDependencies, ...Object.fromEntries(internalFromDeps) }
    if (externalDependencies) {
      pkg.dependencies = externalDependencies
    } else {
      delete pkg.dependencies
    }
  }
  if (options.formsCorePeer) {
    pkg.devDependencies = { ...pkg.devDependencies, '@letar/forms-core': 'workspace:*' }
  }
  writeJson(tree, pkgPath, pkg)

  // Шаблон метаданных для npm: БЕЗ version (её подставляет общий scripts/write-publish-package-json.mjs)
  const peerDependencies = {
    ...(options.formsCorePeer ? { '@letar/forms-core': FORMS_CORE_RANGE } : {}),
    ...pickExternal(pkg.peerDependencies),
  }
  writeJson(tree, joinPathFragments(libDir, 'package.publish.json'), {
    name: `@letar/${name}`,
    description,
    license: 'MIT',
    type: 'module',
    sideEffects: false,
    exports: {
      '.': { types: './index.d.ts', import: './index.js' },
      './package.json': './package.json',
    },
    main: './index.js',
    types: './index.d.ts',
    files: ['**/*.js', '**/*.js.map', '**/*.d.ts', '**/*.d.ts.map', 'README.md', 'CHANGELOG.md', 'LICENSE'],
    keywords: keywords.length > 0 ? keywords : undefined,
    repository: { type: 'git', url: 'git+https://github.com/kamiletar/letar.git', directory: libDir },
    bugs: { url: 'https://github.com/kamiletar/letar/issues' },
    publishConfig: { access: 'public', tag: 'beta' },
    dependencies: externalDependencies,
    peerDependencies: Object.keys(peerDependencies).length > 0 ? peerDependencies : undefined,
    peerDependenciesMeta: pkg.peerDependenciesMeta,
  })

  generateFiles(tree, templatesDir, libDir, {})

  if (!tree.exists(joinPathFragments(libDir, 'CHANGELOG.md'))) {
    tree.write(joinPathFragments(libDir, 'CHANGELOG.md'), '# Changelog\n')
  }
  if (!tree.exists(joinPathFragments(libDir, 'README.md'))) {
    tree.write(joinPathFragments(libDir, 'README.md'), `# @letar/${name}\n\n${description}\n`)
  }

  const project = readJson<{ targets?: Record<string, unknown> }>(tree, projectPath)
  project.targets = {
    ...project.targets,
    'build:npm': {
      executor: 'nx:run-commands',
      cache: true,
      inputs: [
        'default',
        '{projectRoot}/tsup.config.ts',
        '{projectRoot}/package.publish.json',
        '{workspaceRoot}/scripts/write-publish-package-json.mjs',
      ],
      outputs: ['{projectRoot}/dist'],
      metadata: { description: `Сборка @letar/${name} для публикации на npm`, technologies: ['tsup'] },
      options: {
        commands: [
          'tsup',
          'node ../../scripts/write-publish-package-json.mjs',
          'cp README.md dist/',
          'cp CHANGELOG.md dist/',
          'cp LICENSE dist/',
        ],
        cwd: libDir,
        parallel: false,
      },
    },
    'publish:npm': {
      executor: 'nx:run-commands',
      dependsOn: ['build:npm'],
      cache: false,
      metadata: { description: `Публикация @letar/${name} на npmjs.com`, technologies: ['npm'] },
      options: { command: 'npm publish --access public --tag beta', cwd: `${libDir}/dist` },
    },
  }
  writeJson(tree, projectPath, project)

  await formatFiles(tree)

  logger.info(`✅ libs/${name}: конвейер build:npm/publish:npm заведён (публикация не выполнялась).`)
  if (movedToDev.length > 0) {
    logger.warn(
      `@letar/* перенесены из dependencies в devDependencies (${movedToDev.join(', ')}) — `
        + `сразу bun install --lockfile-only и коммит bun.lock, иначе --frozen-lockfile роняет деплой.`,
    )
  }
  logger.info(
    'Дальше: проверь entry в tsup.config.ts и exports в package.publish.json (подпути), сверь импорты src/ с peerDependencies.',
  )
  logger.info(`nx build:npm @letar/${name} → npm pack --dry-run в libs/${name}/dist.`)
}
