# Выполненные задачи — form-docs

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

---

**Последнее обновление:** 2026-08-05
