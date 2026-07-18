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

## Разработка нового генератора

1. `mkdir src/generators/<name>`, добавь `generator.ts` + `schema.json`/`schema.d.ts` + `files/`
   (шаблоны с суффиксом `__tmpl__`, dotfiles — `__dot__<name>__tmpl__`, EJS-синтаксис `<%= var %>`)
2. Зарегистрируй в `generators.json`
3. Покрой тестом на `createTreeWithEmptyWorkspace()` (см. `e2e-suite/generator.spec.ts`)
