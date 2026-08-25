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

| Приложение             | Было (dev/build)                                  | Бандлер до фикса | Статус                                                        |
| ---------------------- | ------------------------------------------------- | ---------------- | ------------------------------------------------------------- |
| `mandala`              | явные, `next dev`/`next build`                    | Turbopack        | ✅ исправлено ранее (эталон)                                  |
| `animatrona-tracker`   | `build` явный, `dev` инферился                    | Turbopack        | ✅ исправлено — `--webpack` в обоих                           |
| `dashboard`            | оба инферились (частичный `build`)                | Turbopack        | ✅ исправлено — частичный override `options.command`          |
| `driving-school`       | оба инферились (submodule)                        | Turbopack        | ✅ исправлено — частичный override, коммит `4d0ccaf`          |
| `auth-hub`             | оба инферились (`project.json` без `build`/`dev`) | Turbopack        | ✅ исправлено 2026-08-25 — частичный override, см. ниже       |
| `aira-web`             | оба инферились (`project.json` без `build`/`dev`) | Turbopack        | ✅ исправлено 2026-08-25 — частичный override, см. ниже       |
| `letar-landing`        | явные, `next dev -p 3015`/`next build`            | Turbopack        | ✅ исправлено 2026-08-25 — `--webpack` добавлен в обе команды |
| `kami-key-the-landing` | явные, `next dev -p 3011`/`next build`            | Turbopack        | ✅ исправлено 2026-08-25 — `--webpack` добавлен в обе команды |
| `animatrona-landing`   | явные, `next dev -p 3008`/`next build`            | Turbopack        | ✅ исправлено 2026-08-25 — `--webpack` добавлен в обе команды |

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

Ранее (до 2026-08-25) в этом разделе значилось, что лендинги (`letar-landing`,
`kami-key-the-landing`, `animatrona-landing`) и Electron-рендерер `animatrona` не проверялись
целенаправленно — «другой профиль риска». Проверка проведена, результаты — в таблице выше и в
разделе «Electron-рендерер `animatrona`» ниже.

## Найдено на `auth-hub` (2026-08-25): реальный отказ интерактивности, не только консольный шум

В отличие от разделов ниже («дев-режимный шум, прод чист») — на `auth-hub` (`project.json` без
`build`/`dev` вообще, т.е. голый инференс `@nx/next` → Turbopack и в `build`, и в `dev`) баг
воспроизведён **в production** (`auth.letar.best/sign-in`) на живом трафике и на прямой
Browser-pane репродукции: `args[]=HTML` в консоли, и синхронно с этим — клик по кнопке
«Отправить ссылку для входа» (`MagicLinkForm`) не порождал вообще никакого сетевого запроса
(ни Server Action, ни ошибки) и не менял состояние формы. То есть при этом классе мисматча React
не восстанавливает интерактивность корня после сбоя гидратации — обработчики событий на
исходном SSR-дереве отсутствуют, а клиентский ремонт («this tree will be regenerated on the
client» из текста ошибки) на практике не происходит без явной Error Boundary. Кнопка выглядит
рабочей визуально, но полностью мертва до перезагрузки страницы.

GlitchTip подтверждает: тот же `args[]=HTML` на `auth.letar.best` бил и по `/oauth/consent`
(не только `/sign-in`) у реального пользователя на обычном Chrome, не только у автоматизации.

Фикс — тот же `--webpack` override, добавленный в `apps/auth-hub/project.json` (не было вообще
никакого override, только пример из «Частичный override» ниже).

⚠️ **Открытый вопрос: `--webpack` в проде не гарантированно устраняет `args[]=HTML` целиком.**
`mandala` и `studio` уже несут `next build --webpack` (проверено по `git log -S"--webpack"` —
применено 2026-07-30/раньше) и при этом продолжают получать единичные события `args[]=HTML` в
GlitchTip и после фикса (`mandala` issue `AUTH-HUB`-аналог `MANDALA-B`, 13 событий
2026-08-24..25; `studio` issue `STUDIO-9`, 19 событий 2026-08-19..20) — то есть либо это другой,
пока не выделенный источник того же сигнатурного текста ошибки (браузерные
расширения/скан-боты, мутирующие `<html>` до гидратации — сам React называет это одной из
причин), либо остаточный редкий случай той же гонки, не до конца закрытый одним флагом бандлера.
Частота на `mandala`/`studio` заметно ниже, чем была на `auth-hub` до фикса — не поднимать это в
приоритет без нового подтверждённого падения интерактивности (как на `auth-hub`), просто иметь в
виду при следующей находке этого сигнатурного текста в GlitchTip.

## Найдено на `aira-web` (2026-08-25): `ContextError` при клиентской навигации locale-switcher

