# Публикация npm-пакета из монорепо (`build:npm`)

Как устроен конвейер сборки библиотеки для npm на примере `@letar/forms`. Все библиотеки с
таргетом `build:npm` собраны по одной схеме — описанное здесь применимо к любой из них и к новым
публикуемым пакетам.

⚠️ **До 2026-09-03 здесь стояло «таргет `build:npm` есть ещё у `@letar/form-mcp` и
`@letar/zenstack-form-plugin`. Все три…».** На момент правки их было четыре — добавился
`@letar/forms-shadcn` (`libs/forms-shadcn/project.json` заведён 2026-08-10). Перечисление в тексте
отстаёт от репозитория по построению; считай список командой:

```bash
grep -l '"build:npm"' libs/*/project.json apps/*/project.json
```

<!-- doc-count: {"cmd": "grep -l '\"build:npm\"' libs/*/project.json apps/*/project.json | wc -l", "expect": 19} -->

Отдельно: наличие `build:npm` ≠ пакет опубликован. Что реально уходит на npm, задаёт реестр
[scripts/data/npm-published-packages.json](/scripts/data/npm-published-packages.json) — шесть пакетов
волны 1 (решение владельца, 2026-10-18), порядок в файле — порядок публикации:

| Пакет (тег)            | Зависит от (опубликованного) | Что проверяет smoke |
| ---------------------- | ---------------------------- | ------------------- |
| `forms-core`           | —                            | Next, Vite          |
| `forms-react`          | `forms-core`                 | Next, Vite          |
| `forms`                | `forms-core`, `forms-react`  | Next, Vite          |
| `forms-query`          | `forms-core`                 | Vite                |
| `zenstack-form-plugin` | —                            | ZenStack-генерация  |
| `form-mcp`             | —                            | MCP по stdio        |

Остальные библиотеки с `build:npm` (скины shadcn/Vue/Angular, `number-words` и др.) в волну не входят:
тегов у них нет, публиковать их пока нельзя. Список тегов в [publish-npm.yml](/.github/workflows/publish-npm.yml)
обязан совпадать с реестром — это проверяет gate `npm-package-integrity` (`bun scripts/check-all.mjs --only=npm-package-integrity`).

У `form-mcp` до 2026-09-26 в `package.json` стояло `"private": true` (наследие первого коммита; на публикацию
не влияло — на npm уходит `dist/package.json`, собранный из `package.publish.json`). Владелец решил публиковать:
флаг убран. На npm при этом лежат только `1.0.0`/`1.0.1` (2026-03-31), версии `2.x` не выходили.

## Как выпустить версию

Публикует только CI по тегу, из `libs/<пакет>/dist` — по OIDC, без токена npm. Тег ставит владелец
(решение D5): агент до push и тега не доходит.

1. **Версия и журнал.** Поднять `version` в `libs/<пакет>/package.json`, добавить запись в `libs/<пакет>/CHANGELOG.md`.
   Версия растёт и в `bun.lock` — `bun scripts/check-lock-workspace-versions.mjs --index`, при расхождении
   `bun install --lockfile-only` отдельным коммитом (иначе `--frozen-lockfile` на сервере роняет деплой всех приложений).
2. **Проверка локально** (не обязательна, но дёшево — CI повторит то же самое):

   ```bash
   node scripts/npm-release-preflight.mjs --project <тег-пакета> --skip-registry
   node scripts/npm-smoke.mjs --only=next,vite     # части: next, vite, zenstack, mcp
   ```

3. **Коммит и push** в `main` (только по решению владельца).
4. **Тег `<тег-пакета>-v<версия>`** — ровно версия из `package.json`:

   ```bash
   git tag forms-core-v0.31.0 && git push origin forms-core-v0.31.0
   ```

   Порядок тегов — по таблице выше: зависимость должна быть уже в npm, иначе preflight откажет с текстом
   «сначала опубликуй @letar/forms-core …». Для `forms` порядок такой: `forms-core` → `forms-react` → `forms`.
5. **CI** (`publish-npm.yml`, два job): `build` без прав на публикацию — сборка, `check-npm-package-integrity
   --build --publint`, проверка реестра npm, smoke в чистых проектах; `publish` получает только готовый dist,
   сверяет манифест и делает `npm publish --provenance --tag next`, затем GitHub release.
