import { joinPathFragments, type Tree } from '@nx/devkit'
import { fileURLToPath } from 'node:url'

/**
 * Путь к папке `files/` рядом с генератором.
 *
 * Генераторы исполняются как ESM (нет `__dirname`), поэтому директорию восстанавливаем через
 * `import.meta.url` — его обязан передать сам генератор, иначе получим папку этого утиля.
 */
export function templatesDirFor(importMetaUrl: string, dir = 'files'): string {
  return joinPathFragments(fileURLToPath(new URL('.', importMetaUrl)), dir)
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

/**
 * Приложение объявлено в `.gitmodules` как submodule на приватный репозиторий
 * (`letar-private-*`) — конвенция приватных коммерческих приложений монорепо
 * (aboi, driving-school, studio и т.д., см. .claude/docs/repo-structure.md).
 *
 * Ищем блок `[submodule "apps/<app>"]` и проверяем его `url` без полноценного
 * INI-парсера — формат `.gitmodules` простой и стабильный (git сам его генерирует).
 */
export function isPrivateAppSubmodule(tree: Tree, app: string): boolean {
  const gitmodules = tree.read('.gitmodules', 'utf-8')
  if (!gitmodules) {
    return false
  }

  const marker = `[submodule "apps/${app}"]`
  const start = gitmodules.indexOf(marker)
  if (start === -1) {
    return false
  }

  const nextSectionStart = gitmodules.indexOf('[submodule', start + marker.length)
  const block = gitmodules.slice(start, nextSectionStart === -1 ? undefined : nextSectionStart)

  return /url\s*=.*letar-private-/.test(block)
}
