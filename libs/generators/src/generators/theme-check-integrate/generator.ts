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
    ? `const themePrefix = '${sourceDirName}/theme/'`
    : `// Приложение не имеет ${sourceDirName}/theme/ на момент подключения гейта — ни один файл не\n`
      + `// освобождён от общих правил. Если позже заведёте отдельный каталог темы, впишите его сюда\n`
      + `// вручную (см. apps/domwellbes/scripts/check-theme-hardcodes.mjs как образец).\n`
      + `const themePrefix = '${sourceDirName}/theme/'`

  return `import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const sourceRoot = join(projectRoot, '${sourceDirName}')
const allowedExtensions = new Set(['.ts', '.tsx'])
// Сгенерировано \`nx g @letar/generators:theme-check-integrate\` — список подобран автодетектом
// каталогов на момент подключения. Если позже заведёте новый каталог того же назначения (ещё один
// PDF-рендер, ещё один generated), впишите имя сюда вручную — повторный запуск генератора не
// перезаписывает существующий скрипт (см. apps/domwellbes/scripts/check-theme-hardcodes.mjs как
// эталон обоснований).
const ignoredDirectories = new Set(${ignoredDirsLiteral})
${themePrefixComment}

// Значения, которые НЕ являются нарушением, но совпадают с regex ниже — заполняется вручную по
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

const forbiddenPatterns = [
  { label: 'сырой HEX-цвет', regex: /#[\\da-f]{3,8}\\b/giu },
  { label: 'сырой rgb()/rgba()-цвет', regex: /\\brgba?\\([^\\n)]+\\)/giu },
  { label: 'сырой hsl()/hsla()-цвет', regex: /\\bhsla?\\([^\\n)]+\\)/giu },
  {
    label: 'сырая тень',
    regex: /(?:boxShadow|shadow)\\s*(?:=|:)\\s*["'](?:0\\s|[^"'\\n]*(?:rgba?|hsla?)\\()/giu,
  },
  {
    label: 'сырая длительность transition',
    regex: /transition\\s*(?:=|:)\\s*["'][^"'{}\\n]*\\b\\d+(?:ms|s)\\b[^"'\\n]*["']/giu,
  },
  {
    label: 'сырая transitionDuration',
    regex: /transitionDuration\\s*(?:=|:)\\s*["']\\d+(?:ms|s)["']/giu,
  },
  {
    // Глубина нажатия — общая шкала темы, а не число «в тон соседям».
    // Проверяется и внутри ${sourceDirName}/theme: именно там расходятся recipes и layer styles.
    label: 'сырая глубина нажатия scale()',
    regex: /transform\\s*(?:=|:)\\s*["'\`][^"'\`\\n]*\\bscale\\(\\s*\\d*\\.?\\d+\\s*\\)/giu,
    includeTheme: true,
  },
]

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue
    }

    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)))
      continue
    }

    if (entry.isFile() && allowedExtensions.has(extname(entry.name))) {
      files.push(absolutePath)
    }
  }

  return files
}

function toProjectPath(absolutePath) {
  return relative(projectRoot, absolutePath).split(sep).join('/')
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\\n').length
}

const violations = []

for (const absolutePath of await collectFiles(sourceRoot)) {
  const projectPath = toProjectPath(absolutePath)
  const allowedForFile = allowedMatches.get(projectPath) ?? new Set()
  const content = await readFile(absolutePath, 'utf8')

  const isThemeFile = projectPath.startsWith(themePrefix)

  for (const { label, regex, includeTheme } of forbiddenPatterns) {
    if (isThemeFile && includeTheme !== true) {
      continue
    }

    for (const match of content.matchAll(regex)) {
      if (allowedForFile.has(match[0])) {
        continue
      }

      violations.push({
        file: projectPath,
        line: lineNumberAt(content, match.index ?? 0),
        label,
        value: match[0],
      })
    }
  }
}

if (violations.length > 0) {
  console.error('Найдены новые или ещё не мигрированные hardcoded UI-значения:')
  for (const violation of violations) {
    console.error(
      \`- \${violation.file}:\${violation.line} — \${violation.label}: \${violation.value}\`,
    )
  }
  console.error(
    'Перенесите повторяемое значение в semantic token/layerStyle, \`transition="all N s"\` — в явный '
      + 'transitionProperty + токен transitionDuration. Значение вне доступа к теме (metadata, '
      + 'satori, рендер без провайдеров) — в узкий allowlist только с пояснением.',
  )
  process.exitCode = 1
} else {
  console.log('Hardcoded UI-цвета, тени и длительности переходов не найдены.')
}
`
}

function runChecksCallback(app: string): GeneratorCallback {
  return () => {
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

  logger.info(
    `\n📋 Первый прогон обычно находит реальные нарушения — это ожидаемо (было так у domwellbes/studio/aboi). `
      + `Для каждой находки: настоящий баг (сырой цвет мимо Chakra-пропа, magic-number \`transition="all N s"\`) — `
      + `почини; легитимное исключение (metadata/satori/рендер без провайдеров/одноразовый декоративный эффект) — `
      + `допиши в allowedMatches apps/${app}/scripts/check-theme-hardcodes.mjs с пояснением.`,
  )

  if (options.skipChecks) {
    return
  }
  return runChecksCallback(app)
}
