# @letar/generators

Локальный Nx-плагин с генераторами для монорепо `letar`. Не публикуется в npm — существует только
как workspace-пакет для `nx generate`.

## Генераторы

### `e2e-suite`

Скаффолдит новый Playwright e2e-сьют `apps/<app>-e2e` по конвенции, уже принятой в монорепо
(идентична `time-e2e`/`pravda-e2e`): `package.json` (`implicitDependencies`), `tsconfig.json`,
`eslint.config.mjs`, `playwright.config.ts` (baseURL/webServer на dev-порт приложения, три
браузерных проекта chromium/firefox/webkit), `.gitignore` (исключает `playwright/.auth/` —
cookie-сессии storageState — и артефакты прогонов), стартовый `src/homepage.spec.ts`.

```bash
nx g @letar/generators:e2e-suite <app>
# или с явным портом, если apps/<app>/.env не содержит PORT=
nx g @letar/generators:e2e-suite <app> --port=3033
```

Порт по умолчанию читается из `apps/<app>/.env` (`PORT=<число>` — единственное, что там должно
быть, см. `.claude/rules/env-files.md`).

**Генератор не перезаписывает существующие сьюты** — если `apps/<app>-e2e` уже есть, падает с
понятной ошибкой.

⚠️ **После генерации:** `nx e2e <app>-e2e` может зависнуть намертво в dev-режиме Next.js — см.
[`.claude/docs/e2e-testing.md`](/.claude/docs/e2e-testing.md) § «nx e2e зависает в dev-режиме» за
обходным путём (прогон `bunx playwright test` напрямую против вручную поднятого dev-сервера).

### `electron-app`

Скаффолдит новое минимальное Electron/Nextron-приложение `apps/<name>` — тот же каркас, что
руками собирался для `apps/poster-microtext-desktop`: Electron main + Next.js renderer
(статический экспорт `output: 'export'`, без сервера внутри приложения, вся логика через IPC),
Chakra UI v3, `webpack.config.js`/`electron-builder.yml`/`nextron.config.js` с уже впаянными
фиксами известных граблей (см. [`.claude/rules/electron.md`](/.claude/rules/electron.md) §
«Грабли»): `assetPrefix: './'` под `file://`, точная версия electron, `publish: null`.

```bash
nx g @letar/generators:electron-app <name>
# с явным displayName/description/private:
nx g @letar/generators:electron-app <name> --displayName="Моё приложение" --private
```

Версия `electron`/`electron-builder` в сгенерированном `package.json` берётся из корневого
`package.json` монорепо (диапазон `^x.y.z` пиннится до точной версии — electron-builder не умеет
скачивать бинарник по диапазону).

**Генератор не перезаписывает существующие приложения** — если `apps/<name>` уже есть, падает с
понятной ошибкой.

⚠️ **После генерации:** сгенерированное приложение — минимальный работающий каркас без бизнес-логики
(экран показывает только версию Electron). Дальше: заменить иконку, дописать `main/services/` и
`main/ipc/*.handlers.ts`, при необходимости завести приватный submodule — все шаги описаны в
сгенерированном `README.md`. Nextron не поддерживает `nx generate` из коробки — второй референс для
более сложного приложения (БД, автообновление, сканер) — `apps/label-printer-desktop`.

## Разработка нового генератора

1. `mkdir src/generators/<name>`, добавь `generator.ts` + `schema.json`/`schema.d.ts` + `files/`
   (шаблоны с суффиксом `__tmpl__`, dotfiles — `__dot__<name>__tmpl__`, EJS-синтаксис `<%= var %>`)
2. Зарегистрируй в `generators.json`
3. Покрой тестом на `createTreeWithEmptyWorkspace()` (см. `e2e-suite/generator.spec.ts`)