6. **Проверить** страницу пакета на npmjs.com: значок provenance, dist-tag `next`.

**Канал `next`.** Все версии волны 1 выходят в dist-tag `next` (решение D3). Перевод в стабильный канал — вручную:

```bash
npm dist-tag add @letar/forms-core@0.31.0 latest
```

⚠️ Тег передаётся в `npm publish --tag` явно: npm 11.6 **не применяет** `publishConfig.tag` из `package.json`
(в `--dry-run` пишет «with tag latest»). Без явного `--tag` первая публикация ушла бы в `latest`.

**Ручной запуск** (`workflow_dispatch`, поля `project` и `dry_run`). По умолчанию `dry_run: true`: сборка, проверки,
smoke и `npm publish --dry-run`; реестр npm в этом режиме не опрашивается (зависимости могут быть не опубликованы).
Реальную публикацию делает только тег.

**Проверки на PR** — workflow `npm-packages.yml` (пути шести пакетов и скриптов выпуска): целостность + smoke,
ничего не публикует и не имеет `id-token`.

**Lockfile в CI: подмножество вместо `--frozen-lockfile`.** CI не выкачивает приватные submodule, поэтому
`bun install` там переписывает `bun.lock` (убирает workspace приватных приложений и их зависимости), а с
`--frozen-lockfile` падает. Без frozen bun мог бы молча поставить другую версию любой зависимости, а из этих
`node_modules` собирается то, что уходит в npm. Поэтому после установки в `ci.yml`, `npm-packages.yml` и
`publish-npm.yml` стоит шаг `node scripts/check-lock-subset.mjs`: новый `bun.lock` обязан быть подмножеством
закоммиченного (записи удалять можно, добавлять и менять нельзя). Он ловит новый пакет, другую версию, другой
`integrity`, изменённый workspace и другой формат lock (то есть не ту версию bun: она закреплена `1.4.3` во всех
трёх workflow, менять вместе). Пакеты сравниваются по `ident` + `integrity`, а не по ключу: bun переподнимает
вложенные копии (`a/dep` → `dep`). Токен на выкачку приватных submodule не берём: это секрет с доступом к
приватному коду в job, который исполняет код зависимостей. Локально: `node scripts/check-lock-subset.mjs`
(`--base <ref>`, `--lock <путь>`), тесты — `bun test scripts/check-lock-subset.test.mjs`.

## Один раз руками (владелец)

Автоматикой это сделать нельзя: нужны аккаунт и двухфакторный вход.

1. **Три новых имени на npm** — `@letar/forms-core`, `@letar/forms-react`, `@letar/forms-query`. Trusted Publisher
   настраивается только у существующего пакета, поэтому первую версию публикуют руками:

   ```bash
   npm login                       # 2FA
   cd libs/forms-core/dist && npm publish --access public --tag next
   ```

   (то же для `forms-react`, `forms-query`; dist собирается `nx run @letar/<pkg>:build:npm`). Публикуй
   по порядку из таблицы. Версии уже совпадают с `package.json`, повторно тегом их публиковать не надо.
2. **Trusted Publisher для всех шести пакетов.** npmjs.com → пакет → Settings → Trusted Publisher → GitHub Actions:
   owner `kamiletar`, repository `letar`, workflow `publish-npm.yml`, environment — пусто.
3. **Удалить секрет `NPM_TOKEN`** в настройках репозитория GitHub: новый workflow им не пользуется.
4. **Первый настоящий выпуск** — тегом по порядку; перед ним — `workflow_dispatch` с `dry_run: true` по каждому пакету.

## Что проверяют `check-npm-package-integrity` и smoke

`node scripts/check-npm-package-integrity.mjs [--build] [--only=<тег>] [--publint]` — по собранному `dist`:
каждый импорт объявлен в `dependencies`/`peerDependencies`; манифест (без `workspace:`, `tag: next`, `access: public`,
версия из `package.json`, LICENSE/README); все точки входа существуют; `'use client'` в клиентских файлах (и нет
в нейтральных — список в реестре); в пакете нет имён приватных приложений; **optional peer не достижим из корневого
entry** (см. ниже); `publint` и `@arethetypeswrong/cli` (версии закреплены в скрипте, ставятся через `bunx`, в
`devDependencies` корня их нет).