GlitchTip AIRA-WEB-1 (issue 604): `ContextError: useContext returned 'undefined'. Seems you forgot
to wrap component within <ChakraProvider />`, впервые 2026-08-18, ~9 событий/неделю. Breadcrumb —
soft-навигация `to: "/ru", from: "/ru"` (клик по переключателю языка, в т.ч. на уже активной
локали — `router.replace` из next-intl `navigation` всё равно триггерит клиентский переход).

Ни один прямой стектрейс с сорсмапами получен не был (прод-бандл минифицирован), диагноз поставлен
по структурному совпадению с уже закрытыми случаями: `project.json` не переопределял `build`/`dev`
→ голый инференс `@nx/next` → Turbopack; Chakra v3 `ChakraProvider` + `next-themes`
`ColorModeProvider` в дереве провайдеров (`apps/aira-web/src/app/_components/providers.tsx`).
Живая репродукция через Browser pane **до** фикса не запускалась (сразу применён фикс по
структурному совпадению, как и на `auth-hub`/остальных из таблицы) — **после** фикса многократные
клики по переключателю (включая повтор текущей локали и быстрое переключение en↔ru) ошибок не
дали, что косвенно подтверждает диагноз, но не является строгим доказательством причины (см.
предупреждение раздела «Найдено на `auth-hub`» — флаг `--webpack` не гарантированно устраняет
весь класс симптома целиком).

Фикс — тот же частичный override, добавлен в `apps/aira-web/project.json`. Регрессионный тест —
`apps/aira-web-e2e/src/locale-switcher.spec.ts`.

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

## Третье подтверждение: `svoichuzhie`, ошибка «поймана» на `Menu.Trigger` (2026-08-24)

При разборе флаки-теста `apps/svoichuzhie-e2e/src/07-blog.admin.spec.ts` (клики по соседним
ссылкам шапки иногда не приводили к навигации в dev-режиме) была выдвинута гипотеза о специфичном
баге в `libs/ui/src/lib/user-menu.tsx`: `Menu.Trigger asChild` якобы рендерит `<button
type="button">` на сервере и `<div data-scope="menu" data-part="trigger">` на клиенте —
несовместимость `@ark-ui/react`/`@zag-js/menu` с Chakra v3 `asChild` при SSR.

**Гипотеза не подтвердилась.** Разбор:

1. **Код `asChild` в `@ark-ui/react` (`components/factory.js`, `withAsChild`) детерминирован и
   не содержит SSR/CSR-ветвлений** — `cloneElement` на основе `props.asChild`/`props.children`,
   один и тот же путь исполнения на сервере и на клиенте. Такой баг структурно не может возникать
   на уровне библиотеки при неизменных props.
2. **Живое воспроизведение** (вход под `e2e-admin@svoichuzhie.test`, `/admin`, несколько чистых
   full-reload без HMR) — триггер `UserMenu` стабильно рендерится как `<div data-part="trigger">`
   и на сервере, и после гидратации; структурного мисматча `button`/`div` не поймано ни разу.
3. **Реальный, воспроизведённый мисматч** на этой же странице/сервере — тот же паттерн, что в
   разделе выше («Второй, отдельный источник»): `chakra(div)` (`AdminSidebar`, ссылка-логотип),
   className отличается только хешем (`css-14fyjnu` vs `css-1chbm4z`), тег и структура те же.
   Появился **сразу после** `[Fast Refresh] rebuilding` в логе — то есть при инкрементальной
   пересборке модулей dev-сервера, ровно тот же механизм и тот же вердикт «дев-режимный шум,
   не воспроизводится на prod-сборке».

**Вывод:** отчёт про «button на сервере vs div на клиенте у `Menu.Trigger`» — это, по всей
видимости, тот же самый класс шума (className/порядок сериализации при Fast Refresh), просто
случайно пойманный человеком на подсистеме `UserMenu` и неверно интерпретированный как структурная
несовместимость асChild. **Правка `libs/ui` не требуется** — компонент работает корректно,
затрагивает ~15 приложений-потребителей, трогать без подтверждённого дефекта не нужно.

`svoichuzhie` в реестр аудита раздела «Аудит по всему монорепо» **не добавлен**: там вредный
паттерн — mismatch `<script>`/`<style data-emotion>` в самом корне (`ColorModeProvider`
оборачивает `RootChakraProvider`, `next dev` без `--webpack` — оба условия у `svoichuzhie`
выполняются), но живой репродукции именно этого корневого мисматча получить не удалось за
разумное число попыток — как и в исходном аудите 2026-08-04, это не опровергает риск, просто не
поймано. Если всплывёт флаки именно с падением клика сразу после навигации (не общий шум в
консоли) — сначала проверить это, `--webpack` в `apps/svoichuzhie/project.json` пока не применён.

## Лендинги (`letar-landing`, `kami-key-the-landing`, `animatrona-landing`): паттерн подтверждён, фикс применён (2026-08-25)

