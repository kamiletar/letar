import { formatFiles, generateFiles, type GeneratorCallback, joinPathFragments, logger, type Tree } from '@nx/devkit'
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { resolveAppPort } from '../../utils/ports'
import { assertTargetIsFree, templatesDirFor } from '../../utils/tree'
import type { E2eSuiteGeneratorSchema } from './schema'

const templatesDir = templatesDirFor(import.meta.url)

/**
 * Приложение объявлено в `.gitmodules` как submodule на приватный репозиторий
 * (`letar-private-*`) — конвенция приватных коммерческих приложений монорепо
 * (aboi, driving-school, studio и т.д., см. .claude/docs/repo-structure.md).
 *
 * Ищем блок `[submodule "apps/<app>"]` и проверяем его `url` без полноценного
 * INI-парсера — формат `.gitmodules` простой и стабильный (git сам его генерирует).
 */
function isPrivateAppSubmodule(tree: Tree, app: string): boolean {
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

function manualLinkInstructions(app: string): string {
  const repoName = `letar-private-${app}-e2e`
  return (
    `⚠️ apps/${app} — приватный submodule, а apps/${app}-e2e сгенерирован обычной директорией `
    + `публичного репозитория letar. По конвенции (.claude/docs/repo-structure.md) он должен быть `
    + `отдельным приватным submodule — по образцу apps/aboi-e2e / apps/driving-school-e2e.\n`
    + `Перенеси вручную (или перезапусти генератор с --linkSubmodule для автоматического переноса):\n`
    + `  gh repo create kamiletar/${repoName} --private --description "${app}-e2e Playwright suite"\n`
    + `  cd apps/${app}-e2e && git init -b main && git remote add origin git@github.com:kamiletar/${repoName}.git\n`
    + `  git add . && git commit -m "chore: initial scaffold" && git push -u origin main\n`
    + `  cd ../.. && rm -rf apps/${app}-e2e\n`
    + `  git submodule add git@github.com:kamiletar/${repoName}.git apps/${app}-e2e\n`
    + `  git add .gitmodules apps/${app}-e2e && git commit -m "chore: add ${app}-e2e as private submodule"`
  )
}

/**
 * Полный перенос сгенерированного apps/<app>-e2e в приватный submodule через `gh`.
 *
 * Возвращается как GeneratorCallback — Nx исполняет его ПОСЛЕ того, как содержимое
 * Tree сброшено на реальный диск, иначе `apps/<app>-e2e` из шага `generateFiles` ещё
 * не существует физически и `git init` внутри него не сработает.
 *
 * Побочные эффекты (сетевой вызов gh, push в приватный GitHub-репозиторий, коммит в
 * letar) выполняются только когда пользователь сам передал `--linkSubmodule` — без
 * флага генератор ограничивается предупреждением в manualLinkInstructions().
 */
function linkPrivateE2eSubmodule(tree: Tree, app: string): GeneratorCallback {
  return () => {
    const repoName = `letar-private-${app}-e2e`
    const remoteUrl = `git@github.com:kamiletar/${repoName}.git`
    const e2eRelativeDir = joinPathFragments('apps', `${app}-e2e`)
    const e2eAbsoluteDir = joinPathFragments(tree.root, e2eRelativeDir)

    logger.info(`Создаю приватный репозиторий kamiletar/${repoName}...`)
    try {
      execFileSync(
        'gh',
        ['repo', 'create', `kamiletar/${repoName}`, '--private', '--description', `${app}-e2e Playwright suite`],
        { stdio: 'inherit' },
      )
    } catch (error) {
      throw new Error(
        `Не удалось создать репозиторий через gh (проверь, что \`gh auth status\` залогинен и репозиторий `
          + `ещё не существует). apps/${app}-e2e уже сгенерирован — можно перенести вручную:\n${
            manualLinkInstructions(app)
          }`,
        { cause: error },
      )
    }

    logger.info(`Инициализирую git в apps/${app}-e2e и пушу в ${remoteUrl}...`)
    try {
      execFileSync('git', ['init', '-b', 'main'], { cwd: e2eAbsoluteDir, stdio: 'inherit' })
      execFileSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: e2eAbsoluteDir, stdio: 'inherit' })
      execFileSync('git', ['add', '.'], { cwd: e2eAbsoluteDir, stdio: 'inherit' })
      execFileSync('git', ['commit', '-m', 'chore: initial scaffold'], { cwd: e2eAbsoluteDir, stdio: 'inherit' })
      execFileSync('git', ['push', '-u', 'origin', 'main'], { cwd: e2eAbsoluteDir, stdio: 'inherit' })
    } catch (error) {
      throw new Error(
        `Репозиторий kamiletar/${repoName} создан, но push не завершился. apps/${app}-e2e остался обычной `
          + `директорией — доделай перенос вручную (репозиторий на GitHub уже существует, шаг 1 из инструкции `
          + `ниже не нужен):\n${manualLinkInstructions(app)}`,
        { cause: error },
      )
    }

    logger.info(`Подключаю apps/${app}-e2e как submodule в letar...`)
    try {
      rmSync(e2eAbsoluteDir, { recursive: true, force: true })
    } catch (error) {
      throw new Error(
        `Пуш в kamiletar/${repoName} прошёл успешно, но не удалось удалить apps/${app}-e2e перед `
          + `подключением submodule — вероятно, папку держит nx daemon (Windows EBUSY). Останови демон `
          + `(\`nx reset\`) и доделай перенос вручную:\n  rm -rf apps/${app}-e2e\n`
          + `  git submodule add ${remoteUrl} apps/${app}-e2e\n`
          + `  git add .gitmodules apps/${app}-e2e && git commit -m "chore: add ${app}-e2e as private submodule"`,
        { cause: error },
      )
    }

    try {
      execFileSync('git', ['submodule', 'add', remoteUrl, e2eRelativeDir], { cwd: tree.root, stdio: 'inherit' })
      execFileSync('git', ['add', '.gitmodules', e2eRelativeDir], { cwd: tree.root, stdio: 'inherit' })
      execFileSync('git', ['commit', '-m', `chore: add ${app}-e2e as private submodule`], {
        cwd: tree.root,
        stdio: 'inherit',
      })
    } catch (error) {
      throw new Error(
        `apps/${app}-e2e удалён локально, а kamiletar/${repoName} готов, но \`git submodule add\` в letar `
          + `не завершился. Доделай вручную:\n  git submodule add ${remoteUrl} ${e2eRelativeDir}\n`
          + `  git add .gitmodules ${e2eRelativeDir} && git commit -m "chore: add ${app}-e2e as private submodule"`,
        { cause: error },
      )
    }

    logger.info(`✅ apps/${app}-e2e перенесён в приватный submodule kamiletar/${repoName}.`)
  }
}

