import { type GeneratorCallback, joinPathFragments, logger, readJson, type Tree, updateJson } from '@nx/devkit'
import { execFileSync } from 'node:child_process'
import type { ThemeCheckIntegrateGeneratorSchema } from './schema'

// Каталоги-кандидаты, которые скрипт исключает из проверки, ЕСЛИ они реально существуют в
// приложении. Совпадение — по имени каталога на любой глубине (как в самом скрипте), поэтому
// здесь достаточно проверить факт существования, не точный путь. 'generated' исключается всегда
// (передаётся отдельно в generator ниже), эти два — только по факту находки:
//
// 'pdf' — @react-pdf/renderer StyleSheet, отдельный рендер-движок без доступа к Chakra semantic
// tokens (найдено в domwellbes и studio — src/lib/pdf).
// 'assets' — статические ассеты, не .ts/.tsx в любом случае, оставлено для обратной совместимости
// с исходным доменом (domwellbes держал его явно).

function findExistingDirNames(tree: Tree, root: string, candidates: string[], maxDepth = 6): Set<string> {
  const found = new Set<string>()

  function walk(dir: string, depth: number): void {
    if (depth > maxDepth || found.size === candidates.length) {
      return
    }
    if (!tree.exists(dir)) {
      return
    }

    for (const name of tree.children(dir)) {
      const childPath = joinPathFragments(dir, name)
      if (tree.isFile(childPath)) {
        continue
      }
      if (candidates.includes(name)) {
        found.add(name)
      }
      walk(childPath, depth + 1)
    }
  }

  walk(root, 0)
  return found
}

function buildScriptContent(sourceDirName: string, ignoredDirs: string[], hasThemeDir: boolean): string {
  const ignoredDirsLiteral = JSON.stringify(ignoredDirs)
  const themePrefixComment = hasThemeDir
    ? `themePrefix: '${sourceDirName}/theme/',`
    : `// Приложение не имеет ${sourceDirName}/theme/ на момент подключения гейта — ни один файл не\n`
      + `  // освобождён от общих правил. Если позже заведёте отдельный каталог темы, впишите его сюда\n`
      + `  // вручную (см. apps/domwellbes/scripts/check-theme-hardcodes.mjs как образец).\n`
      + `  themePrefix: '${sourceDirName}/theme/',`

  return `import { resolve } from 'node:path'
import { runThemeCheckCli } from '@letar/theme-check'

// Сгенерировано \`nx g @letar/generators:theme-check-integrate\`. Общая логика правил (HEX/rgb/hsl,
// сырая тень, transition/transitionDuration, scale() вне шкалы темы) — в @letar/theme-check, см.
// её README за полным списком опций и .claude/docs/theme-hardcode-gate-coverage.md за историей.

const projectRoot = resolve(import.meta.dirname, '..')

// Список подобран автодетектом каталогов на момент подключения. Если позже заведёте новый каталог
// того же назначения (ещё один PDF-рендер, ещё один generated), впишите имя сюда вручную —
// повторный запуск генератора не перезаписывает существующий скрипт.
const ignoredDirectories = new Set(${ignoredDirsLiteral})

// Значения, которые НЕ являются нарушением, но совпадают с regex гейта — заполняется вручную по
// мере первых прогонов. Три задокументированных класса легитимных исключений (образцы — уже
// подключённые apps/domwellbes, apps/studio, apps/aboi):
//   1. Metadata Next.js (themeColor/background_color) — literal вне доступа к CSS-переменным темы.
//   2. Рендер через next/og ImageResponse (satori) или без Chakra-провайдеров (см.
//      .claude/docs/nextjs-root-notfound-no-root-layout.md) — тоже без доступа к теме.
//   3. Одноразовый декоративный эффект (magic-number градиент/тень), не образующий шкалу и не
//      переиспользуемый — токенизировать нечего.
// Каждая находка вне этих трёх классов — вероятно настоящий баг (см. итоги подключения к aboi:
// один такой случай оказался небрежной копипастой мимо Chakra-пропа и был исправлен, а не
// занесён сюда).
const allowedMatches = new Map([
  // ['${sourceDirName}/app/layout.tsx', new Set(['#XXXXXX'])],
])

await runThemeCheckCli({
  projectRoot,
  sourceDirName: '${sourceDirName}',
  ignoredDirectories,
  ${themePrefixComment}
  allowedMatches,
})
`
}

function ensureThemeCheckLibDependency(tree: Tree, appDir: string): boolean {
  const packageJsonPath = joinPathFragments(appDir, 'package.json')
  if (!tree.exists(packageJsonPath)) {
    return false
  }

  const packageJson = readJson(tree, packageJsonPath)
  const alreadyWired = packageJson.dependencies?.['@letar/theme-check'] !== undefined
  if (alreadyWired) {
    return false
  }

  updateJson(tree, packageJsonPath, (json) => {
    json.nx = json.nx ?? {}
    json.nx.implicitDependencies = json.nx.implicitDependencies ?? []
    if (!json.nx.implicitDependencies.includes('@letar/theme-check')) {
      json.nx.implicitDependencies.push('@letar/theme-check')
    }

    json.dependencies = json.dependencies ?? {}
    json.dependencies['@letar/theme-check'] = 'workspace:*'

    return json
  })
  return true
}

