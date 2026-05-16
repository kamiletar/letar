#!/usr/bin/env bun

/**
 * Скрипт для автоматического обновления версии Animatrona
 *
 * Использование:
 *   bun scripts/bump-version.ts animatrona patch    # 0.21.14 → 0.21.15
 *   bun scripts/bump-version.ts animatrona minor    # 0.21.14 → 0.22.0
 *   bun scripts/bump-version.ts animatrona major    # 0.21.14 → 1.0.0
 *   bun scripts/bump-version.ts animatrona 1.0.0    # Конкретная версия
 */

import chalk from 'chalk'
import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'

// Конфигурация для каждого проекта
const PROJECTS = {
  animatrona: {
    files: [
      {
        path: 'apps/animatrona/package.json',
        type: 'json' as const,
        jsonPath: 'version',
      },
      {
        path: 'apps/animatrona/renderer/package.json',
        type: 'json' as const,
        jsonPath: 'version',
      },
      {
        path: 'apps/animatrona/resources/splash.html',
        type: 'regex' as const,
        pattern: /<span class="version" id="version">v(\d+\.\d+\.\d+)<\/span>/,
        replacement: (version: string) => `<span class="version" id="version">v${version}</span>`,
      },
    ],
  },
}

type Project = keyof typeof PROJECTS
type BumpType = 'major' | 'minor' | 'patch'

/** Безопасное выполнение git команды */
function execGit(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf-8' })
  } catch (error) {
    console.error(chalk.red('✗ Ошибка выполнения git команды:'), error)
    process.exit(1)
  }
}