Все три используют одну и ту же связку в `_components/ui/provider.tsx` — Chakra v3
`ChakraProvider` обёрнут в `next-themes`'ный `ThemeProvider` (`attribute="class"
defaultTheme="dark" forcedTheme="dark"`), т.е. то же структурное совпадение, что и во всех
записях таблицы выше. `dev`/`build` в `project.json` были явными (не инферились через
`@nx/next`), но без `--webpack` — голый `next dev -p <порт>`/`next build`, Turbopack по
умолчанию. `package.json` каждого приложения без блока `scripts` — переопределения бандлера на
этом уровне не было.

Живая репродукция гонки клика не проводилась — фикс превентивный, по структурному совпадению, тем
же способом, что и на `aira-web`/`auth-hub`/остальных из таблицы. `--webpack` добавлен к обеим
командам во всех трёх `project.json`. Проверено: `nx typecheck:tsgo`/`nx lint` зелёные,
`nx build` проходит и подтверждает бандлер webpack в выводе (`✓ Compiled successfully`, без
маркера `(Turbopack)`).

Ремарка про «лендинги почти без интерактивности» из более раннего диагноза не отменяет риск:
у всех трёх есть навигация между несколькими route (`/`, `/privacy`, а у `animatrona-landing`
ещё и `/docs/*` с саб-роутами) через обычные Next.js ссылки — именно клиентская soft-навигация
между такими маршрутами и есть триггер гонки в задокументированных случаях (`aira-web`,
`mandala`), не обязательно насыщенный интерактив на самой странице.

## Electron-рендерер `animatrona`: риск актуален и, возможно, выше среднего, но `--webpack` не применён — нужна отдельная работа

`apps/animatrona/renderer` — **не** `bun x next dev` в обход Nx, как предполагалось в более
раннем диагнозе: у приложения есть обычный `project.json` с явными `dev`/`build`
(`next dev -p 3007` / `next build`, без `--webpack`), таргеты гоняются через `nx dev/build
animatrona-renderer` как у любого другого приложения монорепо.

**Структурное совпадение подтверждено, риск, вероятно, выше, чем у лендингов:**
`src/components/ui/provider.tsx` — `ChakraProvider` с `ColorModeProvider` (обёртка над
`next-themes`'ным `ThemeProvider`, `src/components/ui/color-mode.tsx`) как прямым потомком.
В отличие от лендингов, это полноценное multi-route SPA (`library`, `watch`, `discover`,
`settings`, `party` и др. — 40+ файлов с `next/link`/`useRouter`/`router.push`, см.
`AppShell`/`Sidebar`), т.е. клиентская soft-навигация происходит постоянно в обычном
пользовательском потоке, а не изредка как на лендинге.

**Почему `--webpack` не применён в этой сессии — не пропуск, а осознанное решение.**
`next.config.js` приложения держит непустой блок `turbopack: {...}` с двумя вещами, у которых
нет автоматического webpack-эквивалента:

```js
turbopack: {
  root: standaloneRoot,
  resolveAlias: {
    'cross-fetch': './src/lib/fetch-shim.ts',
    'node-fetch': './src/lib/fetch-shim.ts',
    '@letar/animatrona-ui': '../../../libs/animatrona-ui/src/index.ts',
  },
},
```

`resolveAlias` — специфичный API Turbopack (см. комментарий в файле: «Заменяем
node-fetch/cross-fetch на встроенный fetch — это убирает цепочку ESM полифиллов»). Простое
добавление `--webpack` без переноса этой замены в эквивалентный `webpack()`-хук с высокой
вероятностью возвращает сломанную цепочку `node-fetch → fetch-blob` ESM-полифиллов, о которой
предупреждает сам комментарий в конфиге — то есть попытка воспроизвести фикс по аналогии с
лендингами рискует не превентивно устранить один баг, а внести новый, гарантированно
воспроизводимый (не гипотетическую гонку, а поломку сборки/рантайма). `output: 'standalone'`
(HTTP-сервер, не статический экспорт и не `file://`) дополнительно означает, что это не тот же
класс риска, что у остальных Electron-приложений монорепо (`label-printer-desktop`,
`poster-microtext-desktop`) — там `output: 'export'` и `file://`/`app://`, soft-навигации в
том же смысле нет вообще.

**Статус: риск открыт, фикс требует отдельной сессии** — написать `webpack()`-эквивалент для
`resolveAlias` (переопределение `cross-fetch`/`node-fetch` через `config.resolve.alias`,
`@letar/animatrona-ui` — аналогично) и полный `nx build`/`nx dev` прогон Electron-оболочки
(не только `next build`) перед тем как считать фикс безопасным. Не чинить наспех в рамках
аудита, где основная цель — landing-приложения.
