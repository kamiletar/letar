import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

// Регресс-гейт против бага "eager JSX на верхнем уровне модуля" —
// .claude/docs/letar-forms-lazy-component-eager-jsx-seed-crash.md.
// Под Next.js (automatic JSX runtime) такой код работает; под tsx/esbuild
// (nx db:seed) резолв идёт по tsconfig приложения-потребителя ("jsx": "preserve"
// у Next.js-пресета трактуется как classic-трансформ) и падает ReferenceError:
// React is not defined на этапе импорта, до всякого рендера.
//
// Правила — регекс-эвристика по строке файла (без AST), тот же уровень строгости,
// что и @letar/theme-check. Все три ловят JSX-литерал ровно там, где он раньше был
// найден руками: значение свойства объекта (icon: <LuBold />), top-level const
// (export const X = <Skeleton />) и JSX-аргумент вызова в top-level присваивании
// (createLazyComponentBase(importFn, <Skeleton />)).
// Открывающий JSX-тег: заглавная буква + список атрибутов вида `name`/`name=...`
// (JSX-синтаксис), либо сразу закрытие. Захватывается отдельной группой, чтобы в
// отчёте/allowlist участвовал только сам тег, а не окружающий его код присваивания.
// Атрибуты нарочно ограничены "identifier[=value]" — это отсекает generic-тип с
// дефолтом вида "<TValue = unknown>" (после имени идёт "= unknown", не атрибут).
const JSX_OPEN_TAG = '(<[A-Z][A-Za-z0-9]*'
  + '(?:\\s+[a-zA-Z][\\w-]*(?:=(?:"[^"\\n]*"|\'[^\'\\n]*\'|\\{[^{}\\n]*\\}))?)*'
  + '\\s*\\/?>)'

export const FORBIDDEN_PATTERNS = [
  {
    label: 'JSX как значение свойства объекта',
    // ":" + опциональный пробел + JSX-открывающий тег с заглавной буквы.
    // Не матчит generic-типы вида "x: Array<Foo>" — между ":" и "<" там непробельные
    // символы ("Array"), а сюда попадает только "<" сразу после ":".
    regex: new RegExp(`:\\s*${JSX_OPEN_TAG}`, 'gu'),
    // render-колбэк объекта; стрелочная функция-значение; тернарник (условие ? <A/> : <B/>) —
    // это условное ветвление внутри render, не top-level инициализация.
    excludeLineIfMatches: /render\s*:|=>|\?[^\n]*:\s*<[A-Z]/u,
  },
  {
    label: 'JSX как top-level инициализатор const',
    regex: new RegExp(`^(?:export\\s+)?const\\s+[A-Za-z_$][\\w$]*\\s*=\\s*${JSX_OPEN_TAG}`, 'gmu'),
  },
  {
    label: 'JSX как top-level аргумент вызова функции',
    // "export const X = fn(..., <Component .../>)" на одной строке верхнего уровня
    // (без отступа — конвенция модульного top-level в этой кодовой базе).
    regex: new RegExp(
      `^(?:export\\s+)?(?:const|let)\\s+[A-Za-z_$][\\w$]*[^=\\n]*=\\s*[A-Za-z_$][\\w$]*\\([^()\\n]*${JSX_OPEN_TAG}`,
      'gmu',
    ),
  },
]

const DEFAULT_ALLOWED_EXTENSIONS = new Set(['.tsx'])

export const DEFAULT_GUIDANCE = 'JSX-элемент создаётся при импорте модуля, а не внутри render/'
  + 'фабрики — под tsx/esbuild (nx db:seed) это падает ReferenceError: React is not defined. '
  + 'Замени на фабрику (() => <X />) или ComponentType-ссылку, инстанцируй только в render. '
  + 'Подробности — .claude/docs/letar-forms-lazy-component-eager-jsx-seed-crash.md.'

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

function lineAt(content, index) {
  const lineStart = content.lastIndexOf('\n', index) + 1
  const lineEnd = content.indexOf('\n', index)
  return content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd)
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length
}

/**
 * Обходит `<projectRoot>/<sourceDirName>` и находит совпадения с `forbiddenPatterns`,
 * пропуская allowlisted значения. Чистая функция без побочных эффектов кроме чтения
 * файлов — используется и CLI-обёрткой, и тестом.
 */
export async function findEagerJsx({
  projectRoot,
  sourceDirName = 'src',
  ignoredDirectories = new Set(['generated']),
  allowedMatches = new Map(),
  forbiddenPatterns = FORBIDDEN_PATTERNS,
  allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
}) {
  const sourceRoot = join(projectRoot, sourceDirName)
  const violations = []

  for (const absolutePath of await collectFiles(sourceRoot, ignoredDirectories, allowedExtensions)) {
    const projectPath = toProjectPath(projectRoot, absolutePath)
    const allowedForFile = allowedMatches.get(projectPath) ?? new Set()
    const content = await readFile(absolutePath, 'utf8')

    for (const { label, regex, excludeLineIfMatches } of forbiddenPatterns) {
      for (const match of content.matchAll(regex)) {
        const index = match.index ?? 0
        const line = lineAt(content, index)
        const trimmedLine = line.trimStart()

        // JSDoc/block-comment строки (`* ...`) и однострочные `//` — не исполняемый код.
        if (trimmedLine.startsWith('*') || trimmedLine.startsWith('//')) {
          continue
        }

        // Ветка многострочного тернарника (`cond\n  ? <A />\n  : <B />`) — строка-продолжение
        // условного выражения внутри render, не top-level инициализация.
        if (trimmedLine.startsWith(':')) {
          continue
        }

        if (excludeLineIfMatches?.test(line)) {
          continue
        }

        const value = match[1] ?? match[0]

        if (allowedForFile.has(value)) {
          continue
        }

        violations.push({
          file: projectPath,
          line: lineNumberAt(content, index),
          label,
          value,
        })
      }
    }
  }

  return violations
}

/**
 * Тонкая CLI-обёртка над `findEagerJsx`: печатает находки, выставляет `process.exitCode`.
 * Каждый `libs/<lib>/scripts/check-eager-jsx.mjs` — вызов этой функции со своим
 * `ignoredDirectories`/`allowedMatches`.
 */
export async function runEagerJsxCheckCli(options) {
  const violations = await findEagerJsx(options)

  if (violations.length > 0) {
    console.error('Найден JSX, создаваемый на верхнем уровне модуля (не в render/фабрике):')
    for (const violation of violations) {
      console.error(
        `- ${violation.file}:${violation.line} — ${violation.label}: ${violation.value}`,
      )
    }
    console.error(options.guidance ?? DEFAULT_GUIDANCE)
    process.exitCode = 1
  } else {
    console.log('Eager top-level JSX не найден.')
  }

  return violations
}
