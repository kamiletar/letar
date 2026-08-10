# Публикация npm-пакета из монорепо (`build:npm`)

Как устроен конвейер сборки библиотеки для npm на примере `@letar/forms` — сейчас
единственной библиотеки, реально ушедшей на npm; таргет `build:npm` есть ещё у
`@letar/form-mcp` и `@letar/zenstack-form-plugin`. Все три собраны по одной схеме —
описанное здесь применимо к любой из них и к новым публикуемым пакетам.

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
scripts/write-publish-package-json.mjs (мёржит версию из package.json в шаблон)
        │
        ▼
dist/package.json + dist/*.js + dist/*.d.ts → npm publish
```

Таргет `build:npm` (`libs/forms/project.json`) выполняет шаги строго последовательно
(`parallel: false`):

```
tsup
node scripts/write-publish-package-json.mjs
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

**Новый пакет:**

1. `package.json` библиотеки — рабочий, с `main`/`types`/`exports` через `@letar/source`
   (как у любой другой библиотеки монорепо, см. [libs.md](/.claude/rules/libs.md)).
2. `package.publish.json` рядом — шаблон для npm: `exports` на плоские `./index.js` +
   `./index.d.ts` (и по одной паре на каждый subpath-entry из `tsup.config.ts`), `files`,
   `keywords`, `repository`, `peerDependencies`. **Без поля `version`.**
3. `scripts/write-publish-package-json.mjs` — либо скопировать из `libs/forms/scripts/`,
   либо переиспользовать логику: читает `version` из `package.json`, мёржит в шаблон,
   пишет `dist/package.json`.
4. `tsup.config.ts` — `entry` под все subpath-экспорты, `dts: true` (или `dts: { resolve:
   [...] }`, см. ниже), `format: ['esm']`, `external` на всё, что потребитель ставит сам
   (React, UI-библиотеки, опциональные peer-зависимости).
5. Таргет `build:npm` в `project.json` — `nx:run-commands`, шаги строго
   `tsup → write-publish-package-json.mjs → cp README/CHANGELOG/LICENSE`, `parallel: false`
   (порядок важен: `write-publish-package-json.mjs` требует, чтобы `dist/` от `tsup` уже
   существовал).

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
- **2026-08-10, `PLAN.md` §45, `libs/forms/PLAN_COMPLETED.md` «Фикс публикации типов»** —
  сборка (`build:npm`) была зелёной, но сгенерированные `.d.ts` содержали
  `import ... from '@letar/forms-core/...'` — пакета, которого в npm нет. Причина —
  `@letar/forms-core`/`@letar/forms-react` лежали в `dependencies`, из-за чего `tsup`
  помечал их внешними для dts-прохода ещё до того, как `dts.resolve` успевал сработать.
  Обнаружено не сборкой, а ручной проверкой `npm pack` → установка в чистый проект →
  `tsc --noEmit`. Фикс — оба пакета переехали в `devDependencies`.
- **2026-08-10, `PLAN.md` §44** — смежный, но не идентичный инцидент: тот же переход на
  `@letar/forms-react` сломал typecheck **внутри монорепо** (17 приложений-потребителей без
  полного набора `paths`) — про потребителей монорепо см.
  [lib-entry-points.md](/.claude/docs/lib-entry-points.md#подключение-к-приложению) и
  [libs.md](/.claude/rules/libs.md#подключение-к-приложению). §45 (этот документ) — про
  внешнего npm-потребителя, у которого нет ни `paths`, ни `@letar/source`-условия вообще;
  два разных механизма резолва, две разные проверки, легко перепутать один симптом с другим.

## Ссылки

- [libs/forms/tsup.config.ts](/libs/forms/tsup.config.ts) — комментарии прямо в конфиге
  объясняют `noExternal`/`dts.resolve` тем же текстом, что и здесь.
- [libs/forms/scripts/write-publish-package-json.mjs](/libs/forms/scripts/write-publish-package-json.mjs)
- [verification-pitfalls.md](/.claude/docs/verification-pitfalls.md) — общий принцип
  «проверять тем путём, которым ходит настоящий потребитель», из которого следует рецепт
  проверки выше.
- [lib-entry-points.md](/.claude/docs/lib-entry-points.md) — резолв `@letar/*` **внутри**
  монорепо (`paths`, `exports`, теги) — смежная, но отдельная механика от резолва npm-пакета
  внешним потребителем, описанного здесь.
