import { type GeneratorCallback, joinPathFragments, logger, type Tree, updateJson } from '@nx/devkit'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { isPrivateAppSubmodule, templatesDirFor } from '../../utils/tree'
import type { GlitchtipIntegrateGeneratorSchema } from './schema'

const templatesDir = templatesDirFor(import.meta.url)

const ENV_VARS = [
  'GLITCHTIP_DSN',
  'GLITCHTIP_ENVIRONMENT',
  'NEXT_PUBLIC_GLITCHTIP_DSN',
  'NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT',
]

function envDefaults(environment: 'production' | 'staging'): Record<string, string> {
  return {
    GLITCHTIP_DSN: '',
    GLITCHTIP_ENVIRONMENT: environment,
    NEXT_PUBLIC_GLITCHTIP_DSN: '',
    NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT: environment,
  }
}

const ENV_DOCKER_COMMENT =
  '# GlitchTip (трекинг ошибок) — DSN получить в GlitchTip UI → Settings → Client Keys, см. infra/glitchtip/README.md'

/**
 * Создаёт/дополняет instrumentation-файл. Никогда не перезаписывает существующий файл с
 * посторонней логикой (пример — apps/dashboard/src/instrumentation.ts, где инструментация уже
 * занята мониторингом) — вместо этого печатает готовый сниппет для ручного слияния.
 */
function writeInstrumentationFile(tree: Tree, targetPath: string, templateFileName: string, app: string): void {
  const templateContent = readFileSync(joinPathFragments(templatesDir, 'src', `${templateFileName}.template`), 'utf-8')

  if (!tree.exists(targetPath)) {
    tree.write(targetPath, templateContent)
    logger.info(`✅ ${targetPath} создан.`)
    return
  }

  const existing = tree.read(targetPath, 'utf-8') ?? ''
  if (existing.includes('@letar/glitchtip')) {
    logger.info(`⏭️  ${targetPath} уже подключает @letar/glitchtip — пропущено (идемпотентность).`)
    return
  }

  logger.warn(
    `⚠️  ${targetPath} уже существует и занят другой логикой (не перезаписан — риск потерять её). `
      + `Слей вручную содержимое:\n\n${templateContent}\n`
      + `В apps/${app} обычно это означает: добавить импорт '@letar/glitchtip/${
        templateFileName.includes('client') ? 'client' : 'server'
      }' `
      + `и вызвать его рядом с существующим кодом файла, не удаляя существующий.`,
  )
}

// name → shell-переменная-источник интерполяции. Для двух release-переменных источник один и тот
// же GLITCHTIP_RELEASE (git short SHA, экспортирует deploy-affected.sh до nx build) — сервер
// читает release из process.env.GLITCHTIP_RELEASE, клиент инлайнит NEXT_PUBLIC_-копию на билде.
const COMPOSE_VARS: Array<{ name: string; source: string }> = [
  ...ENV_VARS.map((name) => ({ name, source: name })),
  { name: 'GLITCHTIP_RELEASE', source: 'GLITCHTIP_RELEASE' },
  { name: 'NEXT_PUBLIC_GLITCHTIP_RELEASE', source: 'GLITCHTIP_RELEASE' },
]

/**
 * Точечная текстовая правка docker-compose production/staging: вставляет переменные GlitchTip
 * (DSN/environment/release) в `services.app.environment` через `${VAR}` (НЕ литералом — см.
 * libs/glitchtip/README.md и .claude/docs/nextjs-public-env-build-time-inlining.md). Не парсит
 * YAML целиком — конвенция сервиса-приложения по имени "app" стабильна во всех docker-compose
 * приложений монорепо (см. .claude/rules/env-files.md § «Новая переменная окружения»).
 */
function upsertComposeEnvVars(content: string): { content: string; status: 'inserted' | 'already-present' | 'manual' } {
  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content.split(/\r\n|\n/)

  const presentCount =
    COMPOSE_VARS.filter(({ name }) => lines.some((line) => new RegExp(`^\\s*${name}:`).test(line))).length
  if (presentCount === COMPOSE_VARS.length) {
    return { content, status: 'already-present' }
  }
  if (presentCount > 0) {
    // Частичное совпадение — не рискуем дублировать или доугадывать, пусть человек посмотрит сам.
    return { content, status: 'manual' }
  }

  const appIdx = lines.findIndex((line) => /^ {2}app:\s*$/.test(line))
  if (appIdx === -1) {
    return { content, status: 'manual' }
  }

  let blockEnd = lines.length
  for (let i = appIdx + 1; i < lines.length; i++) {
    if (/^\s{0,2}\S/.test(lines[i])) {
      blockEnd = i
      break
    }
  }

  let envIdx = -1
  for (let i = appIdx + 1; i < blockEnd; i++) {
    if (/^ {4}environment:\s*$/.test(lines[i])) {
      envIdx = i
      break
    }
  }

  const varLines = COMPOSE_VARS.map(({ name, source }) => `      ${name}: \${${source}}`)

  if (envIdx !== -1) {
    lines.splice(envIdx + 1, 0, ...varLines)
  } else {
    lines.splice(blockEnd, 0, '    environment:', ...varLines)
  }

  return { content: lines.join(eol), status: 'inserted' }
}

