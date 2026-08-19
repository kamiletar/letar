import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

// Единственная общая шкала правил гейта сырых UI-значений. Раньше была дословно скопирована в
// apps/aboi, apps/studio, apps/domwellbes — до расхождения оставался один неосторожный `git diff`.
// Подробности каждого правила и трёх задокументированных классов allowlist-исключений —
// .claude/docs/theme-hardcode-gate-coverage.md.
export const FORBIDDEN_PATTERNS = [
  { label: 'сырой HEX-цвет', regex: /#[\da-f]{3,8}\b/giu },
  { label: 'сырой rgb()/rgba()-цвет', regex: /\brgba?\([^\n)]+\)/giu },
  { label: 'сырой hsl()/hsla()-цвет', regex: /\bhsla?\([^\n)]+\)/giu },
  {
    label: 'сырая тень',
    regex: /(?:boxShadow|shadow)\s*(?:=|:)\s*["'](?:0\s|[^"'\n]*(?:rgba?|hsla?)\()/giu,
  },
  {
    label: 'сырая длительность transition',
    regex: /transition\s*(?:=|:)\s*["'][^"'{}\n]*\b\d+(?:ms|s)\b[^"'\n]*["']/giu,
  },
  {
    label: 'сырая transitionDuration',
    regex: /transitionDuration\s*(?:=|:)\s*["']\d+(?:ms|s)["']/giu,
  },
  {
    // Глубина нажатия — общая шкала темы, а не число «в тон соседям».
    // Проверяется и внутри src/theme: именно там расходятся recipes и layer styles.
    label: 'сырая глубина нажатия scale()',
    regex: /transform\s*(?:=|:)\s*["'`][^"'`\n]*\bscale\(\s*\d*\.?\d+\s*\)/giu,
    includeTheme: true,
  },
]

const DEFAULT_ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx'])

export const DEFAULT_GUIDANCE = 'Перенесите повторяемое значение в semantic token/layerStyle. '
  + 'Значение вне доступа к теме (metadata, satori, рендер без Chakra-провайдеров) или '
  + 'одноразовый декоративный эффект — в узкий allowlist только с пояснением ПОЧЕМУ.'

async function collectFiles(directory, ignoredDirectories, allowedExtensions) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue
    }

    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath, ignoredDirectories, allowedExtensions)))
      continue
    }

    if (entry.isFile() && allowedExtensions.has(extname(entry.name))) {
      files.push(absolutePath)
    }
  }

  return files
}

function toProjectPath(projectRoot, absolutePath) {
  return relative(projectRoot, absolutePath).split(sep).join('/')
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length
}

/**
 * Обходит `<projectRoot>/<sourceDirName>` и находит совпадения с `forbiddenPatterns`,
 * пропуская allowlisted значения и (кроме правил с `includeTheme: true`) файлы под `themePrefix`.
 * Чистая функция без побочных эффектов кроме чтения файлов — используется и CLI-обёрткой, и тестом.
 */
export async function findThemeHardcodes({
  projectRoot,
  sourceDirName = 'src',
  ignoredDirectories = new Set(['generated']),
  themePrefix,
  allowedMatches = new Map(),
  forbiddenPatterns = FORBIDDEN_PATTERNS,
  allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
}) {
  const sourceRoot = join(projectRoot, sourceDirName)
  const resolvedThemePrefix = themePrefix ?? `${sourceDirName}/theme/`
  const violations = []

  for (const absolutePath of await collectFiles(sourceRoot, ignoredDirectories, allowedExtensions)) {
    const projectPath = toProjectPath(projectRoot, absolutePath)
    const allowedForFile = allowedMatches.get(projectPath) ?? new Set()
    const content = await readFile(absolutePath, 'utf8')
    const isThemeFile = projectPath.startsWith(resolvedThemePrefix)

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

  return violations
}

/**
 * Тонкая CLI-обёртка над `findThemeHardcodes`: печатает находки, выставляет `process.exitCode`.
 * Каждый apps/<app>/scripts/check-theme-hardcodes.mjs — вызов этой функции со своим
 * allowlist/ignoredDirectories/guidance.
 */
export async function runThemeCheckCli(options) {
  const violations = await findThemeHardcodes(options)

  if (violations.length > 0) {
    console.error('Найдены новые или ещё не мигрированные hardcoded UI-значения:')
    for (const violation of violations) {
      console.error(
        `- ${violation.file}:${violation.line} — ${violation.label}: ${violation.value}`,
      )
    }
    console.error(options.guidance ?? DEFAULT_GUIDANCE)
    process.exitCode = 1
  } else {
    console.log('Hardcoded UI-цвета, тени и длительности переходов не найдены.')
  }

  return violations
}
