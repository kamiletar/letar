import { joinPathFragments, type Tree } from '@nx/devkit'

/** Шаблон допустимого префикса задач — тот же, что проверяет `scripts/tasks.mjs`. */
const PREFIX_PATTERN = /^[A-Z]{2,5}$/

/** Каталоги, где может лежать очередь задач: корень монорепо, `apps/*`, `libs/*`. */
const QUEUE_PARENTS = ['apps', 'libs']

/** Читает `prefix` из `tasks/tasks.json` проекта; нет файла или он битый — `undefined`. */
function readPrefix(tree: Tree, projectDir: string): string | undefined {
  const file = joinPathFragments(projectDir, 'tasks/tasks.json')
  if (!tree.exists(file)) {
    return undefined
  }
  try {
    const parsed = JSON.parse(tree.read(file, 'utf-8') ?? '') as { prefix?: unknown }
    return typeof parsed.prefix === 'string' ? parsed.prefix : undefined
  } catch {
    return undefined
  }
}

/** Все префиксы задач, занятые в монорепо (с учётом ещё не записанных на диск файлов дерева). */
export function collectTaskPrefixes(tree: Tree): Set<string> {
  const used = new Set<string>()
  const rootPrefix = readPrefix(tree, '.')
  if (rootPrefix) {
    used.add(rootPrefix)
  }
  for (const parent of QUEUE_PARENTS) {
    for (const child of tree.children(parent)) {
      const prefix = readPrefix(tree, joinPathFragments(parent, child))
      if (prefix) {
        used.add(prefix)
      }
    }
  }
  return used
}

/**
 * Подбирает свободный префикс задач для нового приложения.
 *
 * Кандидаты по порядку: первые буквы слов имени (`my-cool-app` → `MCA`), первые 2–4 буквы имени
 * одним словом, затем первые 2 буквы + каждая следующая буква имени. Если все заняты — ошибка:
 * префикс лучше задать руками в `tasks/tasks.json`, чем получить случайный.
 */
export function pickTaskPrefix(tree: Tree, name: string): string {
  const used = collectTaskPrefixes(tree)
  const words = name.toUpperCase().split(/[^A-Z]+/).filter(Boolean)
  const letters = words.join('')
  const candidates = [
    words.map((w) => w[0]).join(''),
    letters.slice(0, 2),
    letters.slice(0, 3),
    letters.slice(0, 4),
    ...[...letters.slice(2)].map((c) => letters.slice(0, 2) + c),
  ]
  const found = candidates.find((c) => PREFIX_PATTERN.test(c) && !used.has(c))
  if (!found) {
    throw new Error(`Не удалось подобрать префикс задач для «${name}»: задай его вручную в tasks/tasks.json.`)
  }
  return found
}