/** Парсинг версии из строки */
function parseVersion(versionStr: string): [number, number, number] {
  const match = versionStr.match(/^v?(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    throw new Error(`Некорректный формат версии: ${versionStr}`)
  }
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
}

/** Инкремент версии */
function incrementVersion(version: [number, number, number], type: BumpType): [number, number, number] {
  const [major, minor, patch] = version
  switch (type) {
    case 'major':
      return [major + 1, 0, 0]
    case 'minor':
      return [major, minor + 1, 0]
    case 'patch':
      return [major, minor, patch + 1]
  }
}

/** Проверка что нет uncommitted changes */
function checkGitStatus(): void {
  const status = execGit(['status', '--porcelain'])
  if (status.trim()) {
    console.log(chalk.red('✗ Обнаружены незакоммиченные изменения:'))
    console.log(status)
    console.log(chalk.yellow('\nЗакоммитьте или спрячьте изменения перед bump версии.'))
    process.exit(1)
  }
}

/** Обновление JSON файла */
async function updateJsonFile(filePath: string, jsonPath: string, newVersion: string): Promise<void> {
  const content = await readFile(filePath, 'utf-8')
  const json = JSON.parse(content)

  // Поддерживаем только простые пути (без вложенности)
  if (jsonPath.includes('.')) {
    throw new Error(`Вложенные JSON пути не поддерживаются: ${jsonPath}`)
  }

  json[jsonPath] = newVersion

  // Сохраняем с отступами и переводом строки в конце
  await writeFile(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8')
}

/** Обновление файла через regex */
async function updateRegexFile(
  filePath: string,
  pattern: RegExp,
  replacement: (version: string) => string,
  newVersion: string
): Promise<void> {
  const content = await readFile(filePath, 'utf-8')

  if (!pattern.test(content)) {
    throw new Error(`Паттерн не найден в файле ${filePath}:\n${pattern.toString()}`)
  }

  const newContent = content.replace(pattern, replacement(newVersion))
  await writeFile(filePath, newContent, 'utf-8')
}

/** Обновление всех файлов проекта */
async function updateProjectFiles(project: Project, newVersion: string): Promise<void> {
  const config = PROJECTS[project]

  for (const file of config.files) {
    if (!existsSync(file.path)) {
      throw new Error(`Файл не найден: ${file.path}`)
    }

    if (file.type === 'json') {
      await updateJsonFile(file.path, file.jsonPath, newVersion)
      console.log(chalk.green(`✓ Обновлён ${file.path}`))
    } else if (file.type === 'regex') {
      await updateRegexFile(file.path, file.pattern, file.replacement, newVersion)
      console.log(chalk.green(`✓ Обновлён ${file.path}`))
    }
  }
}

/** Получение текущей версии проекта */
async function getCurrentVersion(project: Project): Promise<string> {
  const config = PROJECTS[project]
  const firstFile = config.files[0]

  if (firstFile.type === 'json') {
    const content = await readFile(firstFile.path, 'utf-8')
    const json = JSON.parse(content)
    return json[firstFile.jsonPath]
  }

  throw new Error('Первый файл должен быть JSON для получения версии')
}

/** Создание коммита и тега */
function createCommitAndTag(project: Project, version: string): void {
  try {
    // Добавляем изменённые файлы
    const config = PROJECTS[project]
    for (const file of config.files) {
      execGit(['add', file.path])
    }

    // Создаём коммит
    const commitMessage = `chore(${project}): bump version to ${version}`
    execGit(['commit', '-m', commitMessage])
    console.log(chalk.green(`✓ Создан коммит: ${commitMessage}`))

    // Создаём тег с префиксом для монорепо
    const tag = `${project}-v${version}`
    execGit(['tag', tag])
    console.log(chalk.green(`✓ Создан тег: ${tag}`))
  } catch (error) {
    console.error(chalk.red('✗ Ошибка при создании коммита/тега:'), error)
    process.exit(1)
  }
}

/** Показать инструкции для публикации */
function showInstructions(project: Project, version: string): void {
  const tag = `${project}-v${version}`

  console.log(chalk.cyan('\n' + '='.repeat(60)))
  console.log(chalk.cyan.bold('  📦 Версия обновлена!'))
  console.log(chalk.cyan('='.repeat(60)))

  console.log(chalk.white('\nСледующие шаги:'))
  console.log(chalk.gray('  1. Проверьте изменения:'))
  console.log(chalk.yellow(`     git show HEAD`))
  console.log(chalk.yellow(`     git show ${tag}`))

  console.log(chalk.gray('\n  2. Отправьте изменения в репозиторий:'))
  console.log(chalk.yellow(`     git push origin main`))
  console.log(chalk.yellow(`     git push origin ${tag}`))

  console.log(chalk.gray('\n  3. GitHub Actions автоматически запустит релиз workflow'))
  console.log(chalk.gray('     Следите за прогрессом: https://github.com/kamiletar/letar/actions'))

  console.log(chalk.cyan('\n' + '='.repeat(60) + '\n'))
}

/** Основная функция */
async function main() {
  // Парсим аргументы
  const [project, versionArg] = process.argv.slice(2) as [Project | undefined, string | undefined]

  if (!project || !versionArg) {
    console.log(chalk.red('Использование:'))
    console.log(chalk.yellow('  bun scripts/bump-version.ts <project> <type>'))
    console.log(chalk.gray('\nПроекты:'))
    console.log(chalk.white('  animatrona'))
    console.log(chalk.gray('\nТипы:'))
    console.log(chalk.white('  patch  - 0.21.14 → 0.21.15 (багфиксы)'))
    console.log(chalk.white('  minor  - 0.21.14 → 0.22.0  (новые фичи)'))
    console.log(chalk.white('  major  - 0.21.14 → 1.0.0   (breaking changes)'))
    console.log(chalk.white('  X.Y.Z  - Конкретная версия'))
    console.log(chalk.gray('\nПример:'))
    console.log(chalk.yellow('  bun scripts/bump-version.ts animatrona patch'))
    process.exit(1)
  }

  // Проверяем что проект существует
  if (!(project in PROJECTS)) {
    console.error(chalk.red(`✗ Неизвестный проект: ${project}`))
    console.error(chalk.gray(`  Доступные проекты: ${Object.keys(PROJECTS).join(', ')}`))
    process.exit(1)
  }

  console.log(chalk.cyan.bold(`\n📦 Обновление версии ${project}...\n`))

  // Проверяем git статус
  console.log(chalk.gray('Проверка git статуса...'))
  checkGitStatus()

  // Получаем текущую версию
  const currentVersion = await getCurrentVersion(project)
  console.log(chalk.gray(`Текущая версия: ${currentVersion}`))

  // Определяем новую версию
  let newVersion: string

  if (['major', 'minor', 'patch'].includes(versionArg)) {
    const currentParsed = parseVersion(currentVersion)
    const incremented = incrementVersion(currentParsed, versionArg as BumpType)
    newVersion = incremented.join('.')
  } else {
    // Проверяем что это корректная версия
    try {
      parseVersion(versionArg)
      newVersion = versionArg.replace(/^v/, '') // Убираем v если есть
    } catch (error) {
      console.error(chalk.red(`✗ Некорректная версия: ${versionArg}`))
      process.exit(1)
    }
  }

  console.log(chalk.green(`Новая версия:    ${newVersion}\n`))

  // Подтверждение
  console.log(chalk.yellow(`Будут обновлены ${PROJECTS[project].files.length} файла(ов).`))
  console.log(chalk.yellow('Продолжить? (y/N): '))

  // В Bun используем stdin напрямую
  const confirm = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase())
    })
  })

  if (confirm !== 'y' && confirm !== 'yes') {
    console.log(chalk.gray('Отменено.'))
    process.exit(0)
  }

  // Обновляем файлы
  console.log(chalk.gray('\nОбновление файлов...'))
  await updateProjectFiles(project, newVersion)

  // Создаём коммит и тег
  console.log(chalk.gray('\nСоздание коммита и тега...'))
  createCommitAndTag(project, newVersion)

  // Показываем инструкции
  showInstructions(project, newVersion)
}

// Запуск
main().catch((error) => {
  console.error(chalk.red('\n✗ Ошибка:'), error)
  process.exit(1)
})