function upsertDockerCompose(tree: Tree, composePath: string): void {
  if (!tree.exists(composePath)) {
    return
  }

  const content = tree.read(composePath, 'utf-8') ?? ''
  const result = upsertComposeEnvVars(content)

  if (result.status === 'already-present') {
    logger.info(`⏭️  ${composePath} уже содержит все переменные GlitchTip — пропущено.`)
    return
  }
  if (result.status === 'manual') {
    logger.warn(
      `⚠️  ${composePath}: не удалось безопасно определить место вставки (частичное совпадение `
        + `переменных или нестандартная структура — сервис "app" не найден). Добавь вручную в `
        + `services.app.environment:\n${
          COMPOSE_VARS.map(({ name, source }) => `      ${name}: \${${source}}`).join('\n')
        }`,
    )
    return
  }

  tree.write(composePath, result.content)
  logger.info(`✅ ${composePath}: 4 переменные GlitchTip добавлены в services.app.environment (проверь diff!).`)
}

function upsertEnvDocker(
  tree: Tree,
  envPath: string,
  environment: 'production' | 'staging',
  exampleValues: boolean,
): void {
  const missing = ENV_VARS.filter((name) => {
    if (!tree.exists(envPath)) {
      return true
    }
    const content = tree.read(envPath, 'utf-8') ?? ''
    return !new RegExp(`^${name}=`, 'm').test(content)
  })

  if (missing.length === 0) {
    logger.info(`⏭️  ${envPath} уже содержит все 4 переменные GlitchTip — пропущено.`)
    return
  }

  const defaults = envDefaults(environment)
  const block = [
    '',
    ENV_DOCKER_COMMENT,
    ...missing.map((name) => `${name}=${exampleValues ? `<${name.toLowerCase()}>` : defaults[name]}`),
  ].join('\n')

  if (tree.exists(envPath)) {
    const content = tree.read(envPath, 'utf-8') ?? ''
    tree.write(envPath, content.replace(/\n*$/, '\n') + block + '\n')
  } else {
    tree.write(envPath, block.trimStart() + '\n')
  }

  logger.info(`✅ ${envPath}: добавлено ${missing.length} переменных GlitchTip.`)
}

/**
 * Точечная текстовая правка next.config.*: вставляет `productionBrowserSourceMaps: true` сразу
 * после `const nextConfig = {` — без него Next.js не эмитит `.js.map` в проде, и грузить в
 * GlitchTip нечего (deploy-affected.sh просто молча пропускает шаг — не найдёт ни одного `.map`,
 * см. PLAN-INFRA-4.md §70 п.6). Не парсит AST — конвенция `const nextConfig = {...}` стабильна во
 * всех приложениях монорепо на этом пресете (см. apps/dashboard, apps/mandala).
 */