`node scripts/npm-smoke.mjs [--build] [--only=next,vite,zenstack,mcp] [--keep]` — собирает tarball'ы (`npm pack`),
ставит их в чистые проекты из [scripts/npm-smoke](/scripts/npm-smoke) вне монорепо (временный каталог, свой
`node_modules`), собирает/запускает:

- **Next.js** — `next build` с серверным `page.tsx`, который импортирует `<Form>`: директива `'use client'` дошла до пакета;
- **Vite** — сборка + проверка, что в дереве одна копия `forms-core`/`forms-react` (две копии = два контекста форм);
- **ZenStack** — `zenstack generate` с плагином из tarball (схема с `@meta("form.title", …)`) и `tsc --noEmit` по сгенерированным схемам;
- **MCP** — запуск `form-mcp` по stdio, `initialize` + `tools/list` + `list_fields`.

Плюс `tsc` на потребителе: положительный контроль и **негативный** (`name={42}` обязан дать ошибку, иначе типы стали `any`).

### Находки, ради которых проверки написаны именно так

- **Optional peer ≠ необязательный для сборки.** Turbopack и webpack разрешают **все** импорты собираемых файлов,
  включая лениво подгружаемые чанки (`import('./chunk.js')`) и даже внешний `import('pkg')`; Vite/rolldown падает
  на статическом импорте. Легально держать optional только то, что лежит в **отдельном subpath-entry**, не
  достижимом из корневого. Так устроен `@letar/forms` 3.0: `@tiptap/*`, `@dnd-kit/*`, `@tanstack/react-table`,
  `@tanstack/react-virtual` и `@uiw/react-json-view` — optional peer подпутей `rich-text`, `data-grid`,
  `table-editor`, `sortable`, `debug`; обязательных peer шесть; `@marsidev/react-turnstile` не нужен (Turnstile грузит
  скрипт сам). До 3.0 эти пакеты были обычными peer, потому что ядро ссылалось на них. Правило «ядро не тянет
  optional peer» и регистрация полей — [forms-pluggable-fields-optional-peers](/.claude/docs/forms-pluggable-fields-optional-peers.md).
- **RSC и составные компоненты.** Из серверного компонента нельзя «входить» в клиентский модуль:
  `<Form.Field.String />` в серверном `page.tsx` даёт `undefined` (dot-into client module). Серверный
  `page.tsx` может отрендерить `<Form>`, а поля лежат в клиентском файле — так устроена фикстура Next.
- **`@uiw/react-json-view`** имеет только `2.0.0-alpha.*` — peer `>=2.0.0` не удовлетворялся ни одной версией (ETARGET);
  диапазон `>=2.0.0-alpha.0`. Preflight ловит такие случаи: `npm view <пакет>@<диапазон>` для каждой зависимости.
- **TypeScript 6**: `types` по умолчанию пустой — фикстуры задают `"types": ["node"]`; `skipLibCheck: true`, а строгий
  проход (`skipLibCheck: false`) идёт отдельно и только информационно: шум в `@chakra-ui`/`zag-js` не наш.
- **Windows**: диапазон `>=3.0.0` в аргументе команды через shell становится перенаправлением вывода в файл —
  в скриптах версию в кавычки (так был найден и исправлен `npm-release-preflight`).

## Волна 1 (2026-09-30): 16 библиотек (исторический набор)

Конвейер `build:npm` заведён у 16 библиотек: `forms-core`, `forms-react`, `forms-vue`, `forms-angular`,
`forms-shadcn`, `forms-vue-shadcn`, `forms-query`, `number-words`, `semver-compare`, `pg-url`, `sse`,
`url-query-state`, `fuzzy-search`, `slug-resolver`, `idempotency-key`, `upload-validation`. Теги релизов заведены только для шести пакетов (см. выше); остальные из этого набора не публикуются.

- `publishConfig: { access: 'public', tag: 'beta' }` лежит в `package.publish.json` (так генерирует `npm-publish`); у шести публикуемых пакетов (см. выше) тег — `next`, CI передаёт его в `npm publish --tag` явно.
- Слои forms — **опубликованные peer-зависимости**, не инлайн: `@letar/forms-core` (`>=0.28.0 <1`) у всех,
  `@letar/forms-react` у `forms-shadcn`, `@letar/forms-vue` у `forms-vue-shadcn`. В рабочем `package.json`
  они лежат в `devDependencies` (`workspace:*`). Порядок публикации: `forms-core` → `forms-react`/`forms-vue` →
  скины. Причина отказа от инлайна: два экземпляра React-контекста форм у потребителя.
  `@letar/tailwind-utils` не публикуется и по-прежнему инлайнится (`noExternal`).
