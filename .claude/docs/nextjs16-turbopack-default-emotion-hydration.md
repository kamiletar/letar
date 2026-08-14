# Next.js 16 Turbopack по умолчанию ломает гидратацию Chakra UI v3 (Emotion)

## Симптом

Playwright-тест кликает по ссылке/кнопке — `toHaveURL` таймаутится, страница остаётся на
прежнем адресе. Флуктуирует: в одном прогоне из нескольких может не воспроизвестись. В логе
dev-сервера в момент клика:

```
[browser] Uncaught Error: Hydration failed because the server rendered HTML didn't match the client.
As a result this tree will be regenerated on the client.
...
+   <script suppressHydrationWarning={true} nonce="" dangerouslySetInnerHTML={{__html:"((e, i, s,..."}}>
-   <style data-emotion="css-global ad1llf" data-s="">
    at ColorModeProvider (color-mode.tsx:18:5)
    at Provider (provider.tsx:17:7)
    at RootLayout (layout.tsx:50:15)
```

Найдено в `apps/mandala` (2026-08-04): `03-admin-products.admin.spec.ts` тесты `:71` и `:90`
падали именно так — клик срабатывал в момент, когда React discard-нул и заново смонтировал всё
поддерево `<body>` из-за ошибки гидратации, и обработчик клика на уже удалённом DOM-узле не
успевал сработать.

## Причина

Две независимые вещи сошлись вместе:

1. **`@chakra-ui/react`'s `ChakraProvider` рендерит `<Global>` (emotion) для базовых стилей.**
   Emotion's `Global`-компонент на SSR (не-browser рендер) буквально возвращает React-элемент
   `<style data-emotion="...">` в дереве, а на клиенте — `null` (стили вставляются through
   `useInsertionEffect` напрямую в DOM, минуя реконсиляцию). Это разночтение SSR/CSR — часть
   архитектуры Emotion, обычно неощутимо, ПОКА бандлер не порождает лишний реальный mismatch
   рядом с интерактивным поддеревом.
2. **Next.js 16 сделал Turbopack бандлером по умолчанию для `next dev`/`next build`, когда флаг
   не передан явно** (`next/dist/lib/bundler.js`: `bundlerFlags.size === 0` → `return Bundler.Turbopack`).
   Под Turbopack именно эта комбинация (`Global` + `next-themes`'ный `<script>`, оба —
   первые дети `ChakraProvider`/`ColorModeProvider`) триггерит настоящий hydration mismatch,
   из-за которого React отбрасывает и заново монтирует **всё поддерево `<body>`** (см. цитату
   выше — "this tree will be regenerated on the client"). Под webpack та же комбинация не
   мисматчится.

Официально задокументировано самим Chakra UI: <https://chakra-ui.com/docs/get-started/frameworks/next-app>
§ «Hydration errors» — «This is caused by how Next.js hydrates Emotion CSS when running with
Turbopack. Please add the `--webpack` flag to your `dev` and `build` scripts».

## Как проверить, что приложение затронуто

Приложение уязвимо, если одновременно верно:

- Использует `@chakra-ui/react`'s `ChakraProvider` (Chakra v3) — т.е. в дереве есть `<Global>`.
- Использует `next-themes`'s `ThemeProvider`/`ColorModeProvider` как **прямого потомка**
  `ChakraProvider` (стандартный паттерн этого репо, см. `.claude/docs/ui-components.md`
  § «Предотвращение FOUC»).
- `dev`/`build` target в `project.json` вызывает голый `next dev`/`next build` **без** явного
  `--webpack` или `--turbopack` флага — то есть бандлер выбирается дефолтом Next.js (Turbopack).

⚠️ **`.env`/комментарий в `project.json`, утверждающий «без Turbopack», — не доказательство.**
В `apps/mandala/project.json` уже была метка `"description": "Start development server (без
Turbopack из-за бага с Emotion)"`, но команда была `"next dev"` без флага — комментарий фиксировал
намерение, которое никогда не было реализовано как флаг. Проверяй сам флаг в `command`, а не
описание рядом с ним.

## Фикс

В `project.json` приложения — добавить `--webpack` к обеим командам:

```diff
     "build": {
       "options": {
-        "command": "next build",
+        "command": "next build --webpack",
       }
     },
     "dev": {
       "options": {
-        "command": "next dev",
+        "command": "next dev --webpack",
       }
     },
```

Эталон — `apps/mandala/project.json`.

**Не решать через `next.config.js`** — выбор бандлера читается из CLI-флага/env до чтения
конфига (см. `parseBundlerArgs` в `next/dist/lib/bundler.js`), конфиг-файл на это не влияет.

**Не путать с безвредным консольным предупреждением** «Encountered a script tag while rendering
React component» — оно остаётся и под webpack (это отдельный, задокументированный в
`ui-components.md` артефакт того, как `next-themes` рендерит свой блокирующий скрипт), но НЕ
сопровождается «Hydration failed... tree will be regenerated» и не ломает клики.

