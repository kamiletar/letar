# Unit-тестирование (Vitest)

Паттерны конфигурации Vitest в монорепо. E2E — см. [e2e-testing](/.claude/docs/e2e-testing.md).

## ⚠️ Vite 8.1.3+ (oxc): tsconfig-покрытие обязательно для каждого файла

**Симптом:** все unit-сьюты приложения падают до запуска тестов с ошибкой:

```
[TSCONFIG_ERROR] Failed to load tsconfig for 'vitest.setup.tsx': Tsconfig not found
  Plugin: vite:oxc
```

**Причина:** с vite 8.1.3 (обновление зависимостей `a1ffb4e`, 2026-07-07; до этого vitest
использовал вложенный vite 8.0.16) oxc-трансформер `vite:oxc` резолвит tsconfig **per-file**:
файл должен быть покрыт `include` ближайшего `tsconfig.json` **или одного из его project
references** — иначе трансформация падает. В Next.js-приложениях монорепо тестовые файлы
и `vitest.setup.tsx` намеренно исключены из `tsconfig.json` (чтобы `next build`/typecheck
их не видел), поэтому после обновления все сьюты сломались.

Опция `oxc.tsconfig: false` намеренно исключена из публичного типа `OxcOptions` vite —
обход через каст не используем.

**Фикс (образец — `apps/archetest/`, commit `ffd20a8`):**

1. **`tsconfig.spec.json`** рядом с `tsconfig.json` приложения:

   ```json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "composite": true,
       "noEmit": false,
       "emitDeclarationOnly": true,
       "outDir": "./out-tsc/spec",
       "tsBuildInfoFile": "./out-tsc/spec/tsconfig.spec.tsbuildinfo",
       "jsx": "react-jsx",
       "types": ["vitest/globals", "node"]
     },
     "include": [
       "vitest.config.ts",
       "vitest.setup.tsx",
       "src/**/*.test.ts",
       "src/**/*.spec.ts",
       "src/**/*.test.tsx",
       "src/**/*.spec.tsx",
       "src/**/*.d.ts"
     ],
     "exclude": ["out-tsc", "dist", "node_modules", ".next"]
   }
   ```

2. **Reference из корневого `tsconfig.json`** приложения (первым в списке):

   ```json
   "references": [{ "path": "./tsconfig.spec.json" }, ...]
   ```

**Три подводных камня:**

- **`exclude` наследуется через `extends`** — если его не переопределить в
  `tsconfig.spec.json`, унаследованный exclude корневого tsconfig (`src/**/*.test.ts` и
  т.п.) продолжит исключать тесты, и ошибка останется. Явный `exclude` обязателен.
- **Без reference файл не найдётся** — резолвер oxc ищет только `tsconfig.json` по имени
  и ходит по его `references`. Просто положить `tsconfig.spec.json` рядом недостаточно
  (у kami/dashboard/driving-school/mandala такие файлы были — не помогали).
- **`composite: true` + `noEmit: false` + `emitDeclarationOnly: true` обязательны** —
  иначе `typecheck:tsgo` падает: TS6310 (referenced project may not disable emit) и
  TS6377 (конфликт tsbuildinfo).

**Проверка после фикса:** `nx test <app>` + `nx lint <app>` + `nx typecheck:tsgo <app>`.

**Статус тиража (2026-07-08): завершён.** Фикс применён ко всем проектам монорепо с реальными
тестовыми файлами — TSCONFIG_ERROR устранён везде, `grep -c TSCONFIG_ERROR` по полному
`nx run-many -t test` даёт 0.

Проекты с исправленным `tsconfig.spec.json` + reference: `archetest`, `kami`, `dashboard`,
`mandala`, `driving-school` (submodule — коммит внутри submodule обязателен отдельно),
`pravda`, `animatrona`, `aboi`, `label-printer-desktop`, `libs/label-printer-core`,
`libs/auth`, `libs/email`, `libs/contract-generator`.

**Особый случай — Electron-приложения (main/ исключён из корневого tsconfig.json):**
у `animatrona` и `label-printer-desktop` каталог `main/` явно в `exclude` корневого
`tsconfig.json` (main-процесс Electron не должен попадать в Next.js typecheck рендерера).
Из-за этого `include` в `tsconfig.spec.json` **не может быть ограничен только spec/test
файлами** — oxc резолвит tsconfig для каждого импортируемого файла, включая обычные source
из `main/`, которые импортирует spec. Нужно покрыть весь `main/**/*.ts` (не только
`*.spec.ts`/`*.test.ts`), иначе TSCONFIG_ERROR вылезет на исходном файле, который тестируется:

```json
"include": ["vitest.config.ts", "main/**/*.ts"]
```

**⚠️ Обратный случай — исходники ПОКРЫТЫ корневым `tsconfig.json` (образец —
`poster-microtext-desktop`, 2026-07-28):** если каталог с тестируемым кодом (`main/`,
`shared/`) уже входит в `include` корневого tsconfig приложения, дублировать его в
`include` у `tsconfig.spec.json` **нельзя**. Composite-проект объявляет себя владельцем
этих файлов, и любой другой импортёр (например `renderer/app/page.tsx`, импортирующий
`shared/`) падает на:

```
error TS6305: Output file '.../out-tsc/spec/shared/visibility-model.d.ts'
has not been built from source file '.../shared/visibility-model.ts'.
```

Коварство в том, что TS6305 ломает резолюцию типов дальше по цепочке и тянет за собой
пачку ложных `TS7006 implicit any` в файлах, которых правка вообще не касалась — легко
принять за собственную ошибку в типах.

**Правило:** в `tsconfig.spec.json` держать только то, чего нет в корневом `include` —
`vitest.config.ts` и сами spec-файлы:

```json
"include": ["vitest.config.ts", "shared/**/*.spec.ts", "main/**/*.spec.ts"]
```

Плюс исключить spec-файлы из корневого `tsconfig.json` (`"exclude": ["shared/**/*.spec.ts"]`),
иначе их увидят оба проекта. Широкий `include` из абзаца про Electron выше нужен только
когда каталог исходников в `exclude` корневого tsconfig (`animatrona`,
`label-printer-desktop`) — сначала посмотри, какой из двух случаев твой.

**Проекты без vitest вообще (не в скоупе фикса)** — есть `vitest.config.ts`, но 0 тестовых
файлов: `aira-web`, `dsperevod`, `grandslamcup`, `time`, `studio`, `svoichuzhie`, `synth`,
`aprel8008`, `animatrona-tracker`, `libs/cdek`, `libs/image-upload`, `libs/query-provider`.
Не требуют tsconfig.spec.json пока не появятся первые тесты.

**Найдена отдельная, более глубокая проблема — kami и dashboard:** у обоих нет ни
`vitest.config.ts`, ни target `test` в `project.json`. `specs/index.spec.tsx` — протухший
Nx-generated boilerplate, импортирующий несуществующий `../src/app/page` (у kami роутинг
через `[locale]/`, у dashboard `page.tsx` есть, но test target просто отсутствует).
`tsconfig.spec.json` доработан на будущее, но витест там сейчас не запускается вообще —
это отдельная задача (создать `vitest.config.ts` + target `test`, починить/удалить stale
spec), не тираж oxc-фикса.

**Найдены преэкзистентные баги тестов, не связанные с oxc** (уже проявились после фикса
tsconfig, но требуют отдельного разбора): `pravda` (не резолвятся алиасы `@letar/*` в
`vitest.config.ts`, `window.localStorage.clear is not a function`), `animatrona`
(`vi.mock` не возвращает `initTorrentService`), `label-printer-desktop`
(`Logger not initialized`), `driving-school:typecheck` (TS6305 — устаревший `dist` у
`libs/driving-school-db`, TS7006 implicit any в незакоммиченном коде), `label-printer-desktop:typecheck`
(отсутствует сгенерированный `schema.ts` — нужен `zenstack:generate`).

## Executor `@nx/vite:test` удалён в @nx/vite 23 — миграция на `@nx/vitest:test`

При обновлении `@nx/vite` до 23.x executor `@nx/vite:test` пропал
(`Cannot find executor 'test' in .../@nx/vite/executors.json`). Затронутые `project.json`:
`libs/form-mcp`, `libs/letar-consultant`, `libs/email`, `libs/label-printer-core`,
`apps/label-printer-desktop`.

**Фикс:** заменить executor на `@nx/vitest:test` (опция `passWithNoTests` в новой схеме
отсутствует — просто убрать; вместо `config`/`configFile` можно передать
`options.config: "<path>/vitest.config.ts"`). Для `form-mcp` и `letar-consultant` (нет
тестовых файлов) target `test` целиком удалён — Nx сам не подхватывает пустой executor без
смысла держать.

## Диагностика: nx прячет вывод vitest

`nx test <app>` при падении executor'а может не показывать вывод vitest даже с `--verbose`.
Запускай vitest напрямую из папки приложения:

```powershell
Set-Location apps/<app>; bun run vitest run
```