- Рабочий `package.json` получил `"type": "module"`: без него tsup называет выход `.mjs`/`.d.mts`, а
  `exports` в `package.publish.json` ждёт `.js`/`.d.ts`.
- ⚠️ Перенос `@letar/*` из `dependencies` в `devDependencies` меняет `bun.lock`: сразу
  `bun install --lockfile-only` и коммит lock, иначе `--frozen-lockfile` роняет деплой всех приложений.
- ⚠️ Сборка нашла необъявленную зависимость: `upload-validation` импортирует `next/server` без `next` в
  peer, и tsup молча **вбандлил куски Next.js** в пакет. Проверка: `grep -c "__commonJS" dist/index.js` и
  сверка импортов `src/` с `peerDependencies`.
- ⚠️ `'use client'` при сборке tsup отбрасывается (предупреждение «Module level directives»), у `forms-shadcn`
  это было и раньше. Потребитель с App Router импортирует поля из клиентских компонентов.
- ⚠️ `forms-angular` собирается tsup как JIT (`experimentalDecorators`, inline-шаблоны): потребителю нужен
  `@angular/compiler` в рантайме; AOT-пакет (ng-packagr) не делался. Пакет помечен proof-of-concept.

## Конвейер целиком

```
package.json (версия — источник истины)
        │
        ▼
tsup.config.ts (сборка JS-бандла + .d.ts)
        │
        ▼
package.publish.json (шаблон метаданных для npm, БЕЗ версии)
        │
        ▼
scripts/write-publish-package-json.mjs — общий, в корне (мёржит версию из package.json в шаблон)
        │
        ▼
dist/package.json + dist/*.js + dist/*.d.ts → npm publish
```

Таргет `build:npm` (`libs/forms/project.json`) выполняет шаги строго последовательно
(`parallel: false`):

```
tsup
node ../../scripts/write-publish-package-json.mjs
cp README.en.md dist/README.md
cp README.md dist/README.ru.md
cp CHANGELOG.md dist/
cp LICENSE dist/
```

**Зачем два `package.json`.** `libs/forms/package.json` — рабочий файл для монорепо:
`main`/`types` указывают на `src/index.ts` (Nx резолвит библиотеку по исходникам через
`customConditions: ["@letar/source"]`, см. [lib-entry-points.md](/.claude/docs/lib-entry-points.md)),
а `exports` несёт условие `@letar/source` рядом со стандартными `types`/`import`.
`package.publish.json` — отдельный шаблон **только** для npm: `exports` там уже указывает
на скомпилированные `./index.js`/`./index.d.ts` в корне `dist/`, никакого
`@letar/source`-условия и никаких путей внутрь `src/`. Смешивать их в один файл нельзя —
у монорепо и у npm-потребителя разное представление о том, где лежит код.

**Зачем отдельный скрипт вместо голого `cp`.** До 2026-08-09 `dist/package.json` собирался
`cp package.publish.json dist/package.json`, а `package.publish.json` нёс собственное поле
`version`, вручную обновляемое кем-то отдельно от `package.json` библиотеки — оно тихо
отставало (см. инцидент ниже). `write-publish-package-json.mjs` читает `version`
исключительно из `package.json` и мёржит его в шаблон при каждой сборке — рассинхрон
структурно невозможен, потому что `package.publish.json` версии не хранит вовсе.

## Чек-лист: заводишь новый публикуемый пакет или добавляешь ему внутреннюю зависимость

**Новый пакет** — одной командой (библиотека уже существует, см. `new-lib`):

```bash
nx g @letar/generators:npm-publish <lib> [--formsCorePeer] [--keywords=a,b] [--description="..."]
```

