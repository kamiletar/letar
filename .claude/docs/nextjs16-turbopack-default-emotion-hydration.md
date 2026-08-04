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

## Что дальше

Любое приложение монорепо, сочетающее Chakra v3 + `next-themes` (`driving-school`, `dashboard`,
`animatrona-tracker` и т.д.), потенциально подвержено той же гонке, если его `dev`/`build`
не пришпилены к webpack явно — не проверялось целенаправленно за пределами `mandala`, чинить
по факту обнаружения там же, где всплывёт (например при флаки в другом `*-e2e`).
