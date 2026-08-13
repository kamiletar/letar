import { readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

/**
 * Механизм чтения примеров кода с диска на сборке (P7 PLAN.md, Этап 0/1).
 *
 * Fumadocs 16 не имеет встроенного remark-code-import — читаем файл серверным
 * компонентом (`CodeFile`) вместо remark-плагина, см. обоснование в PLAN.md.
 *
 * ⚠️ Корень монорепо вычисляется от `process.cwd()`, а не от `import.meta.url` —
 * после `next build` серверный бандл лежит в `.next/server/...`, и путь к исходному
 * файлу компонента больше не совпадает со структурой репозитория. `process.cwd()` для
 * Next.js-приложений в этом монорепо во время `dev`/`build` — каталог самого приложения
 * (`apps/form-docs`), тем же способом уже резолвится `content/docs` в `source.config.ts`.
 */
const MONOREPO_ROOT = resolve(process.cwd(), '../..')

export class ExampleFileError extends Error {}

/**
 * Читает файл-пример по пути относительно корня монорепо.
 * Только для чтения примеров из известных sandbox-приложений — путь обязан
 * разрешиться внутри монорепо (защита от выхода за пределы через `..`).
 */
export function readExampleFile(pathFromRepoRoot: string): string {
  const absolute = resolve(MONOREPO_ROOT, pathFromRepoRoot)
  const relativeToRoot = relative(MONOREPO_ROOT, absolute)

  // `relative()` вместо `startsWith()` на абсолютном пути — сравнение строк пропускает
  // соседние каталоги с совпадающим префиксом (`/repo` матчит `/repo-evil`); `relative()` +
  // проверка на `..`/абсолютность после схлопывания `..` даёт корректный guard.
  if (relativeToRoot.startsWith('..') || isAbsolute(relativeToRoot)) {
    throw new ExampleFileError(`CodeFile: путь выходит за пределы монорепо — ${pathFromRepoRoot}`)
  }

  try {
    return readFileSync(absolute, 'utf-8').trim()
  } catch (error) {
    throw new ExampleFileError(`CodeFile: не удалось прочитать файл-пример ${pathFromRepoRoot} (${absolute})`, {
      cause: error,
    })
  }
}