Генератор кладёт `tsup.config.ts` (один entry `index`), `tsconfig.publish.json`, `package.publish.json`
(без `version`, `publishConfig` beta, внешние `dependencies`/`peerDependencies` из рабочего
`package.json`), `LICENSE`, таргеты `build:npm`/`publish:npm`, ставит `"type": "module"` и переносит
`@letar/*` из `dependencies` в `devDependencies` (после этого — `bun install --lockfile-only` и
коммит lock). `--formsCorePeer` добавляет `@letar/forms-core` peer `>=0.28.0 <1`. Существующую
публикацию (`tsup.config.ts` уже есть) генератор не перезаписывает. **Руками остаётся:** subpath-entry
в `tsup.config.ts` и `exports` (образец — `libs/forms-core`), `external` для peer-зависимостей,
сверка импортов `src/` с `peerDependencies` (см. ловушку про `upload-validation` выше).

Что генератор делает за тебя, если собирать вручную:

1. `package.json` — рабочий, `main`/`types`/`exports` через `@letar/source` (как у любой библиотеки,
   см. [libs.md](/.claude/rules/libs.md)).
2. `package.publish.json` — шаблон для npm: `exports` на плоские `./index.js` + `./index.d.ts`
   (пара на каждый subpath-entry), `files`, `keywords`, `repository`, `peerDependencies`. **Без `version`.**
3. Скрипт `write-publish-package-json.mjs` **общий**: `scripts/write-publish-package-json.mjs` в корне,
   копий в библиотеках нет. Запускается из `cwd` библиотеки: `node ../../scripts/write-publish-package-json.mjs`;
   корень берёт из `process.cwd()`, без `dist/` падает.
4. `tsup.config.ts` — `entry` под все subpath-экспорты, `dts: true` (или `dts: { resolve: [...] }`),
   `format: ['esm']`, `external` на всё, что потребитель ставит сам.
5. `build:npm` — `tsup → write-publish-package-json.mjs → cp README/CHANGELOG/LICENSE`,
   `parallel: false`; в `inputs` скрипт указан как `{workspaceRoot}/scripts/write-publish-package-json.mjs`.

**Новая внутренняя `@letar/*`-зависимость у уже публикуемого пакета** (например
композиционный слой вроде `forms-core`/`forms-react`, который существует только как
workspace-пакет и не публикуется отдельно):

1. **Кладётся в `devDependencies`, не в `dependencies`.** Это единственная строка, которую
   легко перепутать, и единственная, которая не ломает саму сборку — только установку
   готового пакета (см. инцидент §45 ниже). Причина — как `tsup` строит список `external`
   для отдельного dts-прохода: он берёт `dependencies + peerDependencies` из `package.json`
   (`getProductionDeps`) и помечает всё оттуда внешним **до** того, как отрабатывают
   плагины. Пока внутренний пакет лежит в `dependencies`, dts-резолвер для него просто не
   вызывается — неважно, что настроено дальше.
2. Добавляется в `noExternal` в `tsup.config.ts` — это заставляет JS-бандл инлайнить его
   код целиком, а не оставлять `import` на несуществующий в npm пакет.
3. Добавляется в `dts.resolve` (регэкспом на весь скоуп, `[/^@letar\//]`, или точным именем)
   — это позволяет dts-проходу (`rollup-plugin-dts`) инлайнить типы внутреннего пакета в
   генерируемые `.d.ts`, а не оставлять в них `import type ... from '@letar/forms-core'`.

**`noExternal` и `dts.resolve` решают разные половины одной и той же проблемы и не
подменяют друг друга:** `noExternal` действует только на JS-бандл (рантайм), `dts.resolve`
— только на декларации типов (отдельный проход rollup). Оба нужны одновременно. И оба
бессильны, пока пакет остаётся в `dependencies` — шаг 1 выше первичен по отношению к 2 и 3,
не наоборот.

## Как проверить, что публикация реально работает

«`nx run "@letar/<pkg>:build:npm"` зелёный» — не доказательство. Он подтверждает только
что сборка не упала; ни рантайм-резолв внешним потребителем, ни валидность сгенерированных
`.d.ts` он не проверяет (ровно так прошёл мимо инцидент §45 ниже — сборка была зелёной,
пакет был непригоден к установке).

Рабочий рецепт — собрать пакет, запаковать его как npm его увидит, поставить в проект **вне
монорепо** (свой `node_modules`, без `@letar/source`-условия и без workspace-симлинков) и
прогнать `tsc` на минимальном коде-потребителе:

```bash
nx run "@letar/forms:build:npm" --skip-nx-cache
cd libs/forms/dist
npm pack                          # → letar-forms-<version>.tgz

# в отдельном scratch-проекте вне монорепо (своя package.json, свой node_modules)
npm install /путь/к/letar-forms-<version>.tgz react react-dom @chakra-ui/react ...
```

