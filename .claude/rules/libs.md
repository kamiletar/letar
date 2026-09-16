---
paths: libs/**/*
---

# Правила для библиотек

> Правило грузится при чтении файлов `libs/**/*` — здесь императив и механизм. Разборы
> инцидентов и полные замеры — в связанных доках `.claude/docs/`, ссылки стоят по месту.

⚡ **Не создавай библиотеку руками** — используй `nx g @letar/generators:new-lib <name>`, он
раскладывает всю структуру ниже (включая `tsconfig.spec.json`, обязательный для vitest 4 + vite
8 oxc) и уже сверен с актуальными `libs/format-utils`/`libs/validation-utils`. Ручной процесс
ниже — для справки/понимания, что генератор делает под капотом.

## Структура библиотеки

```
libs/my-lib/
├── src/
│   ├── index.ts          # Главный экспорт
│   └── lib/
│       ├── feature.ts    # Реализация
│       └── feature.spec.ts
├── package.json          # @letar/my-lib
├── project.json          # Nx конфигурация
├── tsconfig.json         # composite: true
├── tsconfig.lib.json
└── README.md             # Документация API
```

## package.json

```json
{
  "name": "@letar/my-lib",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

## Подключение к приложению

📍 **Это единственное место, где процедура описана полностью.** README библиотек и
`.claude/commands/create/new-lib.md` дают одну фразу «что обязательно» и ссылаются сюда —
не копируй туда подробности.

**Обязательное — одно:** библиотека должна быть в реальных `dependencies` приложения
(`workspace:*`), не только в `nx.implicitDependencies`. Причина — симлинк в
`node_modules/@letar/<lib>` под изолированным линковщиком bun: его создаёт **только**
`bun install` по записи в `dependencies`, `implicitDependencies` для bun невидим. Без симлинка
падает резолв мимо `tsconfig.paths` — `typecheck:tsgo` и vitest через sibling-spec (см.
[vitest-unlinked-workspace-lib-imports](/.claude/docs/vitest-unlinked-workspace-lib-imports.md)).

⚠️ **`nx affected` не является причиной держать `dependencies`/`implicitDependencies` в
актуальном состоянии.** Плагин `@nx/js` строит рёбра графа source-based инференсом (парсит
TS-импорты по всему воркспейсу независимо от package.json) — 10/10 эмпирических проверок
показали, что приложение было затронуто и без единой записи о библиотеке. Полный замер и что он
не покрывает (динамический `import()`, реэкспорт через баррель) —
[nx-affected-source-based-inference](/.claude/docs/nx-affected-source-based-inference.md).

**Резолв самого импорта `@letar/*` от настроек приложения не зависит.** Он держится на
`customConditions: ["@letar/source"]` в корневом `tsconfig.base.json` + `exports` с этим условием
в `libs/<name>/package.json` (генератор `new-lib` их проставляет). Поэтому `dashboard` импортирует
`@letar/forms` и `@letar/chakra-provider`, не имея для них ни одной записи в `paths`.

⚠️ **Оговорка неверна для библиотеки, у которой ни один потребитель никогда не держал её в
настоящих `dependencies`** — `customConditions` резолвит `exports`, но чтобы до них дойти,
резолверу сначала физически нужен симлинк `node_modules/@letar/<lib>`, а его создаёт только
`bun install` по записи в `dependencies`. Прецедент — `@letar/demo-protection` (aboi, domwellbes,
form-example, 2026-08-31…09-01): библиотека была заведена только через `implicitDependencies`,
`typecheck:tsgo` падал `TS2307`. Фикс — добавить пакет в реальные `dependencies` потребителя +
`bun install` из корня.

**`paths` и `references` в `tsconfig.json` приложения — вспомогательные, не обязательные.**
`paths` нужны только там, где симлинка в `node_modules` нет (подключение только через
`implicitDependencies`) — отдельной строкой на каждый подпуть, см. раздел ниже. `references`
**собирает** только `tsc --build`, а его ни одно приложение в `apps/` не запускает — рассинхрон
`paths` ↔ `references` не дефект и выравнивания «ради симметрии» не требует.

⛔ **`nx sync` этого не чинит** — `@nx/js:typescript-sync` отключён в `nx.json`
(`sync.disabledTaskSyncGenerators`), а `nx sync`/`nx sync:check` не вызываются ни в CI, ни в
git-хуках. `references` правятся руками либо не правятся вовсе. Детали и замер 2026-08-04 —
[Окружение](/.claude/docs/environment.md#разработка-shared-библиотек).

### ⚠️ `references` в `tsconfig.json` приложения — источник трёх классов typecheck-багов

«`references` не используются приложениями» верно только для сборки (`tsc --build`). Обычный
`tsc --noEmit`/`tsgo --noEmit` их **читает** — ради редиректа исходника библиотеки на её
скомпилированный `.d.ts` или на solution-конфиг. Отсюда три отдельных, но однокоренных класса
поломок:

- **tsgo редиректит на устаревший/несуществующий `.d.ts`** библиотеки с локальным `dist/`, либо
  `tsc` редиректит на solution-конфиг, который сам ссылается на несобираемый `out-tsc/spec/` —
  оба варианта, симптомы (`TS2305`, `TS6305`, `TS7006` каскадом) и фикс («убрать `references` +
  `rootDir` из `apps/<app>/tsconfig.json`») — [tsgo-tsc-stale-project-reference-redirect](/.claude/docs/tsgo-tsc-stale-project-reference-redirect.md).
- **Тот же фикс на приложении, унаследовавшем `outDir`/`rootDir` из общего пресета** (а не
  задающем их напрямую) даёт три дополнительных побочных эффекта (`TS6059`, `TS6307`, взрыв
  ошибок в `*.spec.tsx` библиотек) — [tsconfig-preset-rootdir-outdir-cascade](/.claude/docs/tsconfig-preset-rootdir-outdir-cascade.md).
- **`vitest.setup.ts` вне графа `references`** валит все тесты библиотеки разом
  (`[TSCONFIG_ERROR] Tsconfig not found`) тем же механизмом резолва по графу, не по glob —
  чек-лист из двух условий и три конкретные причины —
  [vitest-setup-file-tsconfig-graph-gap](/.claude/docs/vitest-setup-file-tsconfig-graph-gap.md).

✅ Библиотеки, заведённые генератором `new-lib`, всем трём классам не подвержены — шаблоны уже
настроены корректно. Ловушка актуальна для библиотек, заведённых руками или до появления этих
шаблонов; образец правильной настройки — `libs/forms` или `libs/admin-ui`.

## Существующие библиотеки

| Библиотека                | Описание                                                                                                                                                                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @letar/forms              | Формы, Chakra-скин (TanStack Form)                                                                                                                                                                                                                                         |
| @letar/forms-core         | Формы — framework-free ядро (Фаза 7.1): Zod-мета-движок, UIKit-контракт, форматтеры                                                                                                                                                                                        |
| @letar/forms-react        | Формы — React-композиционный слой (Фаза 7.3): `createField`, `FormGroup`, хуки поля                                                                                                                                                                                        |
| @letar/forms-shadcn       | Формы — shadcn/Radix-скин (Фаза 7.3), 47/56 полей                                                                                                                                                                                                                          |
| @letar/forms-vue          | Формы — headless Vue-слой поверх `@tanstack/vue-form`, полный паритет с React (Фаза 9 закрыта 2026-08-13), 61/61 полей                                                                                                                                                     |
| @letar/forms-vue-shadcn   | Формы — Reka UI/Vue-скин, полный паритет с React (Фаза 9 закрыта 2026-08-13), 61/61 полей                                                                                                                                                                                  |
| @letar/forms-angular      | Формы — headless Angular-слой поверх нативных `@angular/forms`, полный паритет с React/Vue (Фаза 11 закрыта 2026-08-14), 61/61 полей                                                                                                                                       |
| @letar/chakra-provider    | Chakra UI провайдер                                                                                                                                                                                                                                                        |
| @letar/yandex-metrika     | Яндекс Метрика                                                                                                                                                                                                                                                             |
| @letar/format-utils       | Форматирование дат, телефонов                                                                                                                                                                                                                                              |
| @letar/idempotency-key    | Клиентский idempotency-key одной попытки чекаута (`sessionStorage` + `crypto.randomUUID()`), см. `.claude/docs/client-idempotency-key-order-creation.md`                                                                                                                   |
| @letar/tailwind-utils     | `cn()` (clsx+twMerge) и общие Tailwind-классы примитивов — общий код `forms-shadcn`/`forms-vue-shadcn`                                                                                                                                                                     |
| @letar/ui                 | Shared UI компоненты                                                                                                                                                                                                                                                       |
| @letar/validation-utils   | Zod схемы валидации                                                                                                                                                                                                                                                        |
| @letar/email              | Email отправка через Maddy                                                                                                                                                                                                                                                 |
| @letar/form-mcp           | MCP сервер для форм (npm: @letar/form-mcp)                                                                                                                                                                                                                                 |
| @letar/generators         | Локальные Nx-генераторы (`nx g @letar/generators:e2e-suite <app>`, `new-lib <name>`, `new-app <name>`)                                                                                                                                                                     |
| @letar/zenstack-fragments | Общие ZenStack zmodel-миксины (Better Auth Account/Session/Verification) — подключаются через `import` пути в `schema.zmodel`, НЕ через TS-алиасы/`implicitDependencies`                                                                                                   |
| @letar/theme-check        | Гейт сырых UI-цветов/теней/transition (`theme:check`) — plain-JS (не TS) библиотека, см. её README за причиной                                                                                                                                                             |
| @letar/eager-jsx-check    | Гейт eager top-level JSX (`eager-jsx-check`, ловит регресс `ReferenceError: React is not defined` под tsx/esbuild) — plain-JS, подключён к forms/forms-react/forms-shadcn                                                                                                  |
| @letar/fuzzy-search       | Заповедь студии №17 — опечатки/раскладка в поиске (два прогона запроса + порог переключения), `./client` — баннер «Показаны результаты по: X». Интеграция не начата.                                                                                                       |
| @letar/url-query-state    | Заповедь студии №18 (тоглы-фасеты как настоящие `<a href>`) — кодек URL⇄состояние, `buildQueryStateHref`, `./client` — `useUrlQueryState` (App Router). Интеграция не начата.                                                                                              |
| @letar/undo-toast         | Заповедь студии №20 — `triggerUndoableAction`/`./client` `useUndoableAction`, тонкая обёртка над `createAppToaster()` из `@letar/ui`. Интеграция не начата.                                                                                                                |
| @letar/slug-resolver      | Заповедь студии №25 (адрес живёт вечно) — `resolveSlugOutcome`, `./next` `resolveSlugPage` (App Router redirect/notFound). Интеграция не начата.                                                                                                                           |
| @letar/data-export        | Заповедь студии №30 — `collectDataExport`/`runDeletionSteps`, агрегаторы произвольных колбэков без знания о моделях приложения. Интеграция не начата.                                                                                                                      |
| @letar/sse                | `createPollingSseResponse` — каркас SSE-эндпоинта на периодическом опросе (heartbeat, интервал, таймаут, cleanup на cancel()/abort). Не годится для pub/sub-эндпоинтов (данные приходят асинхронно от внешнего менеджера подписки). Первый потребитель — `driving-school`. |

## Несколько точек входа (`./server`, `./client`)

Библиотека может нести код под разные рантаймы: React-компоненты в `.` и Node-only код в
`./server` (образцы — `@letar/auth`, `@letar/pin-auth`, `@letar/image-upload`).

- Серверный код — только в `src/server/`, клиентский — в `src/client/` или `src/lib/`.
  На этом соглашении держатся правила `no-restricted-imports` в корневом `eslint.config.mjs`:
  они не пускают React/Chakra в `src/server/` и `@letar/*/server` — в клиентский код.
- Тег `type:*` в `project.json` описывает **точку входа по умолчанию** (`.`), а не всю
  библиотеку. `@nx/enforce-module-boundaries` подпути не различает вообще — для него
  `@letar/x` и `@letar/x/server` один узел графа.
- Каждый подпуть прописывается отдельной строкой в `paths` приложения-потребителя.

### ⚠️ Потребителю нужны `paths` и на **транзитивные** `@letar/*`, и на **все** их подпути

Приложение компилирует не `.d.ts` библиотеки, а её **исходники** (через `customConditions`).
Значит любой `@letar/*`-импорт, встречающийся внутри этих исходников, обязан резолвиться у
потребителя — даже если сам потребитель этот пакет не упоминает.

⚠️ **Неполный набор подпутей — мина замедленного действия.** Пока библиотека не импортировала
недостающий подпуть — всё зелёное; первое же использование кладёт всех потребителей разом.
Прецедент — Фаза 7.3 `@letar/forms` (2026-08-09): 17 приложений держали 9 подпутей
`@letar/forms-core` из 15, первое же использование `/uikit`, `/i18n`, `/address` дало каскад
`TS2307`/`TS2322`. Прописывай **полный** набор из `exports` библиотеки, а не только нужный
сегодня.

**Сторож на этот класс ловушки — `scripts/check-lib-subpath-paths.mjs`.** Сравнивает `exports`
каждой `libs/*/package.json` с `compilerOptions.paths` **обоих** типов потребителей —
`apps/*/tsconfig.json` и `libs/*/tsconfig.json`/`tsconfig.lib.json`/`tsconfig.spec.json`
(библиотеки тоже потребляют подпути друг друга): если потребитель прописал хоть один подпуть
библиотеки, скрипт требует у него **все** подпути из её `exports`. Библиотека не считается
потребителем самой себя. Запуск:

```bash
node scripts/check-lib-subpath-paths.mjs
```

Exit 0 — расхождений нет, exit 1 — печатает список неполных потребителей. Чинить —
`scripts/add-lib-tsconfig-path.mjs` или руками по списку из вывода. Зарегистрирован в общем
раннере `bun scripts/check-all.mjs` как `lib-subpath-paths` (group `tsconfig`) — но покрытие
раннера **неполное** на приватных submodule (CI их не выкачивает), для точной проверки гони
скрипт локально.

⛔ `paths` в `tsconfig.base.json` эту работу не сократят: `paths` наследуемого конфига
**перекрываются** целиком, а не мержатся — приложение со своим блоком `paths` базовый просто не
увидит.

Два побочных момента того же перехода:

- **Симлинк в `node_modules` создаёт `bun install`**, и лежит он в `<пакете>/node_modules/@letar/`,
  а не в корневом (корневого `node_modules/@letar` в этом репо нет вовсе). Добавил
  workspace-зависимость в `package.json` библиотеки — запусти `bun install`, иначе потребители
  без своих `paths` (например `dashboard`) не отрезолвят пакет.
- **Приложения на «смешанной модели» `include`** (`../../libs/X/src/**/*.ts` вместо `references`)
  требуют ещё и glob на новую библиотеку — иначе `TS6307 File is not listed within the file
  list`. Таких в репо два: `animatrona`, `label-printer-desktop`.

Подробнее (включая ловушку с `files`-глобами в ESLint 10):
[lib-entry-points.md](/.claude/docs/lib-entry-points.md).

## Правила

- Каждая библиотека должна иметь README.md с API документацией
- Используй `composite: true` в tsconfig.json
- Экспортируй всё через `src/index.ts`
- ⛔ Не полагайся на `nx sync` — в этом репо он отключён и references не обновит (см.
  «Подключение к приложению» выше)
