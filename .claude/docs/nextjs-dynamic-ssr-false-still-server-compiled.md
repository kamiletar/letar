# `next/dynamic(..., { ssr: false })` не спасает от server-компиляции модуля

## Проблема

Общее убеждение: `dynamic(() => import('./X'), { ssr: false })` полностью исключает модуль `X`
из серверной компиляции — раз он не рендерится на сервере, Next.js его туда не потащит.

Это неверно для App Router. `'use client'`-компонент, обёрнутый в `dynamic(ssr:false)`, всё равно
должен получить **client reference** для RSC-протокола — а чтобы его построить, серверный
webpack-компилятор обязан хотя бы разрешить (resolve) граф импортов модуля, не исполняя его.
Разрешение идёт с условием экспорта `"node"`/`"require"` пакетов, а не `"browser"`.

Если транзитивная зависимость модуля публикует разные точки входа под условия `"node"` и
`"browser"` в `package.json` `exports`, и её `"node"`-точка **не является** урезанным, но
самодостаточным SSR-safe сабсетом (что-то реально не экспортирует, а не просто throw/no-op) —
сборка падает на этапе резолва импорта, даже если рантайм до этого кода никогда не дойдёт:

```
Attempted import error: 'use' is not exported from 'solid-js/web' (imported as 'use').

Import trace for requested module:
.../@tanstack/devtools-ui/dist/esm/components/theme.js
.../@tanstack/devtools/dist/server.js         ← "node"-condition сборка пакета
.../@tanstack/react-devtools/dist/esm/index.js
libs/query-provider/src/lib/devtools-panel.tsx
libs/query-provider/src/lib/persist-provider.tsx  ← dynamic(..., { ssr: false }) — не спасло
```

## Диагностика

1. Найти пакет и файл из трейса, проверить его `package.json` → `exports` → сравнить, куда
   ведут условия `"node"` и `"browser"`/`"import"` для той же точки входа.
2. Проверить фактические экспорты обоих файлов (`grep -n "^export" <файл>`) — если под `"node"`
   не хватает символа, который есть под `"browser"`, это баг/недосмотр апстрима, а не что-то
   починимое версией потребителя.
3. `solid-js` в частности — `solid-js/web` имеет `"node"`-условие, ведущее на
   `web/dist/server.js` (SSR-рендер в строку), которое **не** переэкспортирует DOM-специфичные
   функции даже заглушками (`notSup`) — в отличие от большинства остальных, которые есть, но
   бросают на вызове. Конкретно `use` отсутствует полностью в этом файле.

## Прецедент

`libs/query-provider` (2026-08-26, `studio`): `@tanstack/react-devtools@0.10.12` →
`@tanstack/devtools@0.14.2` → `@tanstack/devtools-ui@0.7.1`, чей `theme.js` импортирует
`use`/`insert`/`template` из `solid-js/web` — падало именно на server-компиляции, несмотря на то
что `devtools-panel.tsx` подключён через `next/dynamic(ssr:false)` и в `persist-provider.tsx`, и
в `query-provider.tsx` (оба файла в этой же библиотеке, история задокументирована прямо в
комментариях кода). Диапазон `solid-js` (`>=1.9.7`) был удовлетворён установленной `1.9.12` —
поднимать `solid-js` не требовалось и не помогло бы (баг живёт в `devtools-ui@0.7.1` независимо
от версии `solid-js`, на 2026-08-26 это последняя опубликованная версия `devtools-ui`).

**Фикс — не структурный, а версийный:** зафиксировать `@tanstack/react-devtools` на `0.10.5` в
корневом `package.json` (см. [root-only-dependency-versions] в CLAUDE.md) — эта версия тянет
`@tanstack/devtools@0.12.2` → `@tanstack/devtools-ui@0.5.2`, чей `theme.js` использует только
`createComponent` (без `use`). Побочный эффект: пропало и предупреждение `bun install` про
`incorrect peer dependency @tanstack/react-devtools@>=1.0.0` (у `@tanstack/react-devtools` пока
нет опубликованной `1.x`, `libs/query-provider/package.json` объявлял завышенный peer-диапазон
на будущее) и исчезла вторая копия `@tanstack/devtools-ui` в изолированном `.bun`-кеше — обе
`react-devtools`/`react-form-devtools` теперь сходятся на одной версии `0.5.2`.

## Когда перепроверять

