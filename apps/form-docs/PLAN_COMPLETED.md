# Выполненные задачи — form-docs

## Сессия 2026-08-11 — `sitemap.ts` через Fumadocs source API

Закрывает пункт PLAN-INFRA.md §33 «SEO-фундамент»: единственная из 10 приложений без
`robots.ts`/`sitemap.ts`, где недостача была отмечена «требует отдельного исследования» —
страницы документации приходят из Fumadocs `source` (MDX через `loader()`), а не из статического
списка путей, как в остальных приложениях монорепо (`form-example`, `time` и др.).

- `source.getLanguages()` (типы — `fumadocs-core/dist/source`, `LoaderOutput.getLanguages()`)
  отдаёт `{language, pages}[]`, каждая `page` несёт `slugs: string[]` и `url: string`. Построена
  карта slug → url по обоим языкам (`en`/`ru` из `defineI18n` в `src/lib/i18n.ts`), из неё —
  `alternates.languages` для каждой docs-страницы, чтобы EN/RU не конкурировали как дубли.
- Главная страница (`[lang]/(home)/page.tsx`) добавлена на обоих языках тем же способом.
- 35 демо-страниц `/demo/*` (client-only, без `[lang]`) — статичный список, как в `form-example`
  для `/examples/*`: `fs.readdirSync` в build-time сравнивали и отклонили — риск молча разъехаться
  с реальным роутингом того не стоит при 35 стабильных путях.
- Проверено живым `nx dev form-docs` + `/sitemap.xml`: 93 записи (2 home + 56 docs + 35 demo),
  `xhtml:link rel="alternate"` присутствует. `typecheck:tsgo`/`lint` зелёные.
- Заодно поправлен устаревший счётчик демо-страниц в `PLAN.md` (33 → 35 — код обогнал доку).

## Сессия 2026-08-06 — `nx.implicitDependencies` в package.json

По правилу [libs.md](/.claude/rules/libs.md) («Подключение к приложению»): каждая `@letar/*`-
зависимость приложения обязана быть перечислена в `nx.implicitDependencies` его `package.json` —
без этого ребро в графе Nx не строится (`nx affected`, порядок сборки, инвалидация кэша для этой
зависимости не работают, даже если импорт компилируется через `paths` в `tsconfig.json`).
`form-docs` имел `package.json`, но без поля `nx` вообще.

- Добавлено `"nx": { "name": "form-docs", "implicitDependencies": ["@letar/forms",
  "@letar/chakra-provider", "@letar/analytics", "@letar/seo"] }` — сверено с `paths` в
  `tsconfig.json` (подпуть `@letar/forms/analytics` — та же библиотека `@letar/forms`, отдельной
  записи не требует).
- `nx show project form-docs`, `nx typecheck:tsgo form-docs`, `nx lint form-docs` — зелёные, имя
  проекта не разъехалось.

## v0.1.0 (2026-04-04)

### Реализовано

- Fumadocs MDX документационный сайт
- 34 guide-страницы (EN), 7 (RU)
- 15 interactive demo-страниц
- Мультиязычная навигация (meta.json / meta.ru.json)
- Деплой на s2 (forms.letar.best)

### DX фичи (Фаза 6)

- guides/analytics.mdx — Form Analytics
- guides/server-errors.mdx + .ru.mdx — Server Error Mapping
- guides/undo-redo.mdx — Undo/Redo

### Фикс typecheck:tsgo (2026-08-04)

Приложение не проходило `nx typecheck:tsgo` (техдолг из корневого `PLAN.md` §29).

- `demo/url-prefill`: `onSubmit` в `@letar/forms` отдаёт значения формы напрямую, а не `{ value }`.
- `providers.tsx`: пропс `i18n` типизирован через `RootProviderProps['i18n']` вместо
  дженерик-типа `I18nUIConfig` (он требовал параметр типа и не совпадал с тем, что реально
  приходит из `i18nUI.provider(lang)`).

### Фикс nx lint (2026-08-05)

Приложение не проходило `nx lint` (27 проблем, 24 ошибки).

- `eslint.config.mjs`: `ignores` для генерируемых Fumadocs-файлов (`.source/**`) должен быть
  путём **от корня workspace** (`apps/form-docs/.source/**`), а не относительным — исполнитель
  `@nx/eslint:lint` переключает `cwd` на workspace root перед запуском ESLint, и короткий
  `.source/**` в этом контексте не совпадает ни с чем. См.
  [`.claude/docs/lib-entry-points.md`](/.claude/docs/lib-entry-points.md) — та же природа
  ловушки ESLint 10 с резолвом путей, только зеркально (там — паттерн из общего конфига не
  срабатывает в приватном, здесь — паттерн из приватного не срабатывает при смене cwd).
- Пустые демо-обработчики `onSubmit={async () => {}}` заменены на реальный вывод отправленных
  данных через новый `demo/_components/SubmittedDataPreview` вместо отключения правила
  `@typescript-eslint/no-empty-function`.
- `curly` в `src/app/[lang]/docs/[[...slug]]/page.tsx`.

### Фикс `references` на библиотеки в `tsconfig.json` (2026-08-07)

`apps/form-docs/tsconfig.json` ссылался на 3 библиотеки (`analytics`, `forms`, `seo`) через
`references` — тот же редирект-баг, что в `dashboard-agent` (0.11.1), см.
`.claude/rules/libs.md`.

- Убран блок `references`.
- Приложение расширяет `tsconfig.base.json` напрямую (не `tsconfig.next-app.json`, как большинство
  Next.js-приложений), поэтому наследует библиотечный режим `composite: true` +
  `emitDeclarationOnly: true`. После удаления `references` это дало `TS6307: File is not listed
  within the file list` — composite-режим строго требует явного включения файлов, а `include`
  приложения не покрывает `libs/*`. Добавлены явные оверрайды в `compilerOptions`: `"composite":
  false`, `"declaration": false`, `"declarationMap": false`, `"emitDeclarationOnly": false`,
  `"noEmit": true` — те же значения, что задаёт `tsconfig.next-app.json` для остальных приложений.
- `nx typecheck:tsgo form-docs --skip-nx-cache` — чисто.
- `nx build form-docs --skip-nx-cache` — успешно.

---

**Последнее обновление:** 2026-08-07