function upsertProductionBrowserSourceMaps(tree: Tree, nextConfigPath: string): void {
  if (!tree.exists(nextConfigPath)) {
    return
  }
  const content = tree.read(nextConfigPath, 'utf-8') ?? ''
  if (content.includes('productionBrowserSourceMaps')) {
    logger.info(`⏭️  ${nextConfigPath} уже содержит productionBrowserSourceMaps — пропущено.`)
    return
  }

  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content.split(/\r\n|\n/)
  const idx = lines.findIndex((line) => /^const nextConfig(?::[^=]+)?\s*=\s*\{/.test(line))
  if (idx === -1) {
    logger.warn(
      `⚠️ ${nextConfigPath}: не нашёл "const nextConfig = {" — впиши вручную `
        + `"productionBrowserSourceMaps: true," в объект конфигурации (без него sourcemaps не собираются).`,
    )
    return
  }

  lines.splice(
    idx + 1,
    0,
    '  // Клиентские sourcemaps в проде — без них стектрейсы в GlitchTip приходят из минифицированного',
    '  // кода. .map-файлы не публикуются: сборка удаляет их после загрузки в GlitchTip',
    '  // (см. корневой scripts/glitchtip-upload-sourcemaps.mjs, PLAN-INFRA-4.md §70 п.6).',
    '  productionBrowserSourceMaps: true,',
  )
  tree.write(nextConfigPath, lines.join(eol))
  logger.info(`✅ ${nextConfigPath}: productionBrowserSourceMaps: true добавлен (проверь diff!).`)
}

function runChecksCallback(app: string): GeneratorCallback {
  return () => {
    logger.info(`Прогоняю nx typecheck:tsgo и lint для ${app} и glitchtip...`)
    try {
      execFileSync('nx', ['run-many', '-t', 'typecheck:tsgo', 'lint', '--projects', `${app},glitchtip`], {
        stdio: 'inherit',
        shell: true,
      })
      logger.info('✅ typecheck:tsgo и lint прошли успешно.')
    } catch (error) {
      logger.warn(
        `⚠️ nx typecheck:tsgo/lint для ${app},glitchtip завершились с ошибкой — запусти вручную и почини перед `
          + `коммитом:\n  nx run-many -t typecheck:tsgo lint --projects ${app},glitchtip`,
      )
      logger.warn(String(error))
    }
  }
}

export default async function glitchtipIntegrateGenerator(
  tree: Tree,
  options: GlitchtipIntegrateGeneratorSchema,
): Promise<GeneratorCallback | void> {
  const { app } = options
  const appDir = joinPathFragments('apps', app)

  if (!tree.exists(appDir)) {
    throw new Error(`apps/${app} не найдено`)
  }

  const packageJsonPath = joinPathFragments(appDir, 'package.json')
  if (!tree.exists(packageJsonPath)) {
    throw new Error(`apps/${app}/package.json не найден — генератор рассчитан на Next.js-приложения монорепо`)
  }

  // "next" — корневая зависимость bun workspace (package.json приложения её не объявляет), поэтому
  // признак Next.js-приложения — next.config.* рядом с ним, а не dependencies.next.
  const isNextApp = ['next.config.js', 'next.config.mjs', 'next.config.ts'].some((f) =>
    tree.exists(joinPathFragments(appDir, f))
  )
  if (!isNextApp) {
    throw new Error(
      `apps/${app} не похоже на Next.js-приложение (нет next.config.* рядом с apps/${app}). `
        + `@letar/glitchtip подключается через instrumentation.ts/instrumentation-client.ts (нативные хуки Next.js) — `
        + `для Electron/React Native нужна другая интеграция (см. задачу в PLAN-INFRA.md §70 п.7).`,
    )
  }

  if (isPrivateAppSubmodule(tree, app) && !options.allowPrivate) {
    throw new Error(
      `apps/${app} — приватный submodule (коммерческое/потенциально ПДн-приложение). GlitchTip живёт на s3 и `
        + `сейчас шлёт события через интернет, не в изолированном контуре (см. PLAN-INFRA.md §70 п.5, `
        + `infra/glitchtip/README.md § «Что не сделано»). Прежде чем подключать такое приложение — реши вопрос `
        + `изоляции с владельцем. Если решение уже принято и приложение можно подключать как есть — повтори `
        + `команду с --allowPrivate.`,
    )
  }

  const hasSrcDir = tree.exists(joinPathFragments(appDir, 'src'))
  const srcPrefix = hasSrcDir ? 'src' : ''

  logger.info(
    `\n📋 Шаг 1/7 — создай проект в GlitchTip UI (ручной шаг, не автоматизирован намеренно — генератор не хранит `
      + `админ-токен GlitchTip):\n`
      + `  1. https://errors.s3.letar.best → Settings → Projects → New Project\n`
      + `  2. Platform: Next.js (или Node.js — платформа не влияет на SDK, только на подсказки в UI), slug: "${app}"\n`
      + `  3. Settings → Client Keys → скопируй DSN (вида https://<key>@errors.s3.letar.best/<id>)\n`
      + `  4. Впиши DSN в apps/${app}/.env.docker (GLITCHTIP_DSN и NEXT_PUBLIC_GLITCHTIP_DSN — значение одно и то же)\n`
      + `  5. Допиши строку "${app}" в таблицу «Подключённые приложения» infra/glitchtip/README.md\n`,
  )

  logger.info('📋 Шаг 2/7 — instrumentation-файлы...')
  writeInstrumentationFile(tree, joinPathFragments(appDir, srcPrefix, 'instrumentation.ts'), 'instrumentation.ts', app)
  writeInstrumentationFile(
    tree,
    joinPathFragments(appDir, srcPrefix, 'instrumentation-client.ts'),
    'instrumentation-client.ts',
    app,
  )

  logger.info('📋 Шаг 3/7 — package.json (dependencies + nx.implicitDependencies)...')
  updateJson(tree, packageJsonPath, (json) => {
    json.dependencies = json.dependencies ?? {}
    if (!json.dependencies['@letar/glitchtip']) {
      json.dependencies['@letar/glitchtip'] = 'workspace:*'
    }
    json.nx = json.nx ?? {}
    json.nx.implicitDependencies = json.nx.implicitDependencies ?? []
    if (!json.nx.implicitDependencies.includes('@letar/glitchtip')) {
      json.nx.implicitDependencies.push('@letar/glitchtip')
    }
    return json
  })

  logger.info('📋 Шаг 4/7 — tsconfig.json (paths для ./server и ./client)...')
  const tsconfigPath = joinPathFragments(appDir, 'tsconfig.json')
  if (tree.exists(tsconfigPath)) {
    updateJson(tree, tsconfigPath, (json) => {
      json.compilerOptions = json.compilerOptions ?? {}
      json.compilerOptions.paths = json.compilerOptions.paths ?? {}
      const paths = json.compilerOptions.paths as Record<string, string[]>
      paths['@letar/glitchtip'] ??= ['../../libs/glitchtip/src/index.ts']
      paths['@letar/glitchtip/client'] ??= ['../../libs/glitchtip/src/client/index.ts']
      paths['@letar/glitchtip/server'] ??= ['../../libs/glitchtip/src/server/index.ts']
      return json
    })
  } else {
    logger.warn(`⚠️ ${tsconfigPath} не найден — пропущено. Пропиши paths вручную (см. libs/glitchtip/README.md).`)
  }

  logger.info('📋 Шаг 5/7 — .env.docker/.env.staging (+ .example) и docker-compose.*.yml...')
  upsertEnvDocker(tree, joinPathFragments(appDir, '.env.docker'), 'production', false)
  if (!tree.exists(joinPathFragments(appDir, '.env.docker.enc'))) {
    logger.warn(
      `⚠️ apps/${app}/.env.docker.enc не найден. После заполнения DSN зашифруй: `
        + `sops --encrypt --output apps/${app}/.env.docker.enc apps/${app}/.env.docker (нужен SOPS_AGE_KEY_FILE, `
        + `см. .claude/docs/secret-manager.md).`,
    )
  } else {
    logger.warn(
      `⚠️ apps/${app}/.env.docker.enc уже существует, но не обновлён — генератор не трогает зашифрованные файлы. `
        + `После заполнения DSN в .env.docker перешифруй: sops --encrypt --output apps/${app}/.env.docker.enc apps/${app}/.env.docker`,
    )
  }
  if (tree.exists(joinPathFragments(appDir, '.env.docker.example'))) {
    upsertEnvDocker(tree, joinPathFragments(appDir, '.env.docker.example'), 'production', true)
  }

  // .env.staging обслуживает docker-compose.staging.yml — не шифруется (§18.8 PLAN-INFRA.md ещё
  // не закрыт), поэтому здесь дописываем и реальный файл, если он уже существует, без warning про sops.
  if (tree.exists(joinPathFragments(appDir, '.env.staging'))) {
    upsertEnvDocker(tree, joinPathFragments(appDir, '.env.staging'), 'staging', false)
  }
  if (tree.exists(joinPathFragments(appDir, '.env.staging.example'))) {
    upsertEnvDocker(tree, joinPathFragments(appDir, '.env.staging.example'), 'staging', true)
  }

  upsertDockerCompose(tree, joinPathFragments(appDir, 'docker-compose.production.yml'))
  upsertDockerCompose(tree, joinPathFragments(appDir, 'docker-compose.staging.yml'))

  logger.info('📋 Шаг 6/7 — productionBrowserSourceMaps в next.config...')
  for (const fileName of ['next.config.js', 'next.config.mjs', 'next.config.ts']) {
    upsertProductionBrowserSourceMaps(tree, joinPathFragments(appDir, fileName))
  }

  logger.info(`\n✅ apps/${app} подключён к @letar/glitchtip.`)
  logger.info(
    '📋 Шаг 7/7 — обязательно проверь глазами diff docker-compose.*.yml/next.config.* (текстовая вставка, '
      + 'не YAML/AST-парсер) и .env.docker перед коммитом.',
  )
  logger.info(`Деплой — только через deploy-request deploy-agent-dev (.claude/rules/deploy-coordination.md), не сам.`)

  if (options.skipChecks) {
    return
  }
  return runChecksCallback(app)
}