export default async function e2eSuiteGenerator(
  tree: Tree,
  options: E2eSuiteGeneratorSchema,
): Promise<GeneratorCallback | void> {
  const { app } = options
  const appDir = joinPathFragments('apps', app)
  const e2eDir = joinPathFragments('apps', `${app}-e2e`)

  if (!tree.exists(appDir)) {
    throw new Error(`Приложение apps/${app} не найдено — сначала создай приложение, потом e2e-сьют для него`)
  }

  assertTargetIsFree(tree, e2eDir, 'сьюты')

  const port = options.port ?? resolveAppPort(tree, app)
  if (!port) {
    throw new Error(
      `Не удалось определить dev-порт для apps/${app} (нет ни PORT=<число> в apps/${app}/.env(.local), `
        + `ни \`-p <порт>\` в apps/${app}/project.json). `
        + `Передай явно: nx g @letar/generators:e2e-suite ${app} --port=<число>`,
    )
  }

  generateFiles(tree, templatesDir, e2eDir, {
    app,
    port,
  })

  await formatFiles(tree)

  logger.info(`✅ apps/${app}-e2e создан (порт ${port}).`)
  logger.info(`Дальше: nx typecheck ${app}-e2e && nx lint ${app}-e2e`)
  logger.info(
    `project.json с явным executor '@nx/playwright:playwright' — защита от того, что staging-`
      + `прогон (deploy_app → run_e2e) молча тестирует локальный dev вместо задеплоенного контейнера `
      + `(см. .claude/docs/e2e-testing.md § «nx e2e зависает намертво»).`,
  )
  logger.info(
    `Локальный прогон: подними dev-сервер вручную (nx run ${app}:dev) и вызови "bunx playwright test" `
      + `из apps/${app}-e2e напрямую, не через "nx e2e ${app}-e2e" — та команда может зависнуть на `
      + `неопределённое время, если dev-сервер ещё не поднят (см. тот же раздел docs).`,
  )

  if (isPrivateAppSubmodule(tree, app)) {
    if (options.linkSubmodule) {
      return linkPrivateE2eSubmodule(tree, app)
    }
    logger.warn(manualLinkInstructions(app))
  }
}
