import { joinPathFragments, type Tree } from '@nx/devkit'
import { fileURLToPath } from 'node:url'

/**
 * Путь к папке `files/` рядом с генератором.
 *
 * Генераторы исполняются как ESM (нет `__dirname`), поэтому директорию восстанавливаем через
 * `import.meta.url` — его обязан передать сам генератор, иначе получим папку этого утиля.
 */
export function templatesDirFor(importMetaUrl: string): string {
  return joinPathFragments(fileURLToPath(new URL('.', importMetaUrl)), 'files')
}

/**
 * Проверяет, что целевая директория свободна.
 *
 * Генераторы принципиально не перезаписывают существующие проекты: `generateFiles` молча
 * затирает файлы, а восстановить затёртое из Tree уже нельзя.
 *
 * @param kind вид проекта во множественном числе для текста ошибки: `приложения`, `библиотеки`, `сьюты`
 */
export function assertTargetIsFree(tree: Tree, dir: string, kind: string): void {
  if (tree.exists(dir)) {
    throw new Error(`${dir} уже существует — генератор не перезаписывает существующие ${kind}`)
  }
}
