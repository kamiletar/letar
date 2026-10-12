---
id: LT-028
title: Черновик формы в `/admin/materials/new` восстанавливает не все поля
status: idea
size: S
area: forms
priority: 3
blocked_by: []
owner: ""
stage: ""
source: PLAN.md §0
created: 2026-10-12
updated: 2026-10-12
---

## Что и зачем

После `--reload-after-fill --accept-restore` (`.claude/scripts/dev-session-console-check.mjs`) черновик вернул поля 2 и 3, а первое видимое текстовое поле осталось пустым. Относится к библиотеке форм; приложение-источник — публичный клиент.

## Приёмка

- [ ] Воспроизведено
- [ ] Причина найдена в `@letar/forms`
- [ ] Исправлено с тестом

## План

## Журнал

## Итог