function runChecksCallback(app: string, needsInstall: boolean): GeneratorCallback {
  return () => {
    if (needsInstall) {
      // node не понимает paths/customConditions — резолвит bare-специфер @letar/theme-check только
      // через симлинк в node_modules, который создаёт bun install (см. libs/theme-check/README.md).
      logger.info('Прогоняю bun install, чтобы появился node_modules/@letar/theme-check...')
      execFileSync('bun', ['install'], { stdio: 'inherit', shell: true })
    }

    logger.info(
      `Прогоняю nx theme:check для ${app} (первый прогон обычно находит настоящие нарушения — это ожидаемо)...`,
    )
    try {
      execFileSync('nx', ['run', `${app}:theme:check`], { stdio: 'inherit', shell: true })
      logger.info('✅ theme:check прошёл чисто с первого раза.')
    } catch {
      logger.warn(
        `⚠️ theme:check нашёл нарушения (см. вывод выше) — это нормально для первого запуска. Каждое: либо `
          + `перепиши на токен/явный transitionProperty (см. фикс grandslamcup/aboi для transition="all"), либо `
          + `добавь в allowedMatches файла apps/${app}/scripts/check-theme-hardcodes.mjs с пояснением ПОЧЕМУ `
          + `(три легитимных класса — в комментарии внутри самого скрипта). Прогони nx run ${app}:theme:check `
          + `снова после правок.`,
      )
    }
  }
}

export default async function themeCheckIntegrateGenerator(
  tree: Tree,
  options: ThemeCheckIntegrateGeneratorSchema,
): Promise<GeneratorCallback | void> {
  const { app } = options
  const appDir = joinPathFragments('apps', app)

  if (!tree.exists(appDir)) {
    throw new Error(`apps/${app} не найдено`)
  }

  const projectJsonPath = joinPathFragments(appDir, 'project.json')
  if (!tree.exists(projectJsonPath)) {
    throw new Error(`apps/${app}/project.json не найден`)
  }

  const sourceDirName = options.sourceDir ?? 'src'
  const sourceDir = joinPathFragments(appDir, sourceDirName)
  if (!tree.exists(sourceDir)) {
    throw new Error(
      `apps/${app}/${sourceDirName} не найден. Если исходники приложения лежат в другом каталоге, `
        + `передай --sourceDir=<каталог>.`,
    )
  }

  const ignoredDirs = ['generated', ...findExistingDirNames(tree, sourceDir, ['pdf', 'assets'])].sort()
  const hasThemeDir = tree.exists(joinPathFragments(sourceDir, 'theme'))

  if (!hasThemeDir) {
    logger.warn(
      `⚠️ apps/${app}/${sourceDirName}/theme не найден — гейт будет проверять ВСЕ .ts/.tsx без исключения `
        + `«это файл темы» (как в apps/aboi/apps/studio — то же самое было и там, оба не имели своего `
        + `theme:typegen до подключения). Если тема живёт в другом месте, поправь themePrefix в сгенерированном `
        + `скрипте вручную.`,
    )
  }

  const scriptPath = joinPathFragments(appDir, 'scripts', 'check-theme-hardcodes.mjs')
  if (tree.exists(scriptPath)) {
    logger.info(
      `⏭️  ${scriptPath} уже существует — не перезаписан (может нести ручной allowlist). Пропущено.`,
    )
  } else {
    tree.write(scriptPath, buildScriptContent(sourceDirName, ignoredDirs, hasThemeDir))
    logger.info(`✅ ${scriptPath} создан. Обнаруженные ignoredDirectories: ${ignoredDirs.join(', ')}.`)
  }

  const projectJson = readJson(tree, projectJsonPath)
  const hasThemeTypegen = Boolean(projectJson.targets?.['theme:typegen'])

  if (projectJson.targets?.['theme:check']) {
    logger.info(`⏭️  apps/${app}/project.json уже содержит таргет theme:check — не тронут.`)
  } else {
    updateJson(tree, projectJsonPath, (json) => {
      json.targets = json.targets ?? {}
      json.targets['theme:check'] = {
        executor: 'nx:run-commands',
        options: {
          command: 'node scripts/check-theme-hardcodes.mjs',
          cwd: appDir,
        },
        cache: false,
        ...(hasThemeTypegen ? { dependsOn: ['theme:typegen'] } : {}),
        metadata: {
          description: 'Reject raw UI colors, shadows and transition durations outside theme tokens',
          technologies: ['chakra-ui'],
        },
      }

      const lintTarget = json.targets.lint
      if (lintTarget) {
        const dependsOn: string[] = lintTarget.dependsOn ?? []
        if (!dependsOn.includes('theme:check')) {
          lintTarget.dependsOn = [...dependsOn, 'theme:check']
        }
      } else {
        logger.warn(
          `⚠️ apps/${app}/project.json не содержит таргет lint — theme:check заведён, но никуда не подключён `
            + `через dependsOn. Подключи вручную к нужному таргету.`,
        )
      }

      return json
    })
    logger.info(
      `✅ apps/${app}/project.json: добавлен таргет theme:check${
        hasThemeTypegen ? ' (dependsOn theme:typegen)' : ''
      }, подключён в dependsOn у lint.`,
    )
  }

  const needsInstall = ensureThemeCheckLibDependency(tree, appDir)
  if (needsInstall) {
    logger.info(`✅ apps/${app}/package.json: добавлена зависимость @letar/theme-check.`)
  }

  logger.info(
    `\n📋 Первый прогон обычно находит реальные нарушения — это ожидаемо (было так у domwellbes/studio/aboi). `
      + `Для каждой находки: настоящий баг (сырой цвет мимо Chakra-пропа, magic-number \`transition="all N s"\`) — `
      + `почини; легитимное исключение (metadata/satori/рендер без провайдеров/одноразовый декоративный эффект) — `
      + `допиши в allowedMatches apps/${app}/scripts/check-theme-hardcodes.mjs с пояснением.`,
  )

  if (options.skipChecks) {
    return
  }
  return runChecksCallback(app, needsInstall)
}
