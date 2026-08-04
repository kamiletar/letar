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
`libs/auth`, `libs/email`, `libs/contract-generator`, `studio` (2026-07-28, первые тесты
биллинга/интеграции Точка Банк — заодно потребовался alias `@letar/email` в `vitest.config.ts`,
которого не хватало для резолва в тестах server actions), `grandslamcup` (2026-08-04, первый
реальный тест — `album.action.spec.ts` на path traversal при перемещении обложки альбома).

**⚠️ Отсутствие `TSCONFIG_ERROR` у конкретного приложения — не доказательство, что фикс не
нужен.** У `grandslamcup` первый тест (2026-08-04) прошёл БЕЗ `tsconfig.spec.json` — расследование
показало, что не потому что `@nx/vitest:test`-executor как-то иначе резолвит tsconfig, а потому
что bun хоистит **разные версии vite** в разные `node_modules/.bun/` в зависимости от графа
зависимостей: у `grandslamcup` вложенный vitest резолвировал `vite@8.2.0` (баг не воспроизводится),
у `archetest` в то же самое время — `vite@8.1.3` (баг воспроизводится, проверено эмпирически —
временное отключение его `tsconfig.spec.json` тут же вернуло `TSCONFIG_ERROR` на
`vitest.setup.tsx`). Какую версию получит конкретное приложение — решает `bun install`/lockfile,
не архитектура приложения; это может измениться при следующей переустановке зависимостей.
**Правило:** писать `tsconfig.spec.json` для любого приложения с реальными тестовыми файлами
превентивно, по образцу (`archetest`/`mandala`), не дожидаясь фактического `TSCONFIG_ERROR` —
его отсутствие сегодня ничего не гарантирует на завтра.

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
файлов: `aira-web`, `dsperevod`, `time`, `svoichuzhie`, `synth`,
`aprel8008`, `animatrona-tracker`, `libs/cdek`, `libs/image-upload`, `libs/query-provider`.
Не требуют tsconfig.spec.json пока не появятся первые тесты. (`grandslamcup` получил первый тест
2026-08-04 и переехал в список исправленных выше.)

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

## `jose` (SignJWT/RS256) в jsdom-окружении — кросс-реалмный `Uint8Array`

**Симптом:** тест, подписывающий JWT через `new SignJWT(payload).sign(privateKey)` в файле с
`environment: 'jsdom'` (глобальный или из `vitest.config.ts`), падает внутри `jose` с
`TypeError: payload must be an instance of Uint8Array` — хотя точно такой же код в чистом
Node/Bun-скрипте (без vitest) отрабатывает без ошибок.

**Причина:** `vitest.setup.tsx` многих приложений переопределяет `global.TextEncoder`/`TextDecoder`
Node-реализацией из `node:util` (полифил для jsdom, где их изначально нет). В jsdom-окружении
`global.Uint8Array` — это конструктор из jsdom-реалма, а `TextEncoder.encode()` из `node:util`
возвращает `Uint8Array` из **Node-реалма**. Это два разных объекта-конструктора, и `instanceof`
между реалмами всегда `false`. `crypto.subtle.encrypt/decrypt` (AES-GCM в `tochka/auth.ts`)
такой проверки не делает и работает нормально в обоих реалмах — но `jose`'s `FlattenedSign`
делает явный `payload instanceof Uint8Array` и падает.

**Фикс:** для spec-файла, который реально подписывает/проверяет JWT через `jose`, переключить
окружение на `node` директивой в первой строке файла — `vitest.setup.tsx` там всё равно
выполнится, но `global.Uint8Array` и результат `TextEncoder.encode()` будут из одного (Node)
реалма:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'
```

Не трогать глобальный `environment` в `vitest.config.ts` — он нужен jsdom большинству React-тестов
приложения; переопределять по месту, только для файлов с реальной RS256/JWT-криптографией
(образец: `apps/studio/src/lib/tochka/webhooks.test.ts`, 2026-07-28).

## Диагностика: nx прячет вывод vitest

`nx test <app>` при падении executor'а может не показывать вывод vitest даже с `--verbose`.
Запускай vitest напрямую из папки приложения:

```powershell
Set-Location apps/<app>; bun run vitest run
```