Минимальный `check.ts` в scratch-проекте, компилируемый `tsc --noEmit`:

```typescript
import { Form } from '@letar/forms'
import { Form as PhoneForm } from '@letar/forms/fields/specialized'

// Позитивный контроль: внешняя peer-зависимость (react) осталась настоящим импортом,
// а не оказалась случайно инлайнена внутрь бандла.
// Позитивный контроль: subpath-экспорт резолвится и типизирован, не `any`.
const valid = <Form.Field.String name="title" label="Название" />

// Негативный контроль: заведомо неверный проп ОБЯЗАН дать TS2322.
// Если tsc молчит — типы не настоящие, где-то по пути всё превратилось в `any`.
const invalid = <Form.Field.String name="title" label={42} />
```

```bash
tsc --noEmit check.tsx
```

Ожидаемый результат: `check.tsx` падает ровно на строке с `label={42}` с `TS2322`, и ни на
одном импорте `@letar/*`. Если `tsc` молчит вообще — типы стали `any` где-то в цепочке
(частый симптом: dts-резолв не сработал, но модуль всё равно скомпилировался как `any` из-за
отсутствующего файла деклараций). Если падает на самих `@letar/*`-импортах — они не
инлайнились в `.d.ts`, ищи внутренний пакет в `dependencies` (см. чек-лист выше).

## Инциденты, из-за которых чек-лист написан именно так

- **2026-08-09, `libs/forms/PLAN_COMPLETED.md` «Фикс рассинхрона версии в build:npm»** —
  `package.publish.json` нёс собственное поле `version` (`1.2.0`), не связанное с реальной
  версией библиотеки (`1.4.8`). Прямая публикация ушла бы на npm с устаревшей версией. Фикс
  — версия убрана из шаблона целиком, `dist/package.json` теперь всегда собирает
  `write-publish-package-json.mjs` из `package.json`.
- **2026-08-10, `PLAN-JOURNAL-1.md` §45, `libs/forms/PLAN_COMPLETED.md` «Фикс публикации типов»** —
  сборка (`build:npm`) была зелёной, но сгенерированные `.d.ts` содержали
  `import ... from '@letar/forms-core/...'` — пакета, которого в npm нет. Причина —
  `@letar/forms-core`/`@letar/forms-react` лежали в `dependencies`, из-за чего `tsup`
  помечал их внешними для dts-прохода ещё до того, как `dts.resolve` успевал сработать.
  Обнаружено не сборкой, а ручной проверкой `npm pack` → установка в чистый проект →
  `tsc --noEmit`. Фикс — оба пакета переехали в `devDependencies`.
- **2026-08-10, `PLAN-JOURNAL-1.md` §44** — смежный, но не идентичный инцидент: тот же переход на
  `@letar/forms-react` сломал typecheck **внутри монорепо** (17 приложений-потребителей без
  полного набора `paths`) — про потребителей монорепо см.
  [lib-entry-points.md](/.claude/docs/lib-entry-points.md#подключение-к-приложению) и
  [libs.md](/.claude/rules/libs.md#подключение-к-приложению). §45 (этот документ) — про
  внешнего npm-потребителя, у которого нет ни `paths`, ни `@letar/source`-условия вообще;
  два разных механизма резолва, две разные проверки, легко перепутать один симптом с другим.

## Ссылки

- [libs/forms/tsup.config.ts](/libs/forms/tsup.config.ts) — комментарии прямо в конфиге
  объясняют `noExternal`/`dts.resolve` тем же текстом, что и здесь.
- [scripts/write-publish-package-json.mjs](/scripts/write-publish-package-json.mjs) — общий скрипт сборки `dist/package.json`
- [libs/generators/README.md § npm-publish](/libs/generators/README.md) — генератор конвейера
- [verification-pitfalls.md](/.claude/docs/verification-pitfalls.md) — общий принцип
  «проверять тем путём, которым ходит настоящий потребитель», из которого следует рецепт
  проверки выше.
- [lib-entry-points.md](/.claude/docs/lib-entry-points.md) — резолв `@letar/*` **внутри**
  монорепо (`paths`, `exports`, теги) — смежная, но отдельная механика от резолва npm-пакета
  внешним потребителем, описанного здесь.