## Частичный override для инферируемых `dev`/`build` (Nx-плагин `@nx/next`)

У части приложений (`dashboard`, `animatrona-tracker`'s `dev`, `driving-school`) таргеты
`dev`/`build` в `project.json` не объявлены явно — их генерирует `createNodesV2` плагина
`@nx/next` (см. `node_modules/@nx/next/dist/src/plugins/plugin.js`), который жёстко зашивает
команду `next dev`/`next build` без опции добавить CLI-флаги. Плагин этого не поддерживает
(нет `devArgs`/`buildArgs` в опциях), поэтому единственный путь — override в `project.json`.

**Не обязательно дублировать весь таргет** (как сделано в `mandala` — полный явный executor
с `cache`/`inputs`/`outputs`, скопированными вручную). Nx мержит одноимённый таргет из
`project.json` с инферированным **по ключам**: если в `project.json` указать только
`options.command`, остальные поля (`cache`, `inputs`, `outputs`, `dependsOn`) остаются от
плагина без изменений — то есть кэширование `build`-таргета не ломается. Проверяется через
`nx show project <app> --json` до/после правки — сравнить `targets.build`/`targets.dev`.

```jsonc
// project.json — минимальный override, без дублирования cache/inputs/outputs
"build": {
  "options": { "command": "next build --webpack" }
},
"dev": {
  "options": { "command": "next dev --webpack" }
}
```

Этот паттерн применён в `dashboard`/`driving-school` (2026-08-04). Для `mandala` его задним
числом не применяли — оба варианта рабочие, полное дублирование просто избыточно многословнее.

## Аудит по всему монорепо (2026-08-04)

Проверены приложения, сочетающие `ChakraProvider` (Chakra v3) и `next-themes`'ный
`ColorModeProvider` как прямой потомок — той же связке, что вызвала баг в `mandala`:

| Приложение           | Было (dev/build)                   | Бандлер до фикса | Статус                                               |
| -------------------- | ---------------------------------- | ---------------- | ---------------------------------------------------- |
| `mandala`            | явные, `next dev`/`next build`     | Turbopack        | ✅ исправлено ранее (эталон)                         |
| `animatrona-tracker` | `build` явный, `dev` инферился     | Turbopack        | ✅ исправлено — `--webpack` в обоих                  |
| `dashboard`          | оба инферились (частичный `build`) | Turbopack        | ✅ исправлено — частичный override `options.command` |
| `driving-school`     | оба инферились (submodule)         | Turbopack        | ✅ исправлено — частичный override, коммит `4d0ccaf` |

Для всех трёх подтверждён Turbopack в логе dev-сервера до фикса
(`▲ Next.js 16.3.0 (Turbopack)`) и webpack после (`▲ Next.js 16.3.0 (webpack)`), а также
чистый рендер страницы без ошибок консоли на webpack. Точную click-race репродукцию (как в
mandala — клик сразу после навигации) через Browser pane повторить не удалось: инструмент
предпросмотра в этой сессии периодически терял скомпонованный кадр («Screenshot timed out»,
«ref map not initialized», «navigation denied or failed») из-за скрытой панели браузера —
известная false-negative ловушка (`reference_browser_pane_hidden_raf` в памяти), не связанная
с самим приложением. Фикс применён превентивно на основании структурного совпадения
(Turbopack + `ChakraProvider` + `ColorModeProvider`-потомок) и официального предупреждения
Chakra UI, без дожидания живой репродукции гонки.

Побочная находка при аудите `animatrona-tracker` (не хydration, отдельный баг, уже исправлен
пользователем в параллельной сессии 2026-08-04): `<CookieBanner>` рендерился в `layout.tsx`
вне дерева `<Provider>`(ChakraProvider) — падал `Runtime ContextError` на первом визите без
сохранённого cookie-согласия (баннер скрыт до первого рендера, поэтому не ловилось в
e2e/ручной проверке с уже принятым согласием). См. `apps/animatrona-tracker/PLAN_COMPLETED.md`.

Не проверялись целенаправленно приложения-лендинги (`letar-landing`, `kami-key-the-landing`,
`animatrona-landing`) и Electron-рендерер `animatrona` — у них другой профиль риска (лендинги
почти без интерактивности сразу после навигации; Electron-рендерер собирается отдельно от
`next dev`/`next build` через `bun x next dev`, не через Nx-инферированные таргеты) — чинить
по факту обнаружения, если всплывёт.

## Второй, отдельный источник того же симптома: разный порядок CSS-свойств в Emotion-классе (2026-08-12)

⚠️ **Это НЕ тот же баг, что выше**, хотя симптом в консоли выглядит одинаково («A tree hydrated
but some attributes... didn't match»). Обнаружено при диагностике мисматча на детальных
страницах админки одного из приложений (объекты с несколькими style-пропсами в тексте).

### Как отличить от Turbopack+Global-бага

- **Причина выше** — мисматч на самом первом ребёнке `ColorModeProvider`/`Provider`, разница
  `<style data-emotion>` (SSR) vs `<script>` (CSR) — архитектурная разница тегов.
- **Этот баг** — мисматч на обычном `<p className="css-XXXXXX">` (`chakra(p)`/`Text`) в любом
  месте дерева, `className` меняется, но визуальный тег и структура те же. Проявляется **и под
  Turbopack, и под `--webpack`** одинаково — флаг `--webpack` из фикса выше здесь не помогает
  (проверено: применили и откатили, симптом идентичен под обоими бандлерами).

### Симптом

```
+   className="css-ap60qa"
-   className="css-1rb706t"
```

Воспроизводится системно на разных, никак не связанных страницах одного приложения (не только
там, где есть ленивая подгрузка/асинхронные данные) — на любом `chakra(p)`/`Text` с несколькими
style-пропсами.

### Причина (подтверждено JS-инспекцией правил в браузере)

```js
// css-ap60qa (клиент): font-size: var(--chakra-font-sizes-sm); color: var(--chakra-colors-fg-muted);
// css-1rb706t (сервер): color: var(--chakra-colors-fg-muted); font-size: var(--chakra-font-sizes-sm);
```

CSS-декларации **идентичны по содержанию и визуальному эффекту** — отличается только порядок
объявлений (`font-size, color` vs `color, font-size`). Emotion хеширует сериализованную строку
стилей, а не итоговый результат: разный порядок ключей в объекте стилей, который Chakra v3
собирает из пропсов `fontSize`/`color`, даёт разный `css-XXXXXX` хэш при нулевой визуальной
разнице. То есть сам рантайм Chakra UI v3 в этом окружении (`next dev`, React 19) по-разному
упорядочивает объект стилей на SSR- и CSR-проходе для одного и того же компонента.

Проверено и исключено как причина:

- Провайдеры (`RootChakraProvider`/`ColorModeProvider` из `@letar/chakra-provider`) — стандартные,
  без кастомного `@emotion/cache`/`CacheProvider`.
- `forcedTheme="light" enableSystem={false}` в `ColorModeProvider` — `html` рендерится с
  `class="light"` одинаково на SSR и после гидратации, не источник разницы.
- Тема приложения — обычный `createSystem(defaultConfig, ...)`, ничего специфичного в
  `semanticTokens`/`globalCss`.
- Ленивая подгрузка select'ов через `createLazyComponent` (`libs/forms`, `React.lazy`+`Suspense`)
  — гипотеза **отвергнута живым тестом**: мисматч воспроизводится на элементах, вообще не
  связанных с формой/ленивой загрузкой (хлебная крошка «admin», статичные подписи карточек).

### Статус: не воспроизводится на prod-сборке — дев-режимный шум (проверено 2026-08-12)

**Проверено:** production-сборка (`next build` → `next start`, не `next dev`) через вход в
админку по dev-session bypass (`ALLOW_DEV_SESSION`/`DEV_SESSION_TOKEN` из `.env.local`, см.
`.claude/rules/env-files.md`). Открыты через Browser pane с полной (не client-side) навигацией
`force: true`, по несколько раз подряд, с чисткой консоли между заходами, на нескольких
детальных страницах админки с `chakra(p)`/`Text` на разных секциях (хлебная крошка, подписи,
комбинации `fontSize`+`color` в полях формы — ранее ловившие мисматч).

**Результат: ни одной ошибки/предупреждения гидратации ни на одной странице, ни в одном из
заходов.** Консоль браузера подтверждённо рабочая (тестовый `console.error('TEST_PROBE...')`
ловится штатно) — то есть отсутствие сообщений это не артефакт нерабочего слушателя, а реальное
отсутствие мисматча.

**Вывод: это дев-режимный шум, не системная проблема Chakra UI v3/Emotion/React 19.**
Подтверждает гипотезу из предыдущей версии этого раздела: инкрементальная пересборка модулей
(Turbopack **и** webpack — баг проявлялся под обоими) даёт нестабильный порядок сериализации
пропсов (`fontSize`/`color` → объект стилей → строка → `css-XXXXXX` хэш) между серверной и
клиентской компиляцией конкретно в dev-режиме (HMR/на лету перекомпилируемые модули). В
production-бандле сервер и клиент собираются из одного детерминированного билда — порядок ключей
стабилен, хэши совпадают.

Сравнение с другими приложениями и поиск апстрим-issue не проводились — раз баг не
воспроизводится на проде того же приложения, где он был найден, оснований считать его системной
проблемой экосистемы Chakra/Emotion больше нет; последующее сравнение с другими приложениями
было бы поиском несуществующей проблемы.

**Практический вывод:** мисматч из этого раздела не требует фикса в коде и не блокирует прод —
только шумит в консоли `next dev` на затронутых детальных страницах. Workaround (единый
`css={{...}}` вместо нескольких style-пропсов, `suppressHydrationWarning`) можно не применять;
если шум в dev-консоли мешает разработке, самое дешёвое — просто игнорировать это конкретное
предупреждение, зная его причину.
