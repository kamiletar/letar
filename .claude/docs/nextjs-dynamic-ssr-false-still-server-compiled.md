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