Если апстрим `@tanstack/devtools`/`devtools-ui` в будущем поправит `"node"`-экспорт (либо
полноценно исключит недостающие символы через `notSup`-заглушки, либо перестанет их
импортировать в файле, попадающем в server-граф) — пин можно снять и вернуться на `^0.x` диапазон.
Проверка: `nx run studio:build --skip-nx-cache` (или любое другое приложение с
`@letar/query-provider` и включённым `showDevtools`) должен пройти без `Attempted import error`.

## ⚠️ Рецидив 2026-09-03: версийный фикс не пережил обычного `deps update`

Пин выше держался ровно неделю. `9a65abe7 deps update` (2026-09-02) поднял
`@tanstack/react-devtools` `0.10.5` → `0.10.12` в корневом `package.json` — и всё вернулось
буква в букву: `devtools@0.14.2` → `devtools-ui@0.7.1` → тот же `theme.js`, та же строка
`Attempted import error: 'use' is not exported from 'solid-js/web'`, та же цепочка через
`libs/query-provider`.

Это ровно тот класс, что описан в [root-pin-peer-drift](/.claude/docs/root-pin-peer-drift.md):
точный пин в корневом `package.json` — тихая мина. Ничто не связывает строку `"0.10.5"` с
причиной, по которой она там стоит: ни `bun install`, ни `nx lint`, ни `typecheck:tsgo`, ни
`nx test` пин не проверяют, а `deps update` его снимает как любую другую отставшую версию.
Комментарий в `package.json` невозможен (JSON), а комментарии в коде библиотеки объясняли
`dynamic(ssr:false)`, а не пин.

### Ложный след при диагностике

Форма ошибки («`use` не экспортируется», пакет ждёт `solid-js@^1.9.9`) выглядит как рассинхрон
версий solid-js — и это **неверная** гипотеза, на которую легко потратить сессию:

- установлена ровно одна копия, `solid-js@1.9.12`, диапазон `^1.9.9` удовлетворён;
- `use` **есть** в `web/dist/web.js` (условие `browser`) и в `web/dist/dev.js`
  (условие `development`), и его **нет** в `web/dist/server.js` (условия `node`/`worker`/`deno`).

То есть недостающего экспорта нет ни в какой версии solid-js — это не дефект версии, а
осмысленное отсутствие DOM-директивы в SSR-сборке. Поднимать/понижать `solid-js` бессмысленно.
Проверяется за один вызов, до любых сборок:

```bash
grep -c 'use,' node_modules/.bun/solid-js@*/node_modules/solid-js/web/dist/server.js  # 0
grep -c 'use,' node_modules/.bun/solid-js@*/node_modules/solid-js/web/dist/web.js     # 1
```

### Структурный фикс (заменил пин)

`libs/query-provider/src/lib/devtools-panel-lazy.tsx` — единственная точка, где панель
подключается; все три провайдера (`query-provider`, `persist-provider`, `zenstack-provider`)
импортируют её оттуда:

```tsx
export const DevtoolsPanel = process.env.NODE_ENV === 'production'
  ? NoDevtools
  : dynamic(() => import('./devtools-panel').then((m) => m.DevtoolsPanel), { ssr: false })
```

Работает потому, что Next подставляет `process.env.NODE_ENV` литералом **до** обхода графа
зависимостей: сравнение сворачивается в константу, ветка с `import()` становится недостижимой, и
бандлер не резолвит её поддерево вовсе — вместо того чтобы зарезолвить и упасть. Условие обязано
остаться **на верхнем уровне модуля**: внутри компонента (`devtoolsEnabled && <DevtoolsPanel />`)
это уже рантайм-проверка, она модуль из графа не убирает — именно так выглядел код до фикса.

Цена — `showDevtools: true` больше не включает панель в production (в сборке её нет). Ни одно
приложение этот проп не передаёт, поведение по умолчанию не менялось; JSDoc всех трёх провайдеров
и README библиотеки исправлены, чтобы не обещать невозможного.

Пин `@tanstack/react-devtools` после этого не нужен: даже если апстрим снова принесёт
DOM-специфичный импорт в server-граф, ветки с devtools в production-сборке просто нет.

### Как проверять

Только прод-сборкой — `nx build <app>`. Ни `nx dev`, ни `lint`, ни `typecheck:tsgo`, ни `nx test`
этот класс не видят: в dev живёт ровно та ветка, что работала всегда. Позитивный контроль, что
поддерево действительно выброшено, а не просто не рендерится:

```bash
grep -rl "solid-js\|devtools-ui" apps/<app>/.next/server --include=*.js   # должно быть пусто
```

Проверено 2026-09-03 на `studio` и `dashboard` (оба на `next build --webpack`): сборка зелёная,
`solid-js`/`devtools-ui` в серверном бандле отсутствуют полностью.
