---
id: FM-005
title: "onCreate у Select и Combobox: хвосты в shadcn и async-поиск"
status: ready
size: M
area: forms
priority: 4
blocked_by:
  - FM-004
owner: ""
stage: ""
source: libs/forms/PLAN.md Backlog 2026-09-24 «onCreate — паритет Vue и Angular»
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

Chakra и shadcn закрыты (forms 2.17.0). Для Vue и Angular Select `onCreate` вошёл в паритет FM-004. Остаётся в shadcn-скине: async-поиск и подпись текущего значения в Combobox. После реализации: цикл из шести групп и form-mcp (`docs/fields.md`: убрать строку «Скины Vue, Vue-shadcn и Angular пока без `onCreate`», то же в `select.mdx` и `select.ru.mdx` form-docs).

## Приёмка

- [ ] Async-поиск и подпись значения в shadcn Combobox
- [ ] Строки «пока без onCreate» убраны в `docs/fields.md` и form-docs
- [ ] Тесты, версия, CHANGELOG

## План

## Журнал

## Итог
