# Выполненные задачи — form-docs

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

---

**Последнее обновление:** 2026-08-04
